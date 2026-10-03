import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listForums } from '#lib/server/queries';
import { posts } from '#lib/server/db/schema';

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

		if (!forumId) return fail(400, { error: '请选择板块' });
		if (!title) return fail(400, { error: '标题不能为空' });
		if (title.length > 80) return fail(400, { error: '标题过长（最多 80 字）' });
		if (!content) return fail(400, { error: '内容不能为空' });
		if (content.length > 20000) return fail(400, { error: '内容过长（最多 20000 字）' });

		const inserted = await locals.db
			.insert(posts)
			.values({ forumId, authorId: locals.user.id, title, content })
			.returning({ id: posts.id });

		const postId = inserted[0]?.id;
		if (!postId) return fail(500, { error: '发帖失败，请稍后再试' });

		redirect(303, `/post/${postId}`);
	}
};
