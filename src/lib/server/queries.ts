import { desc, eq, sql, count, and, like, or, inArray, type SQL } from 'drizzle-orm';
import type { Db } from './auth';
import {
	comments,
	favorites,
	festivalSignIns,
	forums,
	graffitis,
	items,
	likes,
	notifications,
	pointLogs,
	posts,
	teacherLikes,
	teachers,
	users,
	works
} from './db/schema';
import { FLOWER_TYPES, type FlowerType } from '#lib/flowers';
import { todayStr } from './points';

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

/** 该用户对某目标是否已获得过某类积分（点赞/收藏防重复刷分） */
export async function hasPointsFor(
	db: Db,
	userId: string,
	reason: 'like' | 'favorite',
	refId: string
) {
	const row = await db
		.select({ id: pointLogs.id })
		.from(pointLogs)
		.where(
			and(eq(pointLogs.userId, userId), eq(pointLogs.reason, reason), eq(pointLogs.refId, refId))
		)
		.get();
	return Boolean(row);
}

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

/** 某用户今天对某老师的点赞记录（含已取消），无则 null */
export async function getTeacherLikeToday(db: Db, userId: string, teacherId: string) {
	return db
		.select({ id: teacherLikes.id, cancelled: teacherLikes.cancelled })
		.from(teacherLikes)
		.where(
			and(
				eq(teacherLikes.userId, userId),
				eq(teacherLikes.teacherId, teacherId),
				eq(teacherLikes.day, todayStr())
			)
		)
		.get();
}

/** 给老师点赞（每位老师每天最多 1 次；取消后当天不能再点） */
export async function likeTeacher(db: Db, userId: string, teacherId: string) {
	const existing = await getTeacherLikeToday(db, userId, teacherId);
	if (existing) {
		return { ok: false, error: '今天已经赞过这位老师啦，明天再来吧' };
	}
	await db.insert(teacherLikes).values({ userId, teacherId, day: todayStr(), cancelled: 0 });
	await db
		.update(teachers)
		.set({ likes: sql`${teachers.likes} + 1` })
		.where(eq(teachers.id, teacherId));
	return { ok: true, liked: true };
}

/** 取消今天对老师的点赞（仅当天有效；取消后当天不可再点） */
export async function cancelTeacherLike(db: Db, userId: string, teacherId: string) {
	const existing = await getTeacherLikeToday(db, userId, teacherId);
	if (!existing || existing.cancelled !== 0) {
		return { ok: false, error: '今天还没有给这位老师点赞' };
	}
	await db.update(teacherLikes).set({ cancelled: 1 }).where(eq(teacherLikes.id, existing.id));
	await db
		.update(teachers)
		.set({ likes: sql`${teachers.likes} - 1` })
		.where(eq(teachers.id, teacherId));
	return { ok: true, liked: false };
}

/** 当前用户今天已投过票（点赞或取消）的老师 id 集合 */
export async function likedTeacherIds(db: Db, userId: string, teacherIds: string[]) {
	if (teacherIds.length === 0) return new Set<string>();
	const rows = await db
		.select({ teacherId: teacherLikes.teacherId })
		.from(teacherLikes)
		.where(
			and(
				eq(teacherLikes.userId, userId),
				eq(teacherLikes.day, todayStr()),
				inArray(teacherLikes.teacherId, teacherIds)
			)
		);
	return new Set(rows.map((r) => r.teacherId));
}

// ---------- 道具 / 背包 ----------

/** 用户背包道具列表（按获得时间倒序） */
export async function listItems(db: Db, userId: string) {
	return db.select().from(items).where(eq(items.ownerId, userId)).orderBy(desc(items.createdAt));
}

export async function getItem(db: Db, itemId: string) {
	return db.select().from(items).where(eq(items.id, itemId)).get();
}

/** 发放道具（source：festival-signin 签到 / gift 赠送） */
export async function addItem(
	db: Db,
	userId: string,
	itemType: FlowerType,
	source: 'festival-signin' | 'gift'
) {
	await db.insert(items).values({ ownerId: userId, itemType, source });
}

/**
 * 赠送道具：道具必须属于当前用户；转移给目标用户并通知。
 * 返回 { ok, error? }。
 */
export async function giftItem(
	db: Db,
	itemId: string,
	fromUserId: string,
	toUser: typeof users.$inferSelect
) {
	const item = await getItem(db, itemId);
	if (!item || item.ownerId !== fromUserId) {
		return { ok: false, error: '道具不存在或不属于你' };
	}
	await db.update(items).set({ ownerId: toUser.id }).where(eq(items.id, itemId));
	return { ok: true };
}

/** 按类型赠送一株：从发送者该类型道具中取最早的一株转移给目标用户 */
export async function giftItemByType(
	db: Db,
	fromUserId: string,
	toUser: typeof users.$inferSelect,
	itemType: FlowerType
) {
	const row = await db
		.select({ id: items.id })
		.from(items)
		.where(and(eq(items.ownerId, fromUserId), eq(items.itemType, itemType)))
		.orderBy(items.createdAt)
		.limit(1)
		.get();
	if (!row) return { ok: false, error: '你没有这种道具' };
	await db.update(items).set({ ownerId: toUser.id }).where(eq(items.id, row.id));
	return { ok: true };
}

// ---------- 国庆签到活动 ----------

/** 某用户某天是否已领花 */
export async function festivalClaimedOn(db: Db, userId: string, date: string) {
	const row = await db
		.select({ itemType: festivalSignIns.itemType })
		.from(festivalSignIns)
		.where(and(eq(festivalSignIns.userId, userId), eq(festivalSignIns.signinDate, date)))
		.get();
	return row ? row.itemType : null;
}

/** 国庆领花：每天一次，随机三花之一；返回 { ok, error?, flower? } */
export async function claimFestivalFlower(db: Db, userId: string) {
	const date = todayStr();
	if (date < '2026-10-01' || date > '2026-10-07') {
		return { ok: false, error: '活动已结束或尚未开始' };
	}
	const claimed = await festivalClaimedOn(db, userId, date);
	if (claimed) return { ok: false, error: '今天已经领过啦，明天再来' };

	const picked = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)] as FlowerType;
	await db.insert(festivalSignIns).values({ userId, signinDate: date, itemType: picked });
	await addItem(db, userId, picked, 'festival-signin');
	return { ok: true, flower: picked };
}

/** 用户全部领花记录（按日期倒序） */
export async function listFestivalClaims(db: Db, userId: string, limit = 30) {
	return db
		.select()
		.from(festivalSignIns)
		.where(eq(festivalSignIns.userId, userId))
		.orderBy(desc(festivalSignIns.signinDate))
		.limit(limit);
}

// ---------- 涂鸦留言板 ----------

export type GraffitiWithAuthor = {
	graffiti: typeof graffitis.$inferSelect;
	author: typeof users.$inferSelect;
};

/** 涂鸦列表（含作者，按时间倒序） */
export async function listGraffiti(db: Db, limit = 40) {
	const rows = await db
		.select({ graffiti: graffitis, author: users })
		.from(graffitis)
		.innerJoin(users, eq(graffitis.authorId, users.id))
		.orderBy(desc(graffitis.createdAt))
		.limit(limit);
	return rows.map((r) => ({ graffiti: r.graffiti, author: r.author }));
}

export async function addGraffiti(db: Db, authorId: string, imageKey: string) {
	await db.insert(graffitis).values({ authorId, imageKey });
}

export async function getGraffiti(db: Db, graffitiId: string) {
	return db.select().from(graffitis).where(eq(graffitis.id, graffitiId)).get();
}

export async function deleteGraffiti(db: Db, graffitiId: string) {
	await db.delete(graffitis).where(eq(graffitis.id, graffitiId));
}

// ---------- 商店系统 ----------

export const SHOP_FLOWER_PRICE = 25; // 商店买花价格（积分）
export const BADGE_NATIONAL_KEY = 'badge:national'; // 合成称号（国庆快乐）
export const BADGE_ITEM_TYPE = BADGE_NATIONAL_KEY as FlowerType; // 合成称号在背包中的道具类型
export const BADGE_FLOWERS: FlowerType[] = [
	'flower:poppy',
	'flower:cornflower',
	'flower:dandelion'
];

/** 商店状态：积分、当前装备称号、背包称号数、三种花数量 */
export async function getShopStatus(db: Db, userId: string) {
	const user = await db
		.select({ points: users.points, badge: users.badge })
		.from(users)
		.where(eq(users.id, userId))
		.get();
	const rows = await db
		.select({ type: items.itemType })
		.from(items)
		.where(eq(items.ownerId, userId));
	const counts: Record<string, number> = {};
	let badgeCount = 0;
	for (const r of rows) {
		counts[r.type] = (counts[r.type] ?? 0) + 1;
		if (r.type.startsWith('badge:')) badgeCount += 1;
	}
	return {
		points: user?.points ?? 0,
		badge: user?.badge ?? null,
		badgeCount,
		counts
	};
}

/**
 * 合成称号道具：消耗虞美人+矢车菊+蒲公英 各1朵，称号【国庆快乐】入背包。
 * 若当前未装备任何称号，则自动装备；已装备时新称号放入背包待用（可送人）。
 */
export async function craftBadge(db: Db, userId: string) {
	const held: { type: FlowerType; id: string }[] = [];
	for (const t of BADGE_FLOWERS) {
		const row = await db
			.select({ id: items.id })
			.from(items)
			.where(and(eq(items.ownerId, userId), eq(items.itemType, t)))
			.orderBy(items.createdAt)
			.limit(1)
			.get();
		if (!row) return { ok: false, error: '材料不足' };
		held.push({ type: t, id: row.id });
	}
	// 消耗 3 朵花
	for (const h of held) {
		await db.delete(items).where(eq(items.id, h.id));
	}
	// 是否已装备称号（决定新道具是否自动穿戴）
	const user = await db
		.select({ badge: users.badge })
		.from(users)
		.where(eq(users.id, userId))
		.get();
	const equipped = !user?.badge;
	await db.insert(items).values({
		ownerId: userId,
		itemType: BADGE_ITEM_TYPE,
		source: 'craft',
		equipped
	});
	if (equipped) {
		await db.update(users).set({ badge: BADGE_NATIONAL_KEY }).where(eq(users.id, userId));
	}
	return { ok: true, badge: BADGE_NATIONAL_KEY, equipped };
}

/** 穿戴称号道具：卸下当前装备的称号，装备指定道具（users.badge 存称号 key） */
export async function equipBadge(db: Db, userId: string, itemId: string) {
	const item = await db
		.select({ itemType: items.itemType })
		.from(items)
		.where(
			and(
				eq(items.id, itemId),
				eq(items.ownerId, userId),
				sql`${items.itemType} LIKE 'badge:%'`,
				eq(items.equipped, false)
			)
		)
		.get();
	if (!item) return { ok: false, error: '称号道具不存在或不属于你，或已装备中' };
	await db.update(items).set({ equipped: false }).where(eq(items.ownerId, userId));
	await db.update(items).set({ equipped: true }).where(eq(items.id, itemId));
	await db.update(users).set({ badge: item.itemType }).where(eq(users.id, userId));
	return { ok: true, badge: item.itemType };
}

/** 脱下称号：称号道具仍在背包，仅取消装备 */
export async function unequipBadge(db: Db, userId: string) {
	const item = await db
		.select({ id: items.id })
		.from(items)
		.where(
			and(
				eq(items.ownerId, userId),
				sql`${items.itemType} LIKE 'badge:%'`,
				eq(items.equipped, true)
			)
		)
		.limit(1)
		.get();
	if (!item) return { ok: false, error: '当前没有装备称号' };
	await db.update(items).set({ equipped: false }).where(eq(items.id, item.id));
	await db.update(users).set({ badge: null }).where(eq(users.id, userId));
	return { ok: true };
}

/** 赠送称号道具：转移给目标用户；若发送者正装备着它则自动脱下 */
export async function giftBadgeItem(
	db: Db,
	itemId: string,
	fromUserId: string,
	toUser: typeof users.$inferSelect
) {
	const item = await db
		.select()
		.from(items)
		.where(
			and(
				eq(items.id, itemId),
				eq(items.ownerId, fromUserId),
				sql`${items.itemType} LIKE 'badge:%'`
			)
		)
		.get();
	if (!item) return { ok: false, error: '称号道具不存在或不属于你' };
	await db.update(items).set({ ownerId: toUser.id, equipped: false }).where(eq(items.id, itemId));
	if (item.equipped) {
		await db.update(users).set({ badge: null }).where(eq(users.id, fromUserId));
	}
	return { ok: true };
}

/** 积分买花：25 积分换一朵指定花 */
export async function buyFlower(db: Db, userId: string, itemType: FlowerType) {
	const user = await db
		.select({ points: users.points })
		.from(users)
		.where(eq(users.id, userId))
		.get();
	const points = user?.points ?? 0;
	if (points < SHOP_FLOWER_PRICE) {
		return { ok: false, error: `积分不足，需要 ${SHOP_FLOWER_PRICE} 积分（当前 ${points}）` };
	}
	await db
		.update(users)
		.set({ points: sql`${users.points} - ${SHOP_FLOWER_PRICE}` })
		.where(eq(users.id, userId));
	await db
		.insert(pointLogs)
		.values({ userId, change: -SHOP_FLOWER_PRICE, reason: 'shop', refId: itemType });
	await db.insert(items).values({ ownerId: userId, itemType, source: 'shop' });
	return { ok: true, points: points - SHOP_FLOWER_PRICE };
}

/** 管理员取物栏：向自己背包发放任意物品（不检查数量上限，无限领取） */
export async function adminTakeItem(db: Db, userId: string, itemType: string) {
	await db.insert(items).values({
		ownerId: userId,
		itemType: itemType as (typeof items.$inferInsert)['itemType'],
		source: 'admin'
	});
	return { ok: true };
}

// ---------- 改名卡 ----------

export const NAME_CARD_PRICE = 20; // 改名卡价格（积分）

/** 商店购买改名卡：20 积分换一张，入背包 */
export async function buyNameCard(db: Db, userId: string) {
	const user = await db
		.select({ points: users.points })
		.from(users)
		.where(eq(users.id, userId))
		.get();
	const points = user?.points ?? 0;
	if (points < NAME_CARD_PRICE) {
		return { ok: false, error: `积分不足，需要 ${NAME_CARD_PRICE} 积分（当前 ${points}）` };
	}
	await db
		.update(users)
		.set({ points: sql`${users.points} - ${NAME_CARD_PRICE}` })
		.where(eq(users.id, userId));
	await db
		.insert(pointLogs)
		.values({ userId, change: -NAME_CARD_PRICE, reason: 'shop', refId: 'item:namecard' });
	await db.insert(items).values({ ownerId: userId, itemType: 'item:namecard', source: 'shop' });
	return { ok: true, points: points - NAME_CARD_PRICE };
}

/** 使用改名卡改名：校验唯一性 → 消耗 1 张卡 → 更新用户名 */
export async function changeUsername(db: Db, userId: string, newUsername: string) {
	// 用户名唯一性（排除自己）
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.username, newUsername), sql`${users.id} != ${userId}`))
		.get();
	if (existing) return { ok: false, error: '该用户名已被使用' };

	// 消耗 1 张改名卡（取最早的一张）
	const card = await db
		.select({ id: items.id })
		.from(items)
		.where(and(eq(items.ownerId, userId), eq(items.itemType, 'item:namecard')))
		.orderBy(items.createdAt)
		.limit(1)
		.get();
	if (!card) return { ok: false, error: '背包里没有改名卡' };

	await db.delete(items).where(eq(items.id, card.id));
	await db.update(users).set({ username: newUsername }).where(eq(users.id, userId));
	return { ok: true };
}
