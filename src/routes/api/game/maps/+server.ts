import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGameMap, listGameMaps } from '#lib/server/queries';

export const GET: RequestHandler = async ({ locals }) => {
	const maps = await listGameMaps(locals.db, 50);
	return json(
		maps.map((m) => ({
			id: m.map.id,
			name: m.map.name,
			ownerName: m.ownerName,
			tileCount: m.tileCount,
			createdAt: m.map.createdAt,
			updatedAt: m.map.updatedAt
		}))
	);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: '请先登录' }, { status: 401 });
	const body = (await request.json().catch(() => null)) as { name?: string } | null;
	const name = String(body?.name ?? '').trim();
	if (!name || name.length > 20)
		return json({ error: '请输入 1-20 字的地图名称' }, { status: 400 });
	const id = await createGameMap(locals.db, name, locals.user.id);
	return json({ ok: true, id });
};
