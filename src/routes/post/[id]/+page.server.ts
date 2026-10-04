import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createNotification,
	getPostDetail,
	hasPointsFor,
	incrementPostViews,
	isPostFavorited,
	listComments,
	toggleFavorite,
	toggleLike
} from '#lib/server/queries';
import { comments, posts } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { awardPoints } from '#lib/server/points';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = await getPostDetail(locals.db, params.id);
	if (!detail) error(404, '帖子不存在或已被删除');

	// 浏览量 +1（忽略失败，不影响阅读）
	await incrementPostViews(locals.db, params.id);

	const [commentList, favorited] = await Promise.all([
		listComments(locals.db, params.id),
		locals.user ? isPostFavorited(locals.db, locals.user.id, params.id) : Promise.resolve(false)
	]);

	return {
		post: detail.post,
		author: detail.author,
		forum: detail.forum,
		comments: commentList,
		favorited
	};
};

export const actions: Actions = {
	/** 回复帖子（+5 积分，并通知楼主） */
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

		return { ok: true };
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
	}
};
