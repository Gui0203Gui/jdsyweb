import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession, SESSION_COOKIE } from '#lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) {
			await deleteSession(locals.db, token);
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(302, '/');
	}
};
