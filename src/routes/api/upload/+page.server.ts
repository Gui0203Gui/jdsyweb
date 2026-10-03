import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { putFile } from '#lib/server/points';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Map<string, string>([
	['image/jpeg', 'jpg'],
	['image/png', 'png'],
	['image/gif', 'gif'],
	['image/webp', 'webp']
]);

export const actions: Actions = {
	/** 上传一张图片，返回 KV key */
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });

		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) return fail(400, { error: '缺少图片文件' });

		const ext = ALLOWED_TYPES.get(file.type);
		if (!ext) return fail(400, { error: '仅支持 JPG/PNG/GIF/WebP 图片' });
		if (file.size > MAX_FILE_SIZE) return fail(400, { error: '图片不能超过 5MB' });

		const buf = await file.arrayBuffer();
		const key = `img/${crypto.randomUUID()}.${ext}`;
		await putFile(key, buf, file.type);
		return { key };
	}
};
