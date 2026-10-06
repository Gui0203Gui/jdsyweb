import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	buyFlower,
	buyNameCard,
	buyRichBadge,
	craftBadge,
	getShopStatus
} from '#lib/server/queries';
import { FLOWER_TYPES, badgeShort, type FlowerType } from '#lib/flowers';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const status = await getShopStatus(locals.db, locals.user.id);
	return {
		points: status.points,
		badge: status.badge,
		badgeCount: status.badgeCount,
		counts: status.counts,
		username: locals.user.username
	};
};

export const actions: Actions = {
	/** 交易①：合成称号（3 花换称号道具，入背包；未装备时自动穿戴） */
	craft: async ({ locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const result = await craftBadge(locals.db, locals.user.id);
		if (!result.ok) return fail(400, { error: result.error });
		const short = badgeShort(result.badge);
		return {
			success: result.equipped
				? `合成成功！称号【${short}】已放入背包并自动装备`
				: `合成成功！称号【${short}】已放入背包（当前已装备其他称号，可在背包中切换）`
		};
	},

	/** 交易②③④：积分买花 */
	buy: async ({ request, locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const form = await request.formData();
		const itemType = String(form.get('itemType') ?? '');
		if (!FLOWER_TYPES.includes(itemType as FlowerType)) {
			return fail(400, { error: '商品类型无效' });
		}
		const result = await buyFlower(locals.db, locals.user.id, itemType as FlowerType);
		if (!result.ok) return fail(400, { error: result.error });
		return { success: `购买成功！已放入背包（剩余 ${result.points} 积分）` };
	},

	/** 交易⑤：积分买改名卡（20 积分，背包内使用可改名一次） */
	buyName: async ({ locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const result = await buyNameCard(locals.db, locals.user.id);
		if (!result.ok) return fail(400, { error: result.error });
		return {
			success: `购买成功！改名卡已放入背包（剩余 ${result.points} 积分），去背包使用即可改名`
		};
	},

	/** 交易⑥：500 积分买橙色称号【？！富富！？】 */
	buyRich: async ({ locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const result = await buyRichBadge(locals.db, locals.user.id);
		if (!result.ok) return fail(400, { error: result.error });
		return {
			success: `购买成功！橙色称号【？！富富！？】已放入背包（剩余 ${result.points} 积分），去背包穿戴即可`
		};
	}
};
