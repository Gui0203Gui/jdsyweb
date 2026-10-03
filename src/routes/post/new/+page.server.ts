import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listForums } from '#lib/server/queries';
import { posts } from '#lib/server/db/schema';
import { awardPoints } from '#lib/server/points';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login?redirect=/post/new');

	const forums = await listForums(locals.db);
	return { forums };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });

		const form = await request.formData();
		const forumId = String(form.get('forumId') ?? '');
		const title = String(form.get('title') ?? '').trim();
		const content = String(form.get('content') ?? '').trim();

		// 图片 key 列表：客户端上传后把 key 放进隐藏字段，多个用逗号分隔
		const imagesRaw = String(form.get('images') ?? '').trim();
		const images = imagesRaw
			? imagesRaw
					.split(',')
					.map((k) => k.trim())
					.filter((k) => k.startsWith('img/'))
			: [];

		if (!forumId) return fail(400, { error: '请选择板块' });
		if (!title) return fail(400, { error: '标题不能为空' });
		if (title.length > 80) return fail(400, { error: '标题过长（最多 80 字）' });
		if (!content) return fail(400, { error: '内容不能为空' });
		if (content.length > 20000) return fail(400, { error: '内容过长（最多 20000 字）' });
		if (images.length > 50) return fail(400, { error: '图片最多 50 张' });

		const inserted = await locals.db
			.insert(posts)
			.values({ forumId, authorId: locals.user.id, title, content, images: JSON.stringify(images) })
			.returning({ id: posts.id });

		const postId = inserted[0]?.id;
		if (!postId) return fail(500, { error: '发帖失败，请稍后再试' });

		// 发帖积分 +10
		await awardPoints(locals.db, locals.user.id, 'post', postId);

		redirect(303, `/post/${postId}`);
	}
};
