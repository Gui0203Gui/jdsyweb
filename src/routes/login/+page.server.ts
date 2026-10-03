import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, verifyPassword, SESSION_COOKIE } from '#lib/server/auth';
import { users } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, url }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { error: '请输入用户名和密码' });
		}

		const user = await locals.db.select().from(users).where(eq(users.username, username)).get();
		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(400, { error: '用户名或密码错误' });
		}

		const { token, expiresAt } = await createSession(locals.db, user.id);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false, // 本地 http 开发需要；生产部署建议开启
			expires: expiresAt
		});

		const redirectTo = url.searchParams.get('redirect');
		if (redirectTo && redirectTo.startsWith('/')) {
			redirect(302, redirectTo);
		}
		redirect(302, '/');
	}
};
