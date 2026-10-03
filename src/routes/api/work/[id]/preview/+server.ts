import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { works } from '#lib/server/db/schema';
import { getFileText } from '#lib/server/points';

export const GET: RequestHandler = async ({ params }) => {
	const db = getDb(env.DB as D1Database);
	const row = await db
		.select({ fileKey: works.fileKey })
		.from(works)
		.where(eq(works.id, params.id))
		.get();
	if (!row) return new Response('Not found', { status: 404 });

	const html = await getFileText(row.fileKey);
	if (html === null) return new Response('Not found', { status: 404 });

	// 预览：HTML 直接返回，前端用 sandbox iframe 隔离
	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
