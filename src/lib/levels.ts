/**
 * 用户等级体系（前端 + 后端共用）。
 * 等级由积分决定，纯函数映射，无需数据库表。
 */
export type LevelInfo = {
	level: number;
	min: number;
	name: string;
	icon: string;
};

export const LEVELS: LevelInfo[] = [
	{ level: 1, min: 0, name: '贴吧萌新', icon: '🌱' },
	{ level: 2, min: 50, name: '初出茅庐', icon: '🌿' },
	{ level: 3, min: 150, name: '小有名气', icon: '🍀' },
	{ level: 4, min: 300, name: '吧内红人', icon: '🔥' },
	{ level: 5, min: 500, name: '风云人物', icon: '🌟' },
	{ level: 6, min: 800, name: '传奇吧友', icon: '👑' },
	{ level: 7, min: 1200, name: '吧内巨星', icon: '💎' },
	{ level: 8, min: 2000, name: '吧主传说', icon: '🏆' }
];

/** 根据积分取等级信息（未匹配到更高等级时返回已达最高级） */
export function levelForPoints(points: number): LevelInfo {
	let cur = LEVELS[0];
	for (const lv of LEVELS) {
		if (points >= lv.min) cur = lv;
		else break;
	}
	return cur;
}

/** 下一等级信息（用于展示距离升级还差多少积分）；已满级返回 null */
export function nextLevel(points: number): LevelInfo | null {
	for (const lv of LEVELS) {
		if (points < lv.min) return lv;
	}
	return null;
}
