import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { putFile } from '#lib/server/points';
import { WALL_KEY } from '#lib/wall';

const MAX_BYTES = 8 * 1024 * 1024; // 整张画布 PNG 上限 8MB

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: '请先登录' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as { image?: string } | null;
	const dataUrl = body?.image;
	if (!dataUrl || typeof dataUrl !== 'string') {
		return json({ error: '缺少画布图片' }, { status: 400 });
	}
	if (!dataUrl.startsWith('data:image/png;base64,')) {
		return json({ error: '仅支持 PNG 图片' }, { status: 400 });
	}

	const b64 = dataUrl.slice('data:image/png;base64,'.length);
	const buf = Buffer.from(b64, 'base64');
	if (buf.byteLength > MAX_BYTES) {
		return json({ error: '画布图片太大（超过 8MB）' }, { status: 400 });
	}
	const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

	// 覆盖保存到共享画布 key，并记录最后编辑者
	await putFile(WALL_KEY, ab, 'image/png', {
		editor: locals.user.username,
		editorId: locals.user.id,
		updatedAt: Date.now()
	});
	return json({ ok: true });
};
