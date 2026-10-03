import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPostDetail, incrementPostViews, listComments, toggleLike } from '#lib/server/queries';
import { comments } from '#lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = await getPostDetail(locals.db, params.id);
	if (!detail) error(404, '帖子不存在或已被删除');

	// 浏览量 +1（忽略失败，不影响阅读）
	await incrementPostViews(locals.db, params.id);

	const [commentList] = await Promise.all([listComments(locals.db, params.id)]);

	return { post: detail.post, author: detail.author, forum: detail.forum, comments: commentList };
};

export const actions: Actions = {
	/** 回复帖子 */
	comment: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再回复' });

		const form = await request.formData();
		const content = String(form.get('content') ?? '').trim();
		if (!content) return fail(400, { error: '回复内容不能为空' });
		if (content.length > 5000) return fail(400, { error: '回复内容过长（最多 5000 字）' });

		await locals.db.insert(comments).values({
			postId: params.id,
			authorId: locals.user.id,
			content
		});

		return { ok: true };
	},

	/** 点赞 / 取消点赞 */
	like: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再点赞' });

		const form = await request.formData();
		const targetType = String(form.get('targetType') ?? '');
		if (targetType !== 'post' && targetType !== 'comment')
			return fail(400, { error: '无效的点赞目标' });

		const targetId = String(form.get('targetId') ?? '');
		if (!targetId) return fail(400, { error: '缺少点赞目标' });

		const liked = await toggleLike(locals.db, locals.user.id, targetType, targetId);
		return { liked };
	}
};
