import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { works } from '#lib/server/db/schema';
import { awardPoints, putFile } from '#lib/server/points';
import { checkAchievements } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login?redirect=/works/new');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const file = form.get('file');

		if (!title) return fail(400, { error: '作品标题不能为空' });
		if (title.length > 60) return fail(400, { error: '标题过长（最多 60 字）' });
		if (description.length > 500) return fail(400, { error: '描述过长（最多 500 字）' });
		if (!(file instanceof File)) return fail(400, { error: '请选择 HTML 文件' });

		const ext =
			file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
		if (!ext) return fail(400, { error: '仅支持 .html / .htm 文件' });

		const text = await file.text();
		if (text.length === 0) return fail(400, { error: '文件内容为空' });

		const key = `work/${crypto.randomUUID()}.html`;
		await putFile(key, text, 'text/html; charset=utf-8');

		const inserted = await locals.db
			.insert(works)
			.values({
				authorId: locals.user.id,
				title,
				description,
				fileName: file.name,
				fileKey: key,
				fileSize: file.size
			})
			.returning({ id: works.id });

		const workId = inserted[0]?.id;
		if (!workId) return fail(500, { error: '上传失败，请稍后再试' });

		// 上传作品 +20 积分
		await awardPoints(locals.db, locals.user.id, 'work', workId);

		// 成就检查：首个作品
		await checkAchievements(locals.db, locals.user.id);

		redirect(303, `/works/${workId}`);
	}
};
