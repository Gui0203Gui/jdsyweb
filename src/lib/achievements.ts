/**
 * 成就定义（前端 + 后端共用展示信息）。
 * 种子数据在迁移 0008 中写入 achievements 表。
 */
export type AchievementInfo = {
	key: string;
	name: string;
	description: string;
	icon: string;
};

export const ACHIEVEMENT_INFOS: Record<string, AchievementInfo> = {
	'first-post': { key: 'first-post', name: '初来乍到', description: '发布第一个帖子', icon: '📝' },
	'first-comment': {
		key: 'first-comment',
		name: '妙语连珠',
		description: '发表第一条评论',
		icon: '💬'
	},
	'signin-7': { key: 'signin-7', name: '七日之约', description: '累计签到 7 天', icon: '📅' },
	'like-100': { key: 'like-100', name: '人气爆棚', description: '累计收到 100 个赞', icon: '❤️' },
	'work-first': { key: 'work-first', name: '作品初成', description: '上传第一个作品', icon: '🎨' },
	'badge-owner': { key: 'badge-owner', name: '名号加身', description: '拥有一个称号', icon: '🏅' },
	'flower-collector': {
		key: 'flower-collector',
		name: '花语集者',
		description: '集齐虞美人、矢车菊、蒲公英',
		icon: '🌼'
	},
	'point-500': { key: 'point-500', name: '积分达人', description: '积分达到 500', icon: '⭐' },
	'follow-10': { key: 'follow-10', name: '广交好友', description: '关注 10 位吧友', icon: '🤝' },
	'message-first': {
		key: 'message-first',
		name: '鸿雁传书',
		description: '收到第一条私信',
		icon: '💌'
	}
};

export const ACHIEVEMENT_KEYS = Object.keys(ACHIEVEMENT_INFOS);

export function achievementInfo(key: string): AchievementInfo | null {
	return ACHIEVEMENT_INFOS[key] ?? null;
}
