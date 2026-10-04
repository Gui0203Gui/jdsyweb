import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { putFile } from '#lib/server/points';
import { addGraffiti } from '#lib/server/queries';

const MAX_BYTES = 5 * 1024 * 1024; // 涂鸦 PNG 上限 5MB

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: '请先登录' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as { image?: string } | null;
	const dataUrl = body?.image;
	if (!dataUrl || typeof dataUrl !== 'string') {
		return json({ error: '缺少涂鸦图片' }, { status: 400 });
	}
	if (!dataUrl.startsWith('data:image/png;base64,')) {
		return json({ error: '仅支持 PNG 涂鸦' }, { status: 400 });
	}

	const b64 = dataUrl.slice('data:image/png;base64,'.length);
	const buf = Buffer.from(b64, 'base64');
	if (buf.byteLength > MAX_BYTES) {
		return json({ error: '涂鸦图片太大（超过 5MB）' }, { status: 400 });
	}
	const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

	const key = `img/graff-${crypto.randomUUID()}.png`;
	await putFile(key, ab, 'image/png');
	await addGraffiti(locals.db, locals.user.id, key);
	return json({ ok: true, key });
};
