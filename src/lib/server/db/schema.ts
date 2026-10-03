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
		points: integer('points').notNull().default(0),
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
			enum: ['post', 'comment', 'like', 'favorite', 'signin', 'work']
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

/** 便捷：SQL 常量，用于软删除/时间等场景 */
export const now = sql`(unixepoch() * 1000)`;
