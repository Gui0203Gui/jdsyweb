import { desc, eq, sql, count } from 'drizzle-orm';
import type { Db } from './auth';
import { comments, forums, likes, posts, users } from './db/schema';

// ---------- 板块 ----------

export async function listForums(db: Db) {
	return db.select().from(forums).orderBy(forums.sortOrder, forums.name);
}

export async function getForumBySlug(db: Db, slug: string) {
	return db.select().from(forums).where(eq(forums.slug, slug)).get();
}

// ---------- 帖子 ----------

export type PostWithAuthor = {
	post: typeof posts.$inferSelect;
	author: typeof users.$inferSelect;
	commentCount: number;
	likeCount: number;
};

/** 首页帖子流：最新帖子（含作者、回复数、点赞数） */
export async function listLatestPosts(db: Db, limit = 30) {
	const rows = await db
		.select({
			post: posts,
			author: users,
			commentCount: sql<number>`count(distinct ${comments.id})`,
			likeCount: sql<number>`count(distinct case when ${likes.targetType} = 'post' then ${likes.id} end)`
		})
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.leftJoin(comments, eq(comments.postId, posts.id))
		.leftJoin(likes, eq(likes.targetId, posts.id))
		.groupBy(posts.id)
		.orderBy(desc(posts.isPinned), desc(posts.createdAt))
		.limit(limit);

	return rows.map((r) => ({
		post: r.post,
		author: r.author,
		commentCount: Number(r.commentCount ?? 0),
		likeCount: Number(r.likeCount ?? 0)
	}));
}

/** 板块帖子列表 */
export async function listPostsByForum(db: Db, forumId: string, limit = 30) {
	const rows = await db
		.select({
			post: posts,
			author: users,
			commentCount: sql<number>`count(distinct ${comments.id})`,
			likeCount: sql<number>`count(distinct case when ${likes.targetType} = 'post' then ${likes.id} end)`
		})
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.leftJoin(comments, eq(comments.postId, posts.id))
		.leftJoin(likes, eq(likes.targetId, posts.id))
		.where(eq(posts.forumId, forumId))
		.groupBy(posts.id)
		.orderBy(desc(posts.isPinned), desc(posts.createdAt))
		.limit(limit);

	return rows.map((r) => ({
		post: r.post,
		author: r.author,
		commentCount: Number(r.commentCount ?? 0),
		likeCount: Number(r.likeCount ?? 0)
	}));
}

/** 帖子详情（含作者、板块） */
export async function getPostDetail(db: Db, postId: string) {
	const row = await db
		.select({ post: posts, author: users, forum: forums })
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.innerJoin(forums, eq(posts.forumId, forums.id))
		.where(eq(posts.id, postId))
		.get();

	if (!row) return null;
	return { post: row.post, author: row.author, forum: row.forum };
}

export async function incrementPostViews(db: Db, postId: string) {
	await db
		.update(posts)
		.set({ views: sql`${posts.views} + 1` })
		.where(eq(posts.id, postId));
}

// ---------- 回复 ----------

export type CommentWithAuthor = {
	comment: typeof comments.$inferSelect;
	author: typeof users.$inferSelect;
	likeCount: number;
};

export async function listComments(db: Db, postId: string) {
	const rows = await db
		.select({
			comment: comments,
			author: users,
			likeCount: sql<number>`count(${likes.id})`
		})
		.from(comments)
		.innerJoin(users, eq(comments.authorId, users.id))
		.leftJoin(likes, eq(likes.targetId, comments.id))
		.where(eq(comments.postId, postId))
		.groupBy(comments.id)
		.orderBy(comments.createdAt);

	return rows.map((r) => ({
		comment: r.comment,
		author: r.author,
		likeCount: Number(r.likeCount ?? 0)
	}));
}

// ---------- 点赞 ----------

export async function toggleLike(
	db: Db,
	userId: string,
	targetType: 'post' | 'comment',
	targetId: string
) {
	const existing = await db
		.select({ id: likes.id })
		.from(likes)
		.where(
			sql`${likes.userId} = ${userId} AND ${likes.targetType} = ${targetType} AND ${likes.targetId} = ${targetId}`
		)
		.get();

	if (existing) {
		await db.delete(likes).where(eq(likes.id, existing.id));
		return false; // 已取消点赞
	}
	await db.insert(likes).values({ userId, targetType, targetId });
	return true; // 已点赞
}

// ---------- 计数 ----------

export async function countAll(db: Db, table: typeof posts | typeof forums | typeof users) {
	const result = await db.select({ n: count() }).from(table);
	return result[0]?.n ?? 0;
}
