import { desc, eq, sql, count, and, like, or, inArray, type SQL } from 'drizzle-orm';
import type { Db } from './auth';
import {
	comments,
	favorites,
	forums,
	likes,
	notifications,
	posts,
	teacherLikes,
	teachers,
	users,
	works
} from './db/schema';

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

/** 帖子列表核心查询（含作者、回复数、点赞数） */
function postListQuery(db: Db, where: SQL | undefined) {
	return db
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
		.where(where)
		.groupBy(posts.id)
		.orderBy(desc(posts.isPinned), desc(posts.createdAt));
}

type PostListRow = {
	post: typeof posts.$inferSelect;
	author: typeof users.$inferSelect;
	commentCount: number;
	likeCount: number;
};

function mapPostRows(rows: PostListRow[]) {
	return rows.map((r) => ({
		post: r.post,
		author: r.author,
		commentCount: Number(r.commentCount ?? 0),
		likeCount: Number(r.likeCount ?? 0)
	}));
}

/** 首页帖子流：最新帖子（含作者、回复数、点赞数），支持分页 */
export async function listLatestPosts(db: Db, offset = 0, limit = 20) {
	const rows = await postListQuery(db, eq(posts.isDeleted, false)).limit(limit).offset(offset);
	return mapPostRows(rows);
}

/** 板块帖子列表，支持分页 */
export async function listPostsByForum(db: Db, forumId: string, offset = 0, limit = 20) {
	const rows = await postListQuery(db, and(eq(posts.forumId, forumId), eq(posts.isDeleted, false)))
		.limit(limit)
		.offset(offset);
	return mapPostRows(rows);
}

/** 某用户发布的帖子（公开主页用），支持分页 */
export async function listPostsByAuthor(db: Db, authorId: string, offset = 0, limit = 20) {
	const rows = await postListQuery(
		db,
		and(eq(posts.authorId, authorId), eq(posts.isDeleted, false))
	)
		.limit(limit)
		.offset(offset);
	return mapPostRows(rows);
}

/** 帖子总数（分页用） */
export async function countPosts(db: Db, forumId?: string) {
	const where = forumId
		? and(eq(posts.forumId, forumId), eq(posts.isDeleted, false))
		: eq(posts.isDeleted, false);
	const result = await db.select({ n: count() }).from(posts).where(where);
	return result[0]?.n ?? 0;
}

/** 热门帖子：浏览量 + 回复×3 + 点赞×5 加权热度排序 */
export async function listHotPosts(db: Db, limit = 10) {
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
		.where(eq(posts.isDeleted, false))
		.groupBy(posts.id)
		.orderBy(
			desc(
				sql`${posts.views} + count(distinct ${comments.id}) * 3 + count(distinct case when ${likes.targetType} = 'post' then ${likes.id} end) * 5`
			)
		)
		.limit(limit);
	return mapPostRows(rows);
}

/** 搜索帖子（标题 + 内容 LIKE），支持分页 */
export async function searchPosts(db: Db, keyword: string, offset = 0, limit = 20) {
	const pattern = `%${keyword}%`;
	const rows = await postListQuery(
		db,
		and(eq(posts.isDeleted, false), or(like(posts.title, pattern), like(posts.content, pattern)))
	)
		.limit(limit)
		.offset(offset);
	return mapPostRows(rows);
}

export async function countSearchPosts(db: Db, keyword: string) {
	const pattern = `%${keyword}%`;
	const result = await db
		.select({ n: count() })
		.from(posts)
		.where(
			and(eq(posts.isDeleted, false), or(like(posts.title, pattern), like(posts.content, pattern)))
		);
	return result[0]?.n ?? 0;
}

/** 帖子详情（含作者、板块），排除已删除 */
export async function getPostDetail(db: Db, postId: string) {
	const row = await db
		.select({ post: posts, author: users, forum: forums })
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.innerJoin(forums, eq(posts.forumId, forums.id))
		.where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
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

// ---------- 收藏 ----------

export async function isPostFavorited(db: Db, userId: string, postId: string) {
	const row = await db
		.select({ id: favorites.id })
		.from(favorites)
		.where(and(eq(favorites.userId, userId), eq(favorites.postId, postId)))
		.get();
	return Boolean(row);
}

/** 收藏 / 取消收藏；返回是否已收藏 */
export async function toggleFavorite(db: Db, userId: string, postId: string) {
	const existing = await db
		.select({ id: favorites.id })
		.from(favorites)
		.where(and(eq(favorites.userId, userId), eq(favorites.postId, postId)))
		.get();

	if (existing) {
		await db.delete(favorites).where(eq(favorites.id, existing.id));
		return false;
	}
	await db.insert(favorites).values({ userId, postId });
	return true;
}

/** 查询用户收藏的帖子列表 */
export async function listUserFavorites(db: Db, userId: string, limit = 30) {
	const rows = await db
		.select({
			post: posts,
			author: users,
			forum: forums,
			commentCount: sql<number>`count(distinct ${comments.id})`,
			likeCount: sql<number>`count(distinct case when ${likes.targetType} = 'post' then ${likes.id} end)`
		})
		.from(favorites)
		.innerJoin(posts, eq(favorites.postId, posts.id))
		.innerJoin(users, eq(posts.authorId, users.id))
		.innerJoin(forums, eq(posts.forumId, forums.id))
		.leftJoin(comments, eq(comments.postId, posts.id))
		.leftJoin(likes, eq(likes.targetId, posts.id))
		.where(and(eq(favorites.userId, userId), eq(posts.isDeleted, false)))
		.groupBy(posts.id)
		.orderBy(desc(favorites.createdAt))
		.limit(limit);

	return rows.map((r) => ({
		post: r.post,
		author: r.author,
		forum: r.forum,
		commentCount: Number(r.commentCount ?? 0),
		likeCount: Number(r.likeCount ?? 0)
	}));
}

// ---------- 作品集 ----------

export type WorkWithAuthor = {
	work: typeof works.$inferSelect;
	author: typeof users.$inferSelect;
};

export async function listWorks(db: Db, limit = 50) {
	const rows = await db
		.select({ work: works, author: users })
		.from(works)
		.innerJoin(users, eq(works.authorId, users.id))
		.orderBy(desc(works.createdAt))
		.limit(limit);

	return rows.map((r) => ({ work: r.work, author: r.author }));
}

export async function listUserWorks(db: Db, authorId: string, limit = 50) {
	const rows = await db
		.select({ work: works, author: users })
		.from(works)
		.innerJoin(users, eq(works.authorId, users.id))
		.where(eq(works.authorId, authorId))
		.orderBy(desc(works.createdAt))
		.limit(limit);

	return rows.map((r) => ({ work: r.work, author: r.author }));
}

export async function getWorkDetail(db: Db, workId: string) {
	const row = await db
		.select({ work: works, author: users })
		.from(works)
		.innerJoin(users, eq(works.authorId, users.id))
		.where(eq(works.id, workId))
		.get();
	if (!row) return null;
	return { work: row.work, author: row.author };
}

export async function incrementWorkViews(db: Db, workId: string) {
	await db
		.update(works)
		.set({ views: sql`${works.views} + 1` })
		.where(eq(works.id, workId));
}

// ---------- 通知 ----------

export async function createNotification(
	db: Db,
	input: {
		userId: string;
		actorId?: string;
		type: 'reply' | 'like' | 'favorite' | 'system';
		content: string;
		refId?: string;
	}
) {
	await db.insert(notifications).values({
		userId: input.userId,
		actorId: input.actorId ?? '',
		type: input.type,
		content: input.content,
		refId: input.refId ?? ''
	});
}

export async function listNotifications(db: Db, userId: string, limit = 30) {
	return db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, userId))
		.orderBy(desc(notifications.createdAt))
		.limit(limit);
}

export async function countUnreadNotifications(db: Db, userId: string) {
	const result = await db
		.select({ n: count() })
		.from(notifications)
		.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
	return result[0]?.n ?? 0;
}

export async function markNotificationsRead(db: Db, userId: string) {
	await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ---------- 积分排行榜 ----------

export type LeaderboardRow = {
	user: typeof users.$inferSelect;
	postCount: number;
};

export async function listLeaderboard(db: Db, limit = 50) {
	const rows = await db
		.select({
			user: users,
			postCount: sql<number>`count(distinct case when ${posts.isDeleted} = false then ${posts.id} end)`
		})
		.from(users)
		.leftJoin(posts, eq(posts.authorId, users.id))
		.groupBy(users.id)
		.orderBy(desc(users.points), desc(users.createdAt))
		.limit(limit);

	return rows.map((r) => ({
		user: r.user,
		postCount: Number(r.postCount ?? 0)
	}));
}

/** 当前用户在全站积分榜中的排名 */
export async function getUserRank(db: Db, userId: string) {
	const me = await db
		.select({ points: users.points })
		.from(users)
		.where(eq(users.id, userId))
		.get();
	if (!me) return null;
	const ahead = await db
		.select({ n: count() })
		.from(users)
		.where(sql`${users.points} > ${me.points}`);
	return (ahead[0]?.n ?? 0) + 1;
}

// ---------- 管理后台 ----------

/** 管理后台：全部帖子（含已删除，可关键词筛选） */
export async function listAllPostsAdmin(db: Db, keyword = '', limit = 50) {
	const base = db
		.select({
			post: posts,
			author: users,
			forum: forums,
			commentCount: sql<number>`count(distinct ${comments.id})`
		})
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.innerJoin(forums, eq(posts.forumId, forums.id))
		.leftJoin(comments, eq(comments.postId, posts.id));

	const rows = keyword
		? await base
				.where(like(posts.title, `%${keyword}%`))
				.groupBy(posts.id)
				.orderBy(desc(posts.createdAt))
				.limit(limit)
		: await base.groupBy(posts.id).orderBy(desc(posts.createdAt)).limit(limit);

	return rows.map((r) => ({
		post: r.post,
		author: r.author,
		forum: r.forum,
		commentCount: Number(r.commentCount ?? 0)
	}));
}

/** 管理后台：全部用户（含被封禁） */
export async function listUsersAdmin(db: Db, limit = 100) {
	return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
}

export async function setPostPinned(db: Db, postId: string, pinned: boolean) {
	await db.update(posts).set({ isPinned: pinned }).where(eq(posts.id, postId));
}

export async function setPostLocked(db: Db, postId: string, locked: boolean) {
	await db.update(posts).set({ isLocked: locked }).where(eq(posts.id, postId));
}

/** 软删除帖子（列表/详情自动隐藏） */
export async function softDeletePost(db: Db, postId: string) {
	await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, postId));
}

/** 恢复被删帖子 */
export async function restorePost(db: Db, postId: string) {
	await db.update(posts).set({ isDeleted: false }).where(eq(posts.id, postId));
}

export async function setUserBanned(db: Db, userId: string, banned: boolean) {
	await db.update(users).set({ isBanned: banned }).where(eq(users.id, userId));
}

export async function setUserRole(db: Db, userId: string, role: 'user' | 'admin') {
	await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ---------- 用户 ----------

export async function getUserById(db: Db, userId: string) {
	return db.select().from(users).where(eq(users.id, userId)).get();
}

export async function getUserByUsername(db: Db, username: string) {
	return db.select().from(users).where(eq(users.username, username)).get();
}

/** 个人主页：资料 + 统计（帖子数/作品数/评论数） */
export async function getUserProfile(db: Db, userId: string) {
	const user = await db.select().from(users).where(eq(users.id, userId)).get();
	if (!user) return null;

	const postCount = await db
		.select({ n: count() })
		.from(posts)
		.where(and(eq(posts.authorId, userId), eq(posts.isDeleted, false)));
	const workCount = await db.select({ n: count() }).from(works).where(eq(works.authorId, userId));
	const commentCount = await db
		.select({ n: count() })
		.from(comments)
		.where(eq(comments.authorId, userId));

	return {
		user,
		postCount: postCount[0]?.n ?? 0,
		workCount: workCount[0]?.n ?? 0,
		commentCount: commentCount[0]?.n ?? 0
	};
}

// ---------- 老师评分排行榜 ----------

/** 老师排行榜：仅已审核通过，按点赞数降序，支持分页 */
export async function listTeachers(db: Db, offset = 0, limit = 20) {
	return db
		.select()
		.from(teachers)
		.where(eq(teachers.status, 'approved'))
		.orderBy(desc(teachers.likes), teachers.createdAt)
		.limit(limit)
		.offset(offset);
}

export async function countApprovedTeachers(db: Db) {
	const result = await db
		.select({ n: count() })
		.from(teachers)
		.where(eq(teachers.status, 'approved'));
	return result[0]?.n ?? 0;
}

export async function getTeacher(db: Db, teacherId: string) {
	return db.select().from(teachers).where(eq(teachers.id, teacherId)).get();
}

/** 提交老师（进入待审核） */
export async function createTeacher(
	db: Db,
	input: { name: string; avatar: string; description: string; createdBy: string }
) {
	const result = await db
		.insert(teachers)
		.values({
			name: input.name,
			avatar: input.avatar,
			description: input.description,
			createdBy: input.createdBy,
			status: 'pending'
		})
		.returning({ id: teachers.id });
	return result[0]?.id ?? '';
}

/** 管理后台：待审核老师列表（含上传者） */
export async function listPendingTeachers(db: Db, limit = 100) {
	const rows = await db
		.select({ teacher: teachers, submitter: users })
		.from(teachers)
		.innerJoin(users, eq(teachers.createdBy, users.id))
		.where(eq(teachers.status, 'pending'))
		.orderBy(teachers.createdAt)
		.limit(limit);
	return rows.map((r) => ({ teacher: r.teacher, submitter: r.submitter }));
}

export async function setTeacherStatus(db: Db, teacherId: string, status: 'approved' | 'rejected') {
	await db.update(teachers).set({ status }).where(eq(teachers.id, teacherId));
}

/** 老师点赞/取消点赞；每人对每位老师一次；返回 { liked, likes } */
export async function toggleTeacherLike(db: Db, userId: string, teacherId: string) {
	const existing = await db
		.select({ id: teacherLikes.id })
		.from(teacherLikes)
		.where(and(eq(teacherLikes.userId, userId), eq(teacherLikes.teacherId, teacherId)))
		.get();

	if (existing) {
		await db.delete(teacherLikes).where(eq(teacherLikes.id, existing.id));
		await db
			.update(teachers)
			.set({ likes: sql`${teachers.likes} - 1` })
			.where(eq(teachers.id, teacherId));
		return { liked: false };
	}

	await db.insert(teacherLikes).values({ userId, teacherId });
	await db
		.update(teachers)
		.set({ likes: sql`${teachers.likes} + 1` })
		.where(eq(teachers.id, teacherId));
	return { liked: true };
}

/** 当前用户已点赞的老师 id 集合 */
export async function likedTeacherIds(db: Db, userId: string, teacherIds: string[]) {
	if (teacherIds.length === 0) return new Set<string>();
	const rows = await db
		.select({ teacherId: teacherLikes.teacherId })
		.from(teacherLikes)
		.where(and(eq(teacherLikes.userId, userId), inArray(teacherLikes.teacherId, teacherIds)));
	return new Set(rows.map((r) => r.teacherId));
}
