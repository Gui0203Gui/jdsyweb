import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createNotification,
	getTeacher,
	listPendingTeachers,
	setTeacherStatus
} from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/');
	const pending = await listPendingTeachers(locals.db, 100);
	return { pending };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少老师 ID' });

		const teacher = await getTeacher(locals.db, id);
		if (!teacher || teacher.status !== 'pending') return fail(400, { error: '老师不存在或已处理' });

		await setTeacherStatus(locals.db, id, 'approved');
		await createNotification(locals.db, {
			userId: teacher.createdBy,
			type: 'system',
			content: `管理员已通过你上传的老师「${teacher.name}」，现已展示在老师评分排行榜`,
			refId: id
		});
		return { ok: true };
	},
	reject: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少老师 ID' });

		const teacher = await getTeacher(locals.db, id);
		if (!teacher || teacher.status !== 'pending') return fail(400, { error: '老师不存在或已处理' });

		await setTeacherStatus(locals.db, id, 'rejected');
		await createNotification(locals.db, {
			userId: teacher.createdBy,
			type: 'system',
			content: `管理员驳回了你上传的老师「${teacher.name}」`,
			refId: id
		});
		return { ok: true };
	}
};
