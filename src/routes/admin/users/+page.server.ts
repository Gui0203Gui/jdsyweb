import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listUsersAdmin, setUserBanned, setUserRole, deleteUser } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/');
	const users = await listUsersAdmin(locals.db, 200);
	return { users, currentUserId: locals.user.id };
};

export const actions: Actions = {
	ban: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少用户 ID' });
		await setUserBanned(locals.db, id, true);
		return { ok: true };
	},
	unban: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少用户 ID' });
		await setUserBanned(locals.db, id, false);
		return { ok: true };
	},
	admin: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少用户 ID' });
		await setUserRole(locals.db, id, 'admin');
		return { ok: true };
	},
	unadmin: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少用户 ID' });
		await setUserRole(locals.db, id, 'user');
		return { ok: true };
	},
	deleteUser: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少用户 ID' });
		if (id === locals.user.id) return fail(400, { error: '不能注销当前登录的管理员自己' });
		await deleteUser(locals.db, id);
		return { ok: true };
	}
};
