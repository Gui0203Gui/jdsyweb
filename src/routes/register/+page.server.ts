import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, hashPassword, SESSION_COOKIE } from '#lib/server/auth';
import { users } from '#lib/server/db/schema';
import { count, eq } from 'drizzle-orm';

const MAX_ACCOUNTS_PER_IP = 3; // 同一 IP 最多注册的账号数

/** 从请求头解析客户端 IP（Cloudflare 优先，其次 X-Forwarded-For） */
function clientIp(request: Request): string {
	const cf = request.headers.get('cf-connecting-ip');
	if (cf) return cf.slice(0, 45);
	const xff = request.headers.get('x-forwarded-for');
	if (xff) return xff.split(',')[0].trim().slice(0, 45);
	return '';
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (!USERNAME_RE.test(username)) {
			return fail(400, { error: '用户名需为 2-20 位的中文、字母、数字或下划线' });
		}
		if (password.length < 6) {
			return fail(400, { error: '密码至少 6 位' });
		}
		if (password !== confirm) {
			return fail(400, { error: '两次输入的密码不一致' });
		}

		// 用户名唯一性检查
		const existing = await locals.db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, username))
			.get();
		if (existing) {
			return fail(400, { error: '该用户名已被注册' });
		}

		// IP 限制：同一 IP 最多注册 3 个账号
		const ip = clientIp(request);
		if (ip) {
			const row = await locals.db.select({ n: count() }).from(users).where(eq(users.ip, ip));
			if ((row[0]?.n ?? 0) >= MAX_ACCOUNTS_PER_IP) {
				return fail(400, {
					error: `同一 IP 最多注册 ${MAX_ACCOUNTS_PER_IP} 个账号，该网络环境已无法继续注册`
				});
			}
		}

		const passwordHash = await hashPassword(password);
		const inserted = await locals.db
			.insert(users)
			.values({ username, passwordHash, ip })
			.returning({ id: users.id });

		const userId = inserted[0]?.id;
		if (!userId) return fail(500, { error: '注册失败，请稍后再试' });

		const { token, expiresAt } = await createSession(locals.db, userId);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false, // Cloudflare Pages 部署后建议开启；本地 http 需要 false
			expires: expiresAt
		});

		redirect(302, '/');
	}
};
