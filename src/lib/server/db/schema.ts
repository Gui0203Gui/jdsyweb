import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** 用户表 */
export const users = sqliteTable(
	'users',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		username: text('username').notNull(),
		passwordHash: text('password_hash').notNull(),
		avatar: text('avatar').notNull().default(''),
		bio: text('bio').notNull().default(''),
		role: text('role', { enum: ['user', 'admin'] })
			.notNull()
			.default('user'),
		isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
		points: integer('points').notNull().default(0),
		badge: text('badge'), // 称号（如「国庆快乐」），空则无
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [uniqueIndex('users_username_idx').on(table.username)]
);

/** 板块表（贴吧分区） */
export const forums = sqliteTable(
	'forums',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		slug: text('slug').notNull(), // URL 友好标识，如 "general"
		name: text('name').notNull(), // 板块名，如 "综合讨论"
		description: text('description').notNull().default(''),
		icon: text('icon').notNull().default('💬'),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [uniqueIndex('forums_slug_idx').on(table.slug)]
);

/** 帖子表 */
export const posts = sqliteTable(
	'posts',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		forumId: text('forum_id')
			.notNull()
			.references(() => forums.id, { onDelete: 'cascade' }),
		authorId: text('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		content: text('content').notNull(),
		images: text('images').notNull().default('[]'), // JSON 数组：KV key 列表
		views: integer('views').notNull().default(0),
		isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
		isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
		isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [
		index('posts_forum_created_idx').on(table.forumId, table.createdAt),
		index('posts_author_idx').on(table.authorId)
	]
);

/** 回复表 */
export const comments = sqliteTable(
	'comments',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		postId: text('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		authorId: text('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [index('comments_post_created_idx').on(table.postId, table.createdAt)]
);

/** 点赞表（帖子/回复通用，通过 targetType 区分） */
export const likes = sqliteTable(
	'likes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		targetType: text('target_type', { enum: ['post', 'comment'] }).notNull(),
		targetId: text('target_id').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [
		uniqueIndex('likes_user_target_idx').on(table.userId, table.targetType, table.targetId)
	]
);

/** 收藏表（收藏帖子） */
export const favorites = sqliteTable(
	'favorites',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		postId: text('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [uniqueIndex('favorites_user_post_idx').on(table.userId, table.postId)]
);

/** 签到表（每天一次） */
export const signIns = sqliteTable(
	'sign_ins',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		date: text('date').notNull(), // YYYY-MM-DD，按用户本地日期
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [uniqueIndex('sign_ins_user_date_idx').on(table.userId, table.date)]
);

/** 作品集（上传的 HTML 作品） */
export const works = sqliteTable(
	'works',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		authorId: text('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description').notNull().default(''),
		fileName: text('file_name').notNull(), // 原始文件名
		fileKey: text('file_key').notNull(), // KV key
		fileSize: integer('file_size').notNull().default(0), // 字节
		views: integer('views').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [
		index('works_author_idx').on(table.authorId),
		index('works_created_idx').on(table.createdAt)
	]
);

/** 积分流水（记录每次积分变动） */
export const pointLogs = sqliteTable(
	'point_logs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		change: integer('change').notNull(), // 正负值
		reason: text('reason', {
			enum: ['post', 'comment', 'like', 'favorite', 'signin', 'work', 'shop']
		}).notNull(),
		refId: text('ref_id').notNull().default(''), // 关联对象 id（帖子/评论/作品）
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [index('point_logs_user_idx').on(table.userId, table.createdAt)]
);

/** 会话表（服务端会话，存 D1，天然支持登出与过期） */
export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(), // session token 的哈希
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [index('sessions_user_idx').on(table.userId)]
);

/** 消息通知（回复/点赞/收藏/系统） */
export const notifications = sqliteTable(
	'notifications',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }), // 接收者
		actorId: text('actor_id').notNull().default(''), // 触发者（可为空：系统通知）
		type: text('type', {
			enum: ['reply', 'like', 'favorite', 'system']
		}).notNull(),
		content: text('content').notNull(), // 展示文本
		refId: text('ref_id').notNull().default(''), // 关联对象 id（帖子/评论等）
		isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [index('notifications_user_created_idx').on(table.userId, table.createdAt)]
);

/** 老师表（老师评分排行榜） */
export const teachers = sqliteTable(
	'teachers',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull(), // 老师姓名
		avatar: text('avatar').notNull().default(''), // 头像 KV key（img/...），空则占位
		description: text('description').notNull().default(''), // 简介（科目/评价等，可选）
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }), // 上传者
		status: text('status', { enum: ['pending', 'approved', 'rejected'] })
			.notNull()
			.default('pending'), // 待审核/已通过/已驳回
		likes: integer('likes').notNull().default(0), // 点赞数（评分）
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [
		index('teachers_status_likes_idx').on(table.status, table.likes),
		index('teachers_created_by_idx').on(table.createdBy)
	]
);

/** 老师点赞表（每人对每位老师只可点赞一次） */
export const teacherLikes = sqliteTable(
	'teacher_likes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		teacherId: text('teacher_id')
			.notNull()
			.references(() => teachers.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [uniqueIndex('teacher_likes_user_teacher_idx').on(table.userId, table.teacherId)]
);

/** 道具表（用户背包，每件一行） */
export const items = sqliteTable(
	'items',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		ownerId: text('owner_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }), // 当前持有者
		itemType: text('item_type', {
			enum: [
				'flower:poppy',
				'flower:cornflower',
				'flower:dandelion',
				'badge:national',
				'badge:chengmen'
			]
		}).notNull(), // 道具类型：三种绝版花 / 称号【国庆快乐】/ 称号【程门立雪】
		source: text('source', {
			enum: ['festival-signin', 'gift', 'shop', 'craft', 'admin']
		}).notNull(), // 来源：国庆签到 / 好友赠送 / 商店购买 / 商店合成 / 管理员发放
		equipped: integer('equipped', { mode: 'boolean' }).notNull().default(false), // 是否装备中（仅称号道具使用）
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [index('items_owner_idx').on(table.ownerId)]
);

/** 国庆签到活动记录（假期内每天一次，随机领花） */
export const festivalSignIns = sqliteTable(
	'festival_sign_ins',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		signinDate: text('signin_date').notNull(), // YYYY-MM-DD
		itemType: text('item_type').notNull(), // 当天随机获得的花
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [uniqueIndex('festival_sign_ins_user_date_idx').on(table.userId, table.signinDate)]
);

/** 涂鸦留言板（大画布涂鸦，可擦除） */
export const graffitis = sqliteTable(
	'graffitis',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		authorId: text('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		imageKey: text('image_key').notNull(), // img/graff-<uuid>.png
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [index('graffitis_created_idx').on(table.createdAt)]
);

export type User = typeof users.$inferSelect;
export type Forum = typeof forums.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type SignIn = typeof signIns.$inferSelect;
export type Work = typeof works.$inferSelect;
export type PointLog = typeof pointLogs.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type TeacherLike = typeof teacherLikes.$inferSelect;
export type Item = typeof items.$inferSelect;
export type FestivalSignIn = typeof festivalSignIns.$inferSelect;
export type Graffiti = typeof graffitis.$inferSelect;

/** 便捷：SQL 常量，用于软删除/时间等场景 */
export const now = sql`(unixepoch() * 1000)`;
