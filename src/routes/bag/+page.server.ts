import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createNotification,
	getUserByUsername,
	giftItemByType,
	listItems
} from '#lib/server/queries';
import { flowerInfo, FLOWER_TYPES, type FlowerType } from '#lib/flowers';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const items = await listItems(locals.db, locals.user.id);

	// 按道具类型汇总数量
	const counts = new Map<string, number>();
	for (const it of items) {
		counts.set(it.itemType, (counts.get(it.itemType) ?? 0) + 1);
	}

	return {
		items: items.map((it) => ({
			id: it.id,
			itemType: it.itemType,
			info: flowerInfo(it.itemType),
			source: it.source,
			createdAt: it.createdAt
		})),
		counts: [...counts.entries()].map(([type, n]) => ({ type, info: flowerInfo(type), n })),
		username: locals.user.username
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

		const info = flowerInfo(itemType);
		await createNotification(locals.db, {
			userId: toUser.id,
			actorId: locals.user.id,
			type: 'system',
			content: `${locals.user.username} 送给你一朵${info ? info.name : '神秘花'}（${info?.tag ?? ''}）`
		});

		return { success: `已将${info ? info.name : '道具'}送给 ${toName}` };
	}
};
