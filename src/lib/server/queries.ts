import { desc, eq, sql, count, and, like, or, inArray, type SQL } from 'drizzle-orm';
import type { Db } from './auth';
import {
	achievements,
	announcements,
	comments,
	favorites,
	festivalSignIns,
	follows,
	forums,
	graffitis,
	items,
	likes,
	messages,
	notifications,
	pointLogs,
	pollVotes,
	posts,
	reports,
	signIns,
	teacherLikes,
	teachers,
	userAchievements,
	users,
	works,
	gameMaps,
	gameTiles,
	gameResources,
	gameChats,
	gameExchanges,
	gameSteals
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
		type: 'reply' | 'like' | 'favorite' | 'system' | 'mention' | 'gift' | 'follow';
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
	source: 'festival-signin' | 'gift' | 'game'
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

// ---------- 投票帖（A3） ----------

export type PollResult = {
	options: { index: number; label: string; votes: number }[];
	total: number;
	myChoice: number | null; // 我投的选项下标；未投为 null
};

/** 帖子投票统计 + 我的选择（一次查全部） */
export async function getPollResult(
	db: Db,
	postId: string,
	userId: string | null
): Promise<PollResult | null> {
	const post = await db
		.select({ pollOptions: posts.pollOptions })
		.from(posts)
		.where(eq(posts.id, postId))
		.get();
	if (!post?.pollOptions) return null;
	let options: string[];
	try {
		options = JSON.parse(post.pollOptions);
	} catch {
		options = [];
	}
	if (!Array.isArray(options) || options.length === 0) return null;

	const votes = await db
		.select({ optionId: pollVotes.optionId, n: count() })
		.from(pollVotes)
		.where(eq(pollVotes.postId, postId))
		.groupBy(pollVotes.optionId);

	const counts: Record<string, number> = {};
	let total = 0;
	for (const v of votes) {
		counts[v.optionId] = Number(v.n ?? 0);
		total += Number(v.n ?? 0);
	}

	let myChoice: number | null = null;
	if (userId) {
		const mine = await db
			.select({ optionId: pollVotes.optionId })
			.from(pollVotes)
			.where(and(eq(pollVotes.postId, postId), eq(pollVotes.userId, userId)))
			.get();
		if (mine) myChoice = Number(mine.optionId);
	}

	return {
		options: options.map((label, i) => ({ index: i, label, votes: counts[String(i)] ?? 0 })),
		total,
		myChoice
	};
}

/** 投票：每帖每用户一票（可改票）；返回 { ok, error?, choice? } */
export async function castPollVote(db: Db, postId: string, userId: string, optionIndex: number) {
	const post = await db
		.select({ pollOptions: posts.pollOptions })
		.from(posts)
		.where(eq(posts.id, postId))
		.get();
	if (!post?.pollOptions) return { ok: false, error: '该帖不是投票帖' };
	let options: string[];
	try {
		options = JSON.parse(post.pollOptions);
	} catch {
		options = [];
	}
	if (!Array.isArray(options) || optionIndex < 0 || optionIndex >= options.length) {
		return { ok: false, error: '选项无效' };
	}
	const existing = await db
		.select({ id: pollVotes.id })
		.from(pollVotes)
		.where(and(eq(pollVotes.postId, postId), eq(pollVotes.userId, userId)))
		.get();
	if (existing) {
		await db
			.update(pollVotes)
			.set({ optionId: String(optionIndex) })
			.where(eq(pollVotes.id, existing.id));
	} else {
		await db.insert(pollVotes).values({ postId, userId, optionId: String(optionIndex) });
	}
	return { ok: true, choice: optionIndex };
}

// ---------- 关注（C1） ----------

export async function isFollowing(db: Db, followerId: string, followingId: string) {
	const row = await db
		.select({ id: follows.id })
		.from(follows)
		.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
		.get();
	return Boolean(row);
}

export async function followUser(db: Db, followerId: string, followingId: string) {
	if (followerId === followingId) return { ok: false, error: '不能关注自己' };
	const row = await db
		.select({ id: follows.id })
		.from(follows)
		.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
		.get();
	if (row) return { ok: false, error: '已经关注了这位吧友' };
	await db.insert(follows).values({ followerId, followingId });
	return { ok: true };
}

export async function unfollowUser(db: Db, followerId: string, followingId: string) {
	const row = await db
		.select({ id: follows.id })
		.from(follows)
		.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
		.get();
	if (!row) return { ok: false, error: '还没有关注这位吧友' };
	await db.delete(follows).where(eq(follows.id, row.id));
	return { ok: true };
}

export async function countFollows(db: Db, userId: string) {
	const following = await db
		.select({ n: count() })
		.from(follows)
		.where(eq(follows.followerId, userId));
	const followers = await db
		.select({ n: count() })
		.from(follows)
		.where(eq(follows.followingId, userId));
	return { following: following[0]?.n ?? 0, followers: followers[0]?.n ?? 0 };
}

/** 我关注的用户列表 */
export async function listFollowing(db: Db, userId: string, limit = 100) {
	const rows = await db
		.select({ user: users })
		.from(follows)
		.innerJoin(users, eq(follows.followingId, users.id))
		.where(eq(follows.followerId, userId))
		.orderBy(desc(follows.createdAt))
		.limit(limit);
	return rows.map((r) => r.user);
}

/** 关注我的人列表 */
export async function listFollowers(db: Db, userId: string, limit = 100) {
	const rows = await db
		.select({ user: users })
		.from(follows)
		.innerJoin(users, eq(follows.followerId, users.id))
		.where(eq(follows.followingId, userId))
		.orderBy(desc(follows.createdAt))
		.limit(limit);
	return rows.map((r) => r.user);
}

// ---------- 私信（C1） ----------

export type Conversation = {
	other: typeof users.$inferSelect;
	lastMessage: typeof messages.$inferSelect | null;
	unread: number;
};

export async function sendMessage(db: Db, senderId: string, receiverId: string, content: string) {
	if (senderId === receiverId) return { ok: false, error: '不能给自己发私信' };
	if (!content.trim()) return { ok: false, error: '私信内容不能为空' };
	if (content.length > 2000) return { ok: false, error: '私信过长（最多 2000 字）' };
	await db.insert(messages).values({ senderId, receiverId, content });
	return { ok: true };
}

/** 会话列表：与每个私聊对象的最近一条消息 + 未读数 */
export async function listConversations(db: Db, userId: string): Promise<Conversation[]> {
	const sent = await db
		.selectDistinct({ peerId: messages.receiverId })
		.from(messages)
		.where(eq(messages.senderId, userId));
	const received = await db
		.selectDistinct({ peerId: messages.senderId })
		.from(messages)
		.where(eq(messages.receiverId, userId));
	const peerIds = new Set<string>();
	for (const r of sent) if (r.peerId) peerIds.add(r.peerId);
	for (const r of received) if (r.peerId) peerIds.add(r.peerId);

	const out: Conversation[] = [];
	for (const pid of peerIds) {
		const other = await db.select().from(users).where(eq(users.id, pid)).get();
		if (!other) continue;
		const last = await db
			.select()
			.from(messages)
			.where(
				or(
					and(eq(messages.senderId, userId), eq(messages.receiverId, pid)),
					and(eq(messages.senderId, pid), eq(messages.receiverId, userId))
				)
			)
			.orderBy(desc(messages.createdAt))
			.limit(1)
			.get();
		const unreadRow = await db
			.select({ n: count() })
			.from(messages)
			.where(
				and(eq(messages.receiverId, userId), eq(messages.senderId, pid), eq(messages.isRead, false))
			);
		out.push({ other, lastMessage: last ?? null, unread: unreadRow[0]?.n ?? 0 });
	}
	out.sort((a, b) => {
		const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
		const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
		return bt - at;
	});
	return out;
}

/** 两人之间的全部消息（按时间正序），并将发给我的标记已读 */
export async function listMessagesBetween(db: Db, userId: string, peerId: string) {
	const rows = await db
		.select()
		.from(messages)
		.where(
			or(
				and(eq(messages.senderId, userId), eq(messages.receiverId, peerId)),
				and(eq(messages.senderId, peerId), eq(messages.receiverId, userId))
			)
		)
		.orderBy(messages.createdAt);
	await db
		.update(messages)
		.set({ isRead: true })
		.where(
			and(
				eq(messages.receiverId, userId),
				eq(messages.senderId, peerId),
				eq(messages.isRead, false)
			)
		);
	return rows;
}

export async function countUnreadMessages(db: Db, userId: string) {
	const result = await db
		.select({ n: count() })
		.from(messages)
		.where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
	return result[0]?.n ?? 0;
}

// ---------- 成就（B3） ----------

/** 成就条件检查并发放：对指定用户扫描所有未获得的成就，满足即发放。返回新获得成就 key 列表 */
export async function checkAchievements(db: Db, userId: string): Promise<string[]> {
	const user = await db.select().from(users).where(eq(users.id, userId)).get();
	if (!user) return [];

	const all = await db.select().from(achievements);
	const owned = await db
		.select({ achievementId: userAchievements.achievementId })
		.from(userAchievements)
		.where(eq(userAchievements.userId, userId));
	const ownedIds = new Set(owned.map((o) => o.achievementId));
	const pending = all.filter((a) => !ownedIds.has(a.id));
	if (pending.length === 0) return [];

	const postCount =
		(
			await db
				.select({ n: count() })
				.from(posts)
				.where(and(eq(posts.authorId, userId), eq(posts.isDeleted, false)))
		)[0]?.n ?? 0;
	const commentCount =
		(await db.select({ n: count() }).from(comments).where(eq(comments.authorId, userId)))[0]?.n ??
		0;
	const signinCount =
		(await db.select({ n: count() }).from(signIns).where(eq(signIns.userId, userId)))[0]?.n ?? 0;
	const receivedLikes =
		(
			await db
				.select({ n: count() })
				.from(likes)
				.innerJoin(posts, and(eq(likes.targetType, 'post'), eq(likes.targetId, posts.id)))
				.where(eq(posts.authorId, userId))
		)[0]?.n ?? 0;
	const workCount =
		(await db.select({ n: count() }).from(works).where(eq(works.authorId, userId)))[0]?.n ?? 0;
	const itemRows = await db
		.select({ itemType: items.itemType })
		.from(items)
		.where(eq(items.ownerId, userId));
	const hasBadge = itemRows.some((r) => r.itemType.startsWith('badge:'));
	const flowerTypes = new Set<string>(
		itemRows.map((r) => r.itemType).filter((t) => t.startsWith('flower:'))
	);
	const hasAllFlowers = ['flower:poppy', 'flower:cornflower', 'flower:dandelion'].every((t) =>
		flowerTypes.has(t)
	);
	const followCount =
		(await db.select({ n: count() }).from(follows).where(eq(follows.followerId, userId)))[0]?.n ??
		0;
	const receivedMessages =
		(await db.select({ n: count() }).from(messages).where(eq(messages.receiverId, userId)))[0]?.n ??
		0;

	const gained: string[] = [];
	for (const a of pending) {
		let hit = false;
		switch (a.key) {
			case 'first-post':
				hit = postCount >= 1;
				break;
			case 'first-comment':
				hit = commentCount >= 1;
				break;
			case 'signin-7':
				hit = signinCount >= 7;
				break;
			case 'like-100':
				hit = receivedLikes >= 100;
				break;
			case 'work-first':
				hit = workCount >= 1;
				break;
			case 'badge-owner':
				hit = hasBadge;
				break;
			case 'flower-collector':
				hit = hasAllFlowers;
				break;
			case 'point-500':
				hit = user.points >= 500;
				break;
			case 'follow-10':
				hit = followCount >= 10;
				break;
			case 'message-first':
				hit = receivedMessages >= 1;
				break;
		}
		if (hit) {
			await db.insert(userAchievements).values({ userId, achievementId: a.id });
			gained.push(a.key);
		}
	}
	return gained;
}

/** 用户已获得的成就（含展示信息） */
export async function listUserAchievements(db: Db, userId: string) {
	const rows = await db
		.select({ ua: userAchievements, ach: achievements })
		.from(userAchievements)
		.innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
		.where(eq(userAchievements.userId, userId))
		.orderBy(desc(userAchievements.createdAt));
	return rows.map((r) => r.ach);
}

// ---------- 举报（D1） ----------

export async function createReport(
	db: Db,
	input: { reporterId: string; targetType: 'post' | 'comment'; targetId: string; reason: string }
) {
	await db.insert(reports).values({
		reporterId: input.reporterId,
		targetType: input.targetType,
		targetId: input.targetId,
		reason: input.reason
	});
	return { ok: true };
}

/** 管理后台：待处理举报列表（含目标内容摘要） */
export async function listPendingReports(db: Db, limit = 100) {
	const rows = await db
		.select({ report: reports, reporter: users })
		.from(reports)
		.innerJoin(users, eq(reports.reporterId, users.id))
		.where(eq(reports.status, 'pending'))
		.orderBy(reports.createdAt)
		.limit(limit);

	const out: {
		report: typeof reports.$inferSelect;
		reporter: typeof users.$inferSelect;
		target: { type: string; title: string; content: string; authorName: string } | null;
	}[] = [];
	for (const r of rows) {
		let target: (typeof out)[number]['target'] = null;
		if (r.report.targetType === 'post') {
			const p = await db
				.select({ post: posts, author: users })
				.from(posts)
				.innerJoin(users, eq(posts.authorId, users.id))
				.where(eq(posts.id, r.report.targetId))
				.get();
			if (p) {
				target = {
					type: '帖子',
					title: p.post.title,
					content: p.post.content,
					authorName: p.author.username
				};
			}
		} else {
			const c = await db
				.select({ comment: comments, author: users })
				.from(comments)
				.innerJoin(users, eq(comments.authorId, users.id))
				.where(eq(comments.id, r.report.targetId))
				.get();
			if (c) {
				target = {
					type: '评论',
					title: '',
					content: c.comment.content,
					authorName: c.author.username
				};
			}
		}
		out.push({ report: r.report, reporter: r.reporter, target });
	}
	return out;
}

export async function setReportStatus(db: Db, reportId: string, status: 'resolved' | 'dismissed') {
	await db.update(reports).set({ status }).where(eq(reports.id, reportId));
}

// ---------- 公告（D2） ----------

export async function listActiveAnnouncements(db: Db, limit = 5) {
	return db
		.select({ announcement: announcements, author: users })
		.from(announcements)
		.innerJoin(users, eq(announcements.createdBy, users.id))
		.where(eq(announcements.isActive, true))
		.orderBy(desc(announcements.createdAt))
		.limit(limit);
}

export async function listAllAnnouncements(db: Db, limit = 100) {
	return db
		.select({ announcement: announcements, author: users })
		.from(announcements)
		.innerJoin(users, eq(announcements.createdBy, users.id))
		.orderBy(desc(announcements.createdAt))
		.limit(limit);
}

export async function createAnnouncement(
	db: Db,
	title: string,
	content: string,
	createdBy: string
) {
	await db.insert(announcements).values({ title, content, createdBy });
	return { ok: true };
}

export async function setAnnouncementActive(db: Db, announcementId: string, active: boolean) {
	await db
		.update(announcements)
		.set({ isActive: active })
		.where(eq(announcements.id, announcementId));
}

export async function deleteAnnouncement(db: Db, announcementId: string) {
	await db.delete(announcements).where(eq(announcements.id, announcementId));
}

// ---------- @提及（C3） ----------

const MENTION_RE = /@([\u4e00-\u9fa5A-Za-z0-9_]{2,20})/g;

/** 从文本中提取被 @ 的用户名（去重） */
export function extractMentions(content: string): string[] {
	const names = new Set<string>();
	const m = content.match(MENTION_RE);
	if (m) {
		for (const t of m) names.add(t.slice(1));
	}
	return [...names];
}

/** 为文本中被 @ 的用户创建「被提及」通知（跳过自己）；返回通知到的用户名列表 */
export async function notifyMentions(
	db: Db,
	content: string,
	actorId: string,
	refId: string
): Promise<string[]> {
	const names = extractMentions(content);
	const notified: string[] = [];
	for (const name of names) {
		const target = await db.select().from(users).where(eq(users.username, name)).get();
		if (!target || target.id === actorId) continue;
		await createNotification(db, {
			userId: target.id,
			actorId,
			type: 'mention',
			content: `${name}，有人提到了你`,
			refId
		});
		notified.push(name);
	}
	return notified;
}

// ---------- 游戏《交大工坊》 ----------

export const GAME_MAP_SIZE = 100; // 公共地图 100x100 网格（占地竞争）
export const GAME_BUILDINGS = {
	miner: {
		name: '⛏️ 矿机',
		color: '#8d7b5f',
		resource: 'iron',
		icon: '⛏',
		desc: '产出铁矿石',
		cost: 0
	},
	lumber: {
		name: '🪚 伐木场',
		color: '#7a5c33',
		resource: 'wood',
		icon: '🪚',
		desc: '产出木材',
		cost: 0
	},
	farm: {
		name: '🌾 农田',
		color: '#c9a227',
		resource: 'wheat',
		icon: '🌾',
		desc: '产出小麦',
		cost: 0
	},
	flower: {
		name: '🌸 花田',
		color: '#e05f9e',
		resource: 'flower',
		icon: '🌸',
		desc: '产出花朵点',
		cost: 0
	},
	lantern: {
		name: '🏯 路灯',
		color: '#d97706',
		resource: null,
		icon: '🏯',
		desc: '装饰物，无产出',
		cost: 0
	},
	campfire: {
		name: '🔥 炯火',
		color: '#ea580c',
		resource: null,
		icon: '🔥',
		desc: '装饰物，无产出',
		cost: 0
	}
} as const;
export type GameBuildingType = keyof typeof GAME_BUILDINGS;

// 收集产出：每类产出建筑一次收集产出数量
export const GAME_COLLECT_RATES: Record<string, number> = {
	miner: 2,
	lumber: 2,
	farm: 2,
	flower: 1
};

// 兑换率：花资源换花朵；铁/木/麦换积分（10 资源 -> 1 积分）
export const GAME_EXCHANGE_POINTS_PER = 10; // 每 10 点资源换 1 积分
export const GAME_DAILY_POINT_CAP = 100; // 每日最多通过资源兑换获得积分
export const GAME_FLOWER_RATE = 5; // 5 点花资源 -> 1 朵花

// 公共世界：所有人共用同一张地图（固定 ID）
export const GAME_WORLD_ID = 'world-main';

/** 获取或初始化公共世界（首次访问时自动创建，由首位管理员担任创建者） */
export async function getOrCreateWorldMap(db: Db) {
	const rows = await db.select().from(gameMaps).where(eq(gameMaps.id, GAME_WORLD_ID)).limit(1);
	if (rows.length > 0) return rows[0];
	const admins = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.role, 'admin'))
		.limit(1);
	if (!admins[0]) return null;
	await db
		.insert(gameMaps)
		.values({ id: GAME_WORLD_ID, name: '交大工坊·公共世界', ownerId: admins[0].id });
	return (await db.select().from(gameMaps).where(eq(gameMaps.id, GAME_WORLD_ID)).get()) ?? null;
}

export async function createGameMap(db: Db, name: string, ownerId: string): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(gameMaps).values({ id, name, ownerId });
	return id;
}

export async function listGameMaps(db: Db, limit = 20) {
	return db
		.select({
			map: gameMaps,
			ownerName: users.username,
			tileCount: sql<number>`(select count(*) from game_tiles t where t.map_id = ${gameMaps.id})`
		})
		.from(gameMaps)
		.innerJoin(users, eq(users.id, gameMaps.ownerId))
		.orderBy(desc(gameMaps.updatedAt))
		.limit(limit);
}

export async function getGameMap(db: Db, mapId: string) {
	const rows = await db
		.select({ map: gameMaps, ownerName: users.username })
		.from(gameMaps)
		.innerJoin(users, eq(users.id, gameMaps.ownerId))
		.where(eq(gameMaps.id, mapId))
		.limit(1);
	return rows[0] ?? null;
}

export async function touchGameMap(db: Db, mapId: string) {
	await db.update(gameMaps).set({ updatedAt: new Date() }).where(eq(gameMaps.id, mapId));
}

export async function listGameTiles(db: Db, mapId: string) {
	return db.select().from(gameTiles).where(eq(gameTiles.mapId, mapId));
}

export async function placeGameTile(
	db: Db,
	mapId: string,
	x: number,
	y: number,
	type: string,
	ownerId: string
): Promise<{ ok: boolean; error?: string }> {
	if (x < 0 || y < 0 || x >= GAME_MAP_SIZE || y >= GAME_MAP_SIZE) {
		return { ok: false, error: '坐标超出地图范围' };
	}
	if (!(type in GAME_BUILDINGS)) return { ok: false, error: '无效建筑类型' };
	const exist = await db
		.select({ id: gameTiles.id })
		.from(gameTiles)
		.where(and(eq(gameTiles.mapId, mapId), eq(gameTiles.x, x), eq(gameTiles.y, y)))
		.limit(1);
	if (exist.length > 0) return { ok: false, error: '该格子已有建筑' };
	await db.insert(gameTiles).values({
		mapId,
		x,
		y,
		type,
		ownerId,
		createdAt: new Date()
	});
	await touchGameMap(db, mapId);
	return { ok: true };
}

export async function removeGameTile(
	db: Db,
	mapId: string,
	x: number,
	y: number
): Promise<{ ok: boolean; error?: string }> {
	const rows = await db
		.select({ id: gameTiles.id })
		.from(gameTiles)
		.where(and(eq(gameTiles.mapId, mapId), eq(gameTiles.x, x), eq(gameTiles.y, y)))
		.limit(1);
	if (rows.length === 0) return { ok: false, error: '该处无建筑' };
	await db.delete(gameTiles).where(eq(gameTiles.id, rows[0].id));
	await touchGameMap(db, mapId);
	return { ok: true };
}

export async function listGameResources(db: Db, userId: string, mapId: string) {
	const rows = await db
		.select()
		.from(gameResources)
		.where(and(eq(gameResources.userId, userId), eq(gameResources.mapId, mapId)));
	const map: Record<string, number> = { iron: 0, wood: 0, wheat: 0, flower: 0 };
	for (const r of rows) map[r.resourceType] = r.amount;
	return map;
}

export async function addGameResource(
	db: Db,
	userId: string,
	mapId: string,
	resourceType: string,
	amount: number
) {
	await db
		.insert(gameResources)
		.values({ userId, mapId, resourceType, amount })
		.onConflictDoUpdate({
			target: [gameResources.userId, gameResources.mapId, gameResources.resourceType],
			set: { amount: sql`${gameResources.amount} + ${amount}` }
		});
}

/** 收集玩家在该地图上的全部产出建筑资源 */
export async function collectGameResources(
	db: Db,
	mapId: string,
	userId: string
): Promise<Record<string, number>> {
	const tiles = await db
		.select({ type: gameTiles.type })
		.from(gameTiles)
		.where(and(eq(gameTiles.mapId, mapId), eq(gameTiles.ownerId, userId)));
	const gained: Record<string, number> = {};
	for (const t of tiles) {
		const rate = GAME_COLLECT_RATES[t.type];
		if (rate && t.type in GAME_BUILDINGS) {
			const rtype = GAME_BUILDINGS[t.type as GameBuildingType].resource;
			if (!rtype) continue;
			gained[rtype] = (gained[rtype] ?? 0) + rate;
		}
	}
	for (const [rtype, amount] of Object.entries(gained)) {
		await addGameResource(db, userId, mapId, rtype, amount);
	}
	return gained;
}

export async function addGameChat(db: Db, mapId: string, userId: string, content: string) {
	if (!content.trim()) return;
	await db.insert(gameChats).values({ mapId, userId, content: content.slice(0, 100) });
}

export async function listGameChat(db: Db, mapId: string, limit = 50) {
	return db
		.select({ chat: gameChats, username: users.username })
		.from(gameChats)
		.innerJoin(users, eq(users.id, gameChats.userId))
		.where(eq(gameChats.mapId, mapId))
		.orderBy(desc(gameChats.createdAt))
		.limit(limit);
}

export async function getGameExchangePoints(db: Db, userId: string, date: string): Promise<number> {
	const rows = await db
		.select({ points: gameExchanges.points })
		.from(gameExchanges)
		.where(and(eq(gameExchanges.userId, userId), eq(gameExchanges.date, date)))
		.limit(1);
	return rows[0]?.points ?? 0;
}

export async function addGameExchangePoints(db: Db, userId: string, date: string, points: number) {
	await db
		.insert(gameExchanges)
		.values({ userId, date, points })
		.onConflictDoUpdate({
			target: [gameExchanges.userId, gameExchanges.date],
			set: { points: sql`${gameExchanges.points} + ${points}` }
		});
}

/** 资源兑换积分：每日上限 GAME_DAILY_POINT_CAP */
export async function exchangeGameResourcesToPoints(
	db: Db,
	userId: string,
	mapId: string,
	resourceType: 'iron' | 'wood' | 'wheat'
): Promise<{ ok: boolean; gained?: number; error?: string }> {
	const res = await listGameResources(db, userId, mapId);
	const available = res[resourceType] ?? 0;
	if (available < GAME_EXCHANGE_POINTS_PER) {
		return { ok: false, error: '资源不足' };
	}
	const today = todayStr();
	const used = await getGameExchangePoints(db, userId, today);
	const room = GAME_DAILY_POINT_CAP - used;
	if (room <= 0) return { ok: false, error: '今日兑换已达上限' };
	const points = Math.min(Math.floor(available / GAME_EXCHANGE_POINTS_PER), room);
	const consume = points * GAME_EXCHANGE_POINTS_PER;
	await db
		.update(gameResources)
		.set({ amount: sql`${gameResources.amount} - ${consume}` })
		.where(
			and(
				eq(gameResources.userId, userId),
				eq(gameResources.mapId, mapId),
				eq(gameResources.resourceType, resourceType)
			)
		);
	await addGameExchangePoints(db, userId, today, points);
	// 直接加积分（数量可变，不走固定规则 awardPoints）
	await db
		.update(users)
		.set({ points: sql`${users.points} + ${points}` })
		.where(eq(users.id, userId));
	await db.insert(pointLogs).values({ userId, change: points, reason: 'game', refId: mapId });
	return { ok: true, gained: points };
}

/** 花资源兑换花朵进背包 */
export async function exchangeGameFlower(
	db: Db,
	userId: string,
	mapId: string
): Promise<{ ok: boolean; error?: string; flower?: string }> {
	const res = await listGameResources(db, userId, mapId);
	const available = res['flower'] ?? 0;
	if (available < GAME_FLOWER_RATE) return { ok: false, error: '花资源不足' };
	const count = Math.floor(available / GAME_FLOWER_RATE);
	const consume = count * GAME_FLOWER_RATE;
	await db
		.update(gameResources)
		.set({ amount: sql`${gameResources.amount} - ${consume}` })
		.where(
			and(
				eq(gameResources.userId, userId),
				eq(gameResources.mapId, mapId),
				eq(gameResources.resourceType, 'flower')
			)
		);
	const flowerTypes = Object.keys(FLOWER_TYPES) as FlowerType[];
	const flower = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
	for (let i = 0; i < count; i++) {
		await addItem(db, userId, flower, 'game');
	}
	return { ok: true, flower };
}

// ---------- 竞争玩法：偷抢 / 排行榜 ----------

export const GAME_STEAL_PER_TARGET_DAILY = 10; // 每人每天从同一目标最多偷 10 资源
export const GAME_STEAL_PER_TYPE = 5; // 每次每种资源最多偷 5

/** 偷取目标玩家在公共地图上的资源（每人每天同一目标有上限，防刷） */
export async function stealGameResources(
	db: Db,
	attackerId: string,
	targetId: string,
	mapId: string
): Promise<{ ok: boolean; gained?: Record<string, number>; error?: string }> {
	if (attackerId === targetId) return { ok: false, error: '不能偷自己' };
	const today = todayStr();
	const usedRows = await db
		.select({ amount: gameSteals.amount })
		.from(gameSteals)
		.where(
			and(
				eq(gameSteals.attackerId, attackerId),
				eq(gameSteals.targetId, targetId),
				eq(gameSteals.date, today)
			)
		)
		.limit(1);
	const used = usedRows[0]?.amount ?? 0;
	const room = GAME_STEAL_PER_TARGET_DAILY - used;
	if (room <= 0) return { ok: false, error: '今日从该玩家已偷到上限' };

	const targetRes = await listGameResources(db, targetId, mapId);
	const gained: Record<string, number> = {};
	let stolen = 0;
	for (const [rtype, amt] of Object.entries(targetRes)) {
		if (amt <= 0) continue;
		const take = Math.min(amt, GAME_STEAL_PER_TYPE, room - stolen);
		if (take <= 0) continue;
		await db
			.update(gameResources)
			.set({ amount: sql`${gameResources.amount} - ${take}` })
			.where(
				and(
					eq(gameResources.userId, targetId),
					eq(gameResources.mapId, mapId),
					eq(gameResources.resourceType, rtype)
				)
			);
		await addGameResource(db, attackerId, mapId, rtype, take);
		gained[rtype] = take;
		stolen += take;
		if (stolen >= room) break;
	}
	if (stolen === 0) return { ok: false, error: '对方没有可偷的资源' };
	await db
		.insert(gameSteals)
		.values({ attackerId, targetId, date: today, amount: stolen })
		.onConflictDoUpdate({
			target: [gameSteals.attackerId, gameSteals.targetId, gameSteals.date],
			set: { amount: sql`${gameSteals.amount} + ${stolen}` }
		});
	return { ok: true, gained };
}

/** 公共世界排行榜：按建筑数、资源总量、积分 */
/** 公共世界所有玩家的资源汇总（用于偷抢目标列表） */
export async function listWorldPlayers(db: Db, mapId: string) {
	const rows = await db
		.select({
			userId: gameResources.userId,
			username: users.username,
			resourceType: gameResources.resourceType,
			amount: gameResources.amount
		})
		.from(gameResources)
		.innerJoin(users, eq(users.id, gameResources.userId))
		.where(eq(gameResources.mapId, mapId));
	const byUser = new Map<
		string,
		{ userId: string; username: string; resources: Record<string, number> }
	>();
	for (const r of rows) {
		let u = byUser.get(r.userId);
		if (!u) {
			u = { userId: r.userId, username: r.username, resources: {} };
			byUser.set(r.userId, u);
		}
		u.resources[r.resourceType] = r.amount;
	}
	return [...byUser.values()];
}

export async function getGameRanking(db: Db, mapId: string, limit = 20) {
	// 分步查询 + 内存聚合（避免子查询渲染问题）
	const counts = await db
		.select({ ownerId: gameTiles.ownerId, buildingCount: sql<number>`count(*)` })
		.from(gameTiles)
		.where(eq(gameTiles.mapId, mapId))
		.groupBy(gameTiles.ownerId);
	const resRows = await db
		.select({
			userId: gameResources.userId,
			total: sql<number>`coalesce(sum(amount), 0)`
		})
		.from(gameResources)
		.where(eq(gameResources.mapId, mapId))
		.groupBy(gameResources.userId);
	const ids = [...new Set([...counts.map((c) => c.ownerId), ...resRows.map((r) => r.userId)])];
	if (ids.length === 0) return [];
	const userRows = await db
		.select({ id: users.id, username: users.username, points: users.points })
		.from(users)
		.where(inArray(users.id, ids));
	const cm = new Map(counts.map((c) => [c.ownerId, c.buildingCount]));
	const rm = new Map(resRows.map((r) => [r.userId, r.total]));
	return userRows
		.map((u) => ({
			userId: u.id,
			username: u.username,
			points: u.points,
			buildingCount: cm.get(u.id) ?? 0,
			totalResources: rm.get(u.id) ?? 0
		}))
		.filter((u) => u.buildingCount > 0)
		.sort((a, b) => b.buildingCount - a.buildingCount)
		.slice(0, limit);
}
