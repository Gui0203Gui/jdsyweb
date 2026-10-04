import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { buyFlower, craftBadge, getShopStatus } from '#lib/server/queries';
import { FLOWER_TYPES, type FlowerType } from '#lib/flowers';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const status = await getShopStatus(locals.db, locals.user.id);
	return {
		points: status.points,
		badge: status.badge,
		counts: status.counts,
		username: locals.user.username
	};
};

export const actions: Actions = {
	/** 交易①：合成称号（3 花换称号） */
	craft: async ({ locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const status = await getShopStatus(locals.db, locals.user.id);
		if (status.badge) return fail(400, { error: '你已经拥有称号，无需重复合成' });
		const result = await craftBadge(locals.db, locals.user.id);
		if (!result.ok) return fail(400, { error: result.error });
		return { success: `合成成功！已装备称号【${result.badge}】` };
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
	}
};
