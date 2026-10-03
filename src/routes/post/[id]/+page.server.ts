import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getPostDetail,
	incrementPostViews,
	isPostFavorited,
	listComments,
	toggleFavorite,
	toggleLike
} from '#lib/server/queries';
import { comments } from '#lib/server/db/schema';
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
	/** 回复帖子（+5 积分） */
	comment: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再回复' });

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

		return { ok: true };
	},

	/** 点赞 / 取消点赞（点赞 +2 积分） */
	like: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再点赞' });

		const form = await request.formData();
		const targetType = String(form.get('targetType') ?? '');
		if (targetType !== 'post' && targetType !== 'comment')
			return fail(400, { error: '无效的点赞目标' });

		const targetId = String(form.get('targetId') ?? '');
		if (!targetId) return fail(400, { error: '缺少点赞目标' });

		const liked = await toggleLike(locals.db, locals.user.id, targetType, targetId);
		// 点赞成功才加分（取消点赞不扣分）
		if (liked) await awardPoints(locals.db, locals.user.id, 'like', targetId);
		return { liked };
	},

	/** 收藏 / 取消收藏（收藏 +3 积分） */
	favorite: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再收藏' });

		const form = await request.formData();
		const postId = String(form.get('postId') ?? '');
		if (!postId) return fail(400, { error: '缺少帖子' });

		const favorited = await toggleFavorite(locals.db, locals.user.id, postId);
		// 收藏成功才加分（取消收藏不扣分）
		if (favorited) await awardPoints(locals.db, locals.user.id, 'favorite', postId);
		return { favorited };
	}
};
