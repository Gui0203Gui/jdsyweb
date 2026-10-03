import type { LayoutServerLoad } from './$types';
import { listForums } from '#lib/server/queries';
import { todayStr } from '#lib/server/points';
import { signIns } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	const forums = await listForums(locals.db);

	// 登录用户附带积分与今日签到状态
	let user = null;
	if (locals.user) {
		const signedToday = await locals.db
			.select({ id: signIns.id })
			.from(signIns)
			.where(and(eq(signIns.userId, locals.user.id), eq(signIns.date, todayStr())))
			.get();

		user = {
			id: locals.user.id,
			username: locals.user.username,
			avatar: locals.user.avatar,
			role: locals.user.role,
			points: locals.user.points,
			signedToday: Boolean(signedToday)
		};
	}

	return { user, forums };
};
