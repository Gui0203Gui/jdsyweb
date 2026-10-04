import { env } from 'cloudflare:workers';
import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './auth';
import { pointLogs, signIns, users } from './db/schema';

// ---------- KV 存储（图片 / HTML 作品） ----------

function getStorage(): KVNamespace {
	const ns = (env as unknown as Record<string, unknown>).STORAGE as KVNamespace | undefined;
	if (!ns) {
		throw new Error(
			'未检测到 KV 存储绑定（STORAGE）。请在完整 Cloudflare 环境下运行：npm run dev:cf'
		);
	}
	return ns;
}

export async function putFile(
	key: string,
	data: ArrayBuffer | string,
	contentType?: string,
	extraMeta?: Record<string, unknown>
) {
	const ns = getStorage();
	if (contentType || extraMeta) {
		await ns.put(key, data, { metadata: { contentType, ...extraMeta } });
	} else {
		await ns.put(key, data);
	}
	return key;
}

export async function getFile(
	key: string
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
	const ns = getStorage();
	const value = await ns.getWithMetadata(key, 'arrayBuffer');
	if (value.value === null) return null;
	const contentType =
		(typeof value.metadata === 'object' &&
		value.metadata !== null &&
		'contentType' in value.metadata
			? String(value.metadata.contentType)
			: null) || 'application/octet-stream';
	return { data: value.value, contentType };
}

/** 读取文件本体 + 附加元数据（如涂鸦画布的最后编辑者/时间） */
export async function getFileInfo(
	key: string
): Promise<{
	data: ArrayBuffer;
	contentType: string;
	metadata: Record<string, unknown> | null;
} | null> {
	const ns = getStorage();
	const value = await ns.getWithMetadata(key, 'arrayBuffer');
	if (value.value === null) return null;
	const contentType =
		(typeof value.metadata === 'object' &&
		value.metadata !== null &&
		'contentType' in value.metadata
			? String(value.metadata.contentType)
			: null) || 'application/octet-stream';
	const meta =
		typeof value.metadata === 'object' && value.metadata !== null
			? (value.metadata as Record<string, unknown>)
			: null;
	return { data: value.value, contentType, metadata: meta };
}

export async function getFileText(key: string): Promise<string | null> {
	const ns = getStorage();
	return await ns.get(key);
}

export async function deleteFile(key: string) {
	const ns = getStorage();
	await ns.delete(key);
}

// ---------- 积分系统 ----------

export const POINT_RULES = {
	post: 10, // 发帖
	comment: 5, // 评论
	like: 2, // 点赞
	favorite: 3, // 收藏
	signin: 5, // 签到
	work: 20 // 上传作品
} as const;

export type PointReason = keyof typeof POINT_RULES;

/**
 * 给用户加分并记录流水。
 * 返回新总分。加分是幂等调用方的责任（例如签到唯一约束、点赞去重已在调用方处理）。
 */
export async function awardPoints(
	db: Db,
	userId: string,
	reason: PointReason,
	refId = ''
): Promise<number> {
	const change = POINT_RULES[reason];

	// 更新用户积分
	await db
		.update(users)
		.set({ points: sql`${users.points} + ${change}` })
		.where(eq(users.id, userId));

	// 记录流水
	await db.insert(pointLogs).values({ userId, change, reason, refId });

	// 返回新总分
	const row = await db
		.select({ points: users.points })
		.from(users)
		.where(eq(users.id, userId))
		.get();
	return row?.points ?? 0;
}

/** 查询用户的积分流水（最近 N 条） */
export async function listPointLogs(db: Db, userId: string, limit = 20) {
	return db
		.select()
		.from(pointLogs)
		.where(eq(pointLogs.userId, userId))
		.orderBy(sql`${pointLogs.createdAt} desc`)
		.limit(limit);
}

// ---------- 签到 ----------

/** 今天的本地日期（YYYY-MM-DD），按服务器时区（部署到 Cloudflare 时区固定 UTC） */
export function todayStr(offsetHours = 8): string {
	// 中国时区 UTC+8：用 Date 计算并格式化为 YYYY-MM-DD
	const d = new Date(Date.now() + offsetHours * 3600 * 1000);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
		d.getUTCDate()
	).padStart(2, '0')}`;
}

/** 签到：今天已签返回 false，否则签到加分返回 true */
export async function trySignIn(db: Db, userId: string): Promise<{ ok: boolean; signed: boolean }> {
	const date = todayStr();
	const existing = await db
		.select({ id: signIns.id })
		.from(signIns)
		.where(and(eq(signIns.userId, userId), eq(signIns.date, date)))
		.get();

	if (existing) return { ok: true, signed: false };

	await db.insert(signIns).values({ userId, date });
	await awardPoints(db, userId, 'signin', date);
	return { ok: true, signed: true };
}
