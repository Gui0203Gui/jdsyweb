import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createAnnouncement,
	deleteAnnouncement,
	listAllAnnouncements,
	setAnnouncementActive
} from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/');
	const announcements = await listAllAnnouncements(locals.db, 100);
	return { announcements };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const content = String(form.get('content') ?? '').trim();
		if (!title) return fail(400, { error: '公告标题不能为空' });
		if (title.length > 60) return fail(400, { error: '标题过长（最多 60 字）' });
		if (!content) return fail(400, { error: '公告内容不能为空' });
		if (content.length > 500) return fail(400, { error: '内容过长（最多 500 字）' });
		await createAnnouncement(locals.db, title, content, locals.user.id);
		return { ok: true };
	},
	activate: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少公告 ID' });
		await setAnnouncementActive(locals.db, id, true);
		return { ok: true };
	},
	deactivate: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少公告 ID' });
		await setAnnouncementActive(locals.db, id, false);
		return { ok: true };
	},
	delete: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少公告 ID' });
		await deleteAnnouncement(locals.db, id);
		return { ok: true };
	}
};
