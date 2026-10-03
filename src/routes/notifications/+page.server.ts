import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listNotifications, markNotificationsRead } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login?redirect=/notifications');
	const notifications = await listNotifications(locals.db, locals.user.id, 50);
	return { notifications };
};

export const actions: Actions = {
	/** 全部标记为已读 */
	markRead: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });
		await markNotificationsRead(locals.db, locals.user.id);
		return { ok: true };
	}
};
