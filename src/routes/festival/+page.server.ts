import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	claimFestivalFlower,
	festivalClaimedOn,
	listFestivalClaims,
	listItems
} from '#lib/server/queries';
import { FESTIVAL_END, FESTIVAL_START, festivalDay, flowerInfo } from '#lib/flowers';
import { todayStr } from '#lib/server/points';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const date = todayStr();
	const day = festivalDay(date);
	const claimedToday = await festivalClaimedOn(locals.db, locals.user.id, date);
	const claims = await listFestivalClaims(locals.db, locals.user.id);
	const bag = await listItems(locals.db, locals.user.id);

	return {
		date,
		day, // 0=未开始 -1=已结束，否则第几天
		open: day >= 1,
		claimedToday: claimedToday ? flowerInfo(claimedToday) : null,
		claims: claims.map((c) => ({ date: c.signinDate, info: flowerInfo(c.itemType) })),
		totalFlowers: bag.filter((b) => b.source === 'festival-signin').length,
		festivalStart: FESTIVAL_START,
		festivalEnd: FESTIVAL_END
	};
};

export const actions: Actions = {
	claim: async ({ locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const result = await claimFestivalFlower(locals.db, locals.user.id);
		if (!result.ok) {
			return { error: result.error };
		}
		const info = flowerInfo(result.flower!);
		return { success: `今天领到了「${info?.name ?? '花'}」${info?.tag ?? ''}，已放入背包！` };
	}
};
