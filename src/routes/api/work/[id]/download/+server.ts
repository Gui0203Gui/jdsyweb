import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';
import { getDb } from '#lib/server/db';
import { works } from '#lib/server/db/schema';
import { getFileText } from '#lib/server/points';

// RFC 5987 filename* 编码：只对非 ASCII 及不安全字符做百分号编码
function rfc5987Encode(name: string): string {
	let out = '';
	for (const ch of name) {
		const code = ch.codePointAt(0)!;
		if (
			(code >= 0x30 && code <= 0x39) || // 0-9
			(code >= 0x41 && code <= 0x5a) || // A-Z
			(code >= 0x61 && code <= 0x7a) || // a-z
			ch === '.' ||
			ch === '-' ||
			ch === '_'
		) {
			out += ch;
		} else {
			out += `%${code.toString(16).toUpperCase()}`;
		}
	}
	return out;
}

export const GET: RequestHandler = async ({ params }) => {
	const db = getDb(env.DB as D1Database);
	const row = await db
		.select({ fileKey: works.fileKey, fileName: works.fileName, title: works.title })
		.from(works)
		.where(eq(works.id, params.id))
		.get();
	if (!row) return new Response('Not found', { status: 404 });

	const html = await getFileText(row.fileKey);
	if (html === null) return new Response('Not found', { status: 404 });

	const safeName = rfc5987Encode(row.fileName || `${row.title}.html`);

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Disposition': `attachment; filename*=UTF-8''${safeName}`,
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
