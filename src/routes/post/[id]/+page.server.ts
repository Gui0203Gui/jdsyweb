import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	castPollVote,
	checkAchievements,
	createNotification,
	createReport,
	getPollResult,
	getPostDetail,
	giftItemByType,
	hasPointsFor,
	incrementPostViews,
	isPostFavorited,
	listComments,
	notifyMentions,
	toggleFavorite,
	toggleLike
} from '#lib/server/queries';
import { comments, posts } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { awardPoints } from '#lib/server/points';
import { FLOWER_TYPES, FLOWERS, type FlowerType } from '#lib/flowers';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = await getPostDetail(locals.db, params.id);
	if (!detail) error(404, '帖子不存在或已被删除');

	// 浏览量 +1（忽略失败，不影响阅读）
	await incrementPostViews(locals.db, params.id);

	const [commentList, favorited, pollResult] = await Promise.all([
		listComments(locals.db, params.id),
		locals.user ? isPostFavorited(locals.db, locals.user.id, params.id) : Promise.resolve(false),
		getPollResult(locals.db, params.id, locals.user?.id ?? null)
	]);

	return {
		post: detail.post,
		author: detail.author,
		forum: detail.forum,
		comments: commentList,
		favorited,
		pollResult
	};
};

export const actions: Actions = {
	/** 回复帖子（+5 积分，并通知楼主；支持 @提及） */
	comment: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再回复' });

		const detail = await getPostDetail(locals.db, params.id);
		if (!detail) return fail(404, { error: '帖子不存在' });
		if (detail.post.isLocked) return fail(403, { error: '帖子已被管理员锁定，无法回复' });

		const form = await request.formData();
		const content = String(form.get('content') ?? '').trim();
		if (!content) return fail(400, { error: '回复内容不能为空' });
		if (content.length > 5000) return fail(400, { error: '回复内容过长（最多 5000 字）' });

		const inserted = await locals.db
			.insert(comments)
			.values({ postId: params.id, authorId: locals.user.id, content })
			.returning({ id: comments.id });

		// 评论 +5 积分
		const commentId = inserted[0]?.id;
		if (commentId) await awardPoints(locals.db, locals.user.id, 'comment', commentId);

		// @提及通知
		await notifyMentions(locals.db, content, locals.user.id, params.id);

		// 通知楼主（自己回复自己不通知）
		if (detail.post.authorId !== locals.user.id) {
			await createNotification(locals.db, {
				userId: detail.post.authorId,
				actorId: locals.user.id,
				type: 'reply',
				content: `回复了你的帖子「${detail.post.title}」`,
				refId: params.id
			});
		}

		// 成就检查：首条评论
		await checkAchievements(locals.db, locals.user.id);

		return { ok: true };
	},

	/** 投票（每帖每用户一票，可改票） */
	vote: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再投票' });

		const form = await request.formData();
		const option = Number(form.get('option') ?? -1);
		if (!Number.isInteger(option) || option < 0) return fail(400, { error: '选项无效' });

		const result = await castPollVote(locals.db, params.id, locals.user.id, option);
		if (!result.ok) return fail(400, { error: result.error });
		return { ok: true, choice: result.choice };
	},

	/** 点赞 / 取消点赞（点赞 +2 积分，并通知被赞者） */
	like: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再点赞' });

		const form = await request.formData();
		const targetType = String(form.get('targetType') ?? '');
		if (targetType !== 'post' && targetType !== 'comment')
			return fail(400, { error: '无效的点赞目标' });

		const targetId = String(form.get('targetId') ?? '');
		if (!targetId) return fail(400, { error: '缺少点赞目标' });

		const liked = await toggleLike(locals.db, locals.user.id, targetType, targetId);
		// 点赞成功才加分；同一用户对同一目标的点赞只计一次积分（取消再点赞不再加分，防止刷分）
		if (liked) {
			const already = await hasPointsFor(locals.db, locals.user.id, 'like', targetId);
			if (!already) {
				await awardPoints(locals.db, locals.user.id, 'like', targetId);
			}

			// 通知被点赞者（自己赞自己不通知）
			let ownerId: string | null = null;
			let title = '';
			if (targetType === 'post') {
				const detail = await getPostDetail(locals.db, targetId);
				if (detail) {
					ownerId = detail.post.authorId;
					title = `帖子「${detail.post.title}」`;
				}
			} else {
				const row = await locals.db
					.select({ authorId: comments.authorId, post: posts })
					.from(comments)
					.innerJoin(posts, eq(comments.postId, posts.id))
					.where(eq(comments.id, targetId))
					.get();
				if (row) {
					ownerId = row.authorId;
					title = `帖子「${row.post.title}」下的评论`;
				}
			}
			if (ownerId && ownerId !== locals.user.id) {
				await createNotification(locals.db, {
					userId: ownerId,
					actorId: locals.user.id,
					type: 'like',
					content: `赞了你的${title}`,
					refId: targetId
				});
				// 成就检查：被赞者收到赞
				await checkAchievements(locals.db, ownerId);
			}
		}
		return { liked };
	},

	/** 收藏 / 取消收藏（收藏 +3 积分，并通知楼主） */
	favorite: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再收藏' });

		const form = await request.formData();
		const postId = String(form.get('postId') ?? '');
		if (!postId) return fail(400, { error: '缺少帖子' });

		const favorited = await toggleFavorite(locals.db, locals.user.id, postId);
		// 收藏成功才加分；同一用户对同一帖子的收藏只计一次积分（取消再收藏不再加分，防止刷分）
		if (favorited) {
			const already = await hasPointsFor(locals.db, locals.user.id, 'favorite', postId);
			if (!already) {
				await awardPoints(locals.db, locals.user.id, 'favorite', postId);
			}

			// 通知楼主（自己收藏自己的帖子不通知）
			const detail = await getPostDetail(locals.db, postId);
			if (detail && detail.post.authorId !== locals.user.id) {
				await createNotification(locals.db, {
					userId: detail.post.authorId,
					actorId: locals.user.id,
					type: 'favorite',
					content: `收藏了你的帖子「${detail.post.title}」`,
					refId: postId
				});
			}
		}
		return { favorited };
	},

	/** 送花打赏（B2）：消耗自己背包中的一朵花，赠予楼主 */
	giftFlower: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再送花' });

		const detail = await getPostDetail(locals.db, params.id);
		if (!detail) return fail(404, { error: '帖子不存在' });
		if (detail.post.authorId === locals.user.id) {
			return fail(400, { error: '不能给自己送花' });
		}

		const form = await request.formData();
		const flowerType = String(form.get('flowerType') ?? '');
		if (!FLOWER_TYPES.includes(flowerType as FlowerType)) {
			return fail(400, { error: '无效的花' });
		}

		const result = await giftItemByType(
			locals.db,
			locals.user.id,
			detail.author,
			flowerType as FlowerType
		);
		if (!result.ok) return fail(400, { error: result.error });

		await createNotification(locals.db, {
			userId: detail.post.authorId,
			actorId: locals.user.id,
			type: 'gift',
			content: `送了你一朵「${FLOWERS[flowerType as FlowerType].name}」`,
			refId: params.id
		});

		// 成就检查：拥有称号/集齐三花（接收方收花后可能补成就）
		await checkAchievements(locals.db, detail.post.authorId);

		return { ok: true };
	},

	/** 举报（D1）：举报帖子或评论 */
	report: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再举报' });

		const form = await request.formData();
		const targetType = String(form.get('targetType') ?? '');
		if (targetType !== 'post' && targetType !== 'comment')
			return fail(400, { error: '无效的举报目标' });
		const targetId = String(form.get('targetId') ?? '');
		if (!targetId) return fail(400, { error: '缺少举报目标' });
		const reason = String(form.get('reason') ?? '').trim();
		if (!reason) return fail(400, { error: '请填写举报理由' });
		if (reason.length > 200) return fail(400, { error: '举报理由过长（最多 200 字）' });

		// 防止对自己内容举报无意义——允许但记录；同一目标不限制次数，管理员处理
		await createReport(locals.db, {
			reporterId: locals.user.id,
			targetType,
			targetId,
			reason
		});
		return { ok: true };
	}
};
