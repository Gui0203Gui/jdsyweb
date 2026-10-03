import { eq, lt } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { sessions, users, type User } from './db/schema';
import * as schema from './db/schema';

export type Db = DrizzleD1Database<typeof schema>;

const SESSION_COOKIE = 'jdsy_session';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

// ---------- 密码哈希（Web Crypto，Workers/Node 通用） ----------

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

async function deriveKey(
	password: string,
	salt: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
		keyMaterial,
		256
	);
	return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await deriveKey(password, salt);
	return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [algo, , saltHex, hashHex] = stored.split('$');
	if (algo !== 'pbkdf2') return false;
	const salt = hexToBytes(saltHex);
	const hash = await deriveKey(password, salt);
	const expected = hexToBytes(hashHex);
	if (hash.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ expected[i];
	return diff === 0;
}

// ---------- 会话管理（存 D1） ----------

export function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return bytesToHex(bytes);
}

export async function createSession(
	db: Db,
	userId: string
): Promise<{ token: string; expiresAt: Date }> {
	const token = generateToken();
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	await db.insert(sessions).values({ id: token, userId, expiresAt });
	return { token, expiresAt };
}

export async function deleteSession(db: Db, token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, token));
}

/** 清理过期会话（可低频调用） */
export async function purgeExpiredSessions(db: Db): Promise<void> {
	await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function getSessionUser(db: Db, token: string): Promise<User | null> {
	const row = await db
		.select({ user: users, expiresAt: sessions.expiresAt })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, token))
		.get();
	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now()) {
		await deleteSession(db, token);
		return null;
	}
	return row.user;
}

export { SESSION_COOKIE, SESSION_DAYS };
