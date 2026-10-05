import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	adminTakeItem,
	changeUsername,
	createNotification,
	equipBadge,
	getItem,
	getUserByUsername,
	giftBadgeItem,
	giftItemByType,
	listItems,
	unequipBadge
} from '#lib/server/queries';
import {
	BADGE_TYPES,
	FLOWER_TYPES,
	badgeShort,
	itemInfo,
	type BadgeType,
	type FlowerType
} from '#lib/flowers';

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const items = await listItems(locals.db, locals.user.id);

	// 按道具类型汇总数量
	const counts = new Map<string, number>();
	let equippedBadge: string | null = null; // 当前装备的称号 key（badge:*）
	for (const it of items) {
		counts.set(it.itemType, (counts.get(it.itemType) ?? 0) + 1);
		if (it.itemType.startsWith('badge:') && it.equipped) equippedBadge = it.itemType;
	}

	return {
		items: items.map((it) => ({
			id: it.id,
			itemType: it.itemType,
			info: itemInfo(it.itemType) as {
				name: string;
				tag: string;
				image?: string;
				icon?: string;
			} | null,
			source: it.source,
			equipped: it.equipped,
			createdAt: it.createdAt
		})),
		counts: [...counts.entries()].map(([type, n]) => ({
			type,
			info: itemInfo(type) as { name: string; tag: string; image?: string; icon?: string } | null,
			n
		})),
		equippedBadge,
		username: locals.user.username,
		isAdmin: locals.user.role === 'admin'
	};
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const form = await request.formData();
		const itemType = String(form.get('itemType') ?? '');
		const toName = String(form.get('username') ?? '').trim();

		if (!FLOWER_TYPES.includes(itemType as FlowerType)) return fail(400, { error: '道具类型无效' });
		if (!toName) return fail(400, { error: '请填写接收者用户名' });
		if (toName === locals.user.username) return fail(400, { error: '不能送给自己' });

		const toUser = await getUserByUsername(locals.db, toName);
		if (!toUser) return fail(400, { error: `用户「${toName}」不存在` });

		const result = await giftItemByType(locals.db, locals.user.id, toUser, itemType as FlowerType);
		if (!result.ok) return fail(400, { error: result.error });

		const info = itemInfo(itemType);
		await createNotification(locals.db, {
			userId: toUser.id,
			actorId: locals.user.id,
			type: 'system',
			content: `${locals.user.username} 送给你一朵${info ? info.name : '神秘花'}（${info?.tag ?? ''}）`
		});

		return { success: `已将${info ? info.name : '道具'}送给 ${toName}` };
	},

	/** 赠送称号道具（指定具体道具 id） */
	sendBadge: async ({ request, locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const form = await request.formData();
		const itemId = String(form.get('itemId') ?? '');
		const toName = String(form.get('username') ?? '').trim();

		if (!itemId) return fail(400, { error: '请选择要送出的称号' });
		if (!toName) return fail(400, { error: '请填写接收者用户名' });
		if (toName === locals.user.username) return fail(400, { error: '不能送给自己' });

		const toUser = await getUserByUsername(locals.db, toName);
		if (!toUser) return fail(400, { error: `用户「${toName}」不存在` });

		const item = await getItem(locals.db, itemId);
		if (!item || !item.itemType.startsWith('badge:')) return fail(400, { error: '称号不存在' });

		const result = await giftBadgeItem(locals.db, itemId, locals.user.id, toUser);
		if (!result.ok) return fail(400, { error: result.error });

		const shortName = badgeShort(item.itemType);
		await createNotification(locals.db, {
			userId: toUser.id,
			actorId: locals.user.id,
			type: 'system',
			content: `${locals.user.username} 送给你一个称号【${shortName}】`
		});

		return { success: `已将称号【${shortName}】送给 ${toName}` };
	},

	/** 穿戴称号道具 */
	equip: async ({ request, locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const form = await request.formData();
		const itemId = String(form.get('itemId') ?? '');
		const result = await equipBadge(locals.db, locals.user.id, itemId);
		if (!result.ok) return fail(400, { error: result.error });
		return { success: `已装备称号【${badgeShort(result.badge)}】` };
	},

	/** 脱下称号（仍保留在背包） */
	unequip: async ({ locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const result = await unequipBadge(locals.db, locals.user.id);
		if (!result.ok) return fail(400, { error: result.error });
		return { success: '已脱下称号，称号仍保留在背包中' };
	},

	/** 管理员取物栏：无限领取任意物品放入自己背包 */
	takeItem: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin')
			return fail(403, { error: '仅管理员可使用取物栏' });
		const form = await request.formData();
		const itemType = String(form.get('itemType') ?? '');
		const allowed = [...FLOWER_TYPES, ...BADGE_TYPES, 'item:namecard'] as string[];
		if (!allowed.includes(itemType)) return fail(400, { error: '物品类型无效' });
		await adminTakeItem(locals.db, locals.user.id, itemType);
		const info = itemInfo(itemType);
		return { success: `已领取 1 个${info ? info.name : itemType}` };
	},

	/** 使用改名卡：消耗 1 张卡，将用户名改为新昵称 */
	rename: async ({ request, locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const form = await request.formData();
		const newName = String(form.get('username') ?? '').trim();
		if (!USERNAME_RE.test(newName)) {
			return fail(400, { error: '用户名需为 2-20 位的中文、字母、数字或下划线' });
		}
		if (newName === locals.user.username) {
			return fail(400, { error: '新用户名和当前用户名一样' });
		}
		const result = await changeUsername(locals.db, locals.user.id, newName);
		if (!result.ok) return fail(400, { error: result.error });
		return { success: `改名成功！你的新用户名是「${newName}」，记得用新用户名登录` };
	}
};
