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

/** 根据道具类型取展示信息（未知类型返回空） */
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
