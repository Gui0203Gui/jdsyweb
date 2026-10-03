import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { env } from 'cloudflare:workers';
import { getDb } from '#lib/server/db';
import {
	deleteSession,
	getSessionUser,
	purgeExpiredSessions,
	SESSION_COOKIE
} from '#lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// 注入 D1 数据库（adapter-cloudflare 通过 cloudflare:workers 提供绑定）
	const d1 = env.DB;
	if (!d1) {
		// 纯 vite dev（无 Cloudflare 运行时）时给出明确指引
		throw new Error('未检测到 D1 数据库环境。请在完整 Cloudflare 环境下运行：npm run dev:cf');
	}
	const db = getDb(d1);
	event.locals.db = db;

	// 从 Cookie 恢复会话用户
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = token ? await getSessionUser(db, token) : null;

	// 被封禁的用户强制登出（清掉会话）
	if (event.locals.user?.isBanned) {
		await deleteSession(db, token!);
		event.cookies.delete(SESSION_COOKIE, { path: '/' });
		event.locals.user = null;
	}

	// 低频清理过期会话（每次请求概率性执行，避免额外扫描开销）
	if (Math.random() < 0.001) {
		await purgeExpiredSessions(db);
	}

	return resolve(event);
};

export const handleError: HandleServerError = ({ error }) => {
	console.error('Unhandled server error:', error);
	return { message: '服务器开小差了，请稍后再试。' };
};
