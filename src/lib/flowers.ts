/**
 * 绝版花朵道具定义（前端 + 后端共用）。
 * 贴图来自 Minecraft 官方纹理（assets/minecraft/textures/block/ 下的 poppy/cornflower/dandelion），
 * 已放大为 128x128 存入 static/flowers/。
 */
export const FLOWERS = {
	'flower:poppy': {
		key: 'flower:poppy',
		name: '虞美人',
		image: '/flowers/poppy.png',
		tag: '绝版'
	},
	'flower:cornflower': {
		key: 'flower:cornflower',
		name: '矢车菊',
		image: '/flowers/cornflower.png',
		tag: '绝版'
	},
	'flower:dandelion': {
		key: 'flower:dandelion',
		name: '蒲公英',
		image: '/flowers/dandelion.png',
		tag: '绝版'
	}
} as const;

export type FlowerType = keyof typeof FLOWERS;

export const FLOWER_TYPES = Object.keys(FLOWERS) as FlowerType[];

/**
 * 称号道具展示信息（背包物品，可穿戴/脱下/赠送）。
 * cls 决定全站渲染样式：
 *  - nat（国庆快乐）：红色加粗、发言红色黑框
 *  - cheng（程门立雪）：绿色细体、无边框
 */
export type BadgeInfo = {
	key: string;
	name: string;
	shortName: string;
	tag: string;
	icon: string;
	cls: 'nat' | 'cheng';
};

export const BADGE_INFOS = {
	'badge:national': {
		key: 'badge:national',
		name: '称号·国庆快乐',
		shortName: '国庆快乐',
		tag: '绝版',
		icon: '🏅',
		cls: 'nat'
	},
	'badge:chengmen': {
		key: 'badge:chengmen',
		name: '称号·程门立雪',
		shortName: '程门立雪',
		tag: '绝版',
		icon: '❄️',
		cls: 'cheng'
	}
} as const;

export type BadgeType = keyof typeof BADGE_INFOS;

export const BADGE_TYPES = Object.keys(BADGE_INFOS) as BadgeType[];

/** 旧数据兼容：users.badge 曾直接存称号中文名 */
const LEGACY_BADGE_NAMES: Record<string, BadgeType> = {
	国庆快乐: 'badge:national'
};

/** 根据 users.badge 字段（称号 key）取展示信息；无效/空返回 null */
export function badgeInfo(badgeKey: string | null | undefined): BadgeInfo | null {
	if (!badgeKey) return null;
	const key = LEGACY_BADGE_NAMES[badgeKey] ?? badgeKey;
	return (BADGE_INFOS as Record<string, BadgeInfo>)[key] ?? null;
}

/** 称号短名（名字后方显示） */
export function badgeShort(badgeKey: string | null | undefined): string {
	return badgeInfo(badgeKey)?.shortName ?? '称号';
}

/** 称号样式类（nat / cheng） */
export function badgeCls(badgeKey: string | null | undefined): string {
	return badgeInfo(badgeKey)?.cls ?? 'nat';
}

export type ItemType = FlowerType | BadgeType | MiscItemType;

/**
 * 其他道具（非花、非称号的背包物品）。
 */
export const MISC_ITEMS = {
	'item:namecard': {
		key: 'item:namecard',
		name: '改名卡',
		tag: '商店 · 20积分',
		image: '/misc/namecard.svg',
		icon: '🪪'
	}
} as const;

export type MiscItemType = keyof typeof MISC_ITEMS;

export const MISC_ITEM_TYPES = Object.keys(MISC_ITEMS) as MiscItemType[];

export const NAME_CARD_TYPE = 'item:namecard';

/** 根据道具类型取展示信息（花 / 称号 / 其他道具；未知类型返回 null） */
export function itemInfo(itemType: string) {
	return (
		(BADGE_INFOS as Record<string, BadgeInfo>)[itemType] ??
		FLOWERS[itemType as FlowerType] ??
		MISC_ITEMS[itemType as MiscItemType] ??
		null
	);
}

/** 根据道具类型取展示信息（仅花；未知类型返回 null，兼容旧调用） */
export function flowerInfo(itemType: string) {
	return FLOWERS[itemType as FlowerType] ?? null;
}

/** 国庆活动窗口（含首尾当天，按 UTC+8 日期字符串比较） */
export const FESTIVAL_START = '2026-10-01';
export const FESTIVAL_END = '2026-10-07';

/** 国庆假期第几天（1 起）；未开始返回 0，已结束返回 -1 */
export function festivalDay(date: string): number {
	if (date < FESTIVAL_START) return 0;
	if (date > FESTIVAL_END) return -1;
	// 简单按日序计算：直接解析为天数差 + 1
	const [y1, m1, d1] = FESTIVAL_START.split('-').map(Number);
	const [y2, m2, d2] = date.split('-').map(Number);
	const start = Date.UTC(y1, m1 - 1, d1);
	const cur = Date.UTC(y2, m2 - 1, d2);
	return Math.round((cur - start) / 86400000) + 1;
}

/** 活动是否进行中 */
export function festivalOpen(date: string): boolean {
	return date >= FESTIVAL_START && date <= FESTIVAL_END;
}
