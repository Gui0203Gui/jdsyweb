import type { LayoutServerLoad } from './$types';
import { countUnreadNotifications } from '#lib/server/queries';
import { todayStr } from '#lib/server/points';
import { signIns } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	// 登录用户附带积分、今日签到状态与未读通知数
	let user = null;
	if (locals.user) {
		const signedToday = await locals.db
			.select({ id: signIns.id })
			.from(signIns)
			.where(and(eq(signIns.userId, locals.user.id), eq(signIns.date, todayStr())))
			.get();

		const unreadCount = await countUnreadNotifications(locals.db, locals.user.id);

		user = {
			id: locals.user.id,
			username: locals.user.username,
			avatar: locals.user.avatar,
			role: locals.user.role,
			points: locals.user.points,
			signedToday: Boolean(signedToday),
			unreadCount
		};
	}

	return { user };
};
