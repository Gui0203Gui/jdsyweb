import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listPendingReports, setReportStatus } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/');
	const reports = await listPendingReports(locals.db, 100);
	return { reports };
};

export const actions: Actions = {
	resolve: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少举报 ID' });
		await setReportStatus(locals.db, id, 'resolved');
		return { ok: true };
	},
	dismiss: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少举报 ID' });
		await setReportStatus(locals.db, id, 'dismissed');
		return { ok: true };
	}
};
