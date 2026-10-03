import type { RequestHandler } from './$types';
import { getFile } from '#lib/server/points';

export const GET: RequestHandler = async ({ params }) => {
	// 只允许访问 img/ 前缀的 key，防止读取其他内容
	const key = params.key;
	if (!key.startsWith('img/')) return new Response('Not found', { status: 404 });

	const file = await getFile(key);
	if (!file) return new Response('Not found', { status: 404 });

	return new Response(file.data, {
		headers: {
			'Content-Type': file.contentType,
			'Cache-Control': 'public, max-age=86400, immutable',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
