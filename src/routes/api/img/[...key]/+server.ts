import type { RequestHandler } from './$types';
import { getFile } from '#lib/server/points';
import { WALL_KEY } from '#lib/wall';

export const GET: RequestHandler = async ({ params }) => {
	// 只允许访问 img/ 前缀的 key，防止读取其他内容
	const key = params.key;
	if (!key.startsWith('img/')) return new Response('Not found', { status: 404 });

	const file = await getFile(key);
	if (!file) return new Response('Not found', { status: 404 });

	// 共享涂鸦画布是可变内容：禁止强缓存，保证每次进入页面都能拿到最新画布
	// （此前 immutable 24h 缓存导致别人画的/自己新画的都看不到）
	const cacheControl = key === WALL_KEY ? 'no-cache' : 'public, max-age=86400, immutable';

	return new Response(file.data, {
		headers: {
			'Content-Type': file.contentType,
			'Cache-Control': cacheControl,
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
