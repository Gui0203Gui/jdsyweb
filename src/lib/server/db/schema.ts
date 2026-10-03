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
export type Session = typeof sessions.$inferSelect;

/** 便捷：SQL 常量，用于软删除/时间等场景 */
export const now = sql`(unixepoch() * 1000)`;
