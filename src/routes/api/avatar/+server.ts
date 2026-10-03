import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { putFile } from '#lib/server/points';
import { users } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';

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
	// 头像 key 复用 img/ 前缀，可直接用 /api/img/ 读取
	const key = `img/avatar-${locals.user.id}.${ext}`;
	await putFile(key, buf, file.type);

	await locals.db.update(users).set({ avatar: key }).where(eq(users.id, locals.user.id));

	return json({ key });
};
