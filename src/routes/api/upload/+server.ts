import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { putFile } from '#lib/server/points';

const ALLOWED_TYPES = new Map<string, string>([
	['image/jpeg', 'jpg'],
	['image/png', 'png'],
	['image/gif', 'gif'],
	['image/webp', 'webp']
]);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: '请先登录' }, { status: 401 });

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) return json({ error: '缺少图片文件' }, { status: 400 });

	const ext = ALLOWED_TYPES.get(file.type);
	if (!ext) return json({ error: '仅支持 JPG/PNG/GIF/WebP 图片' }, { status: 400 });

	const buf = await file.arrayBuffer();
	const key = `img/${crypto.randomUUID()}.${ext}`;
	await putFile(key, buf, file.type);
	return json({ key });
};
