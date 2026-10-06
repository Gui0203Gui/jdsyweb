import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	addGameChat,
	collectGameResources,
	exchangeGameFlower,
	exchangeGameResourcesToPoints,
	getGameMap,
	listGameChat,
	listGameResources,
	listGameTiles,
	placeGameTile,
	removeGameTile
} from '#lib/server/queries';

export const GET: RequestHandler = async ({ params, locals }) => {
	const map = await getGameMap(locals.db, params.id);
	if (!map) return json({ error: '地图不存在' }, { status: 404 });
	const [tiles, chat, resources] = await Promise.all([
		listGameTiles(locals.db, params.id),
		listGameChat(locals.db, params.id, 50),
		locals.user ? listGameResources(locals.db, locals.user.id, params.id) : null
	]);
	return json({
		map: {
			id: map.map.id,
			name: map.map.name,
			ownerName: map.ownerName,
			createdAt: map.map.createdAt
		},
		tiles: tiles.map((t) => ({ x: t.x, y: t.y, type: t.type, ownerId: t.ownerId })),
		chat: chat.map((c) => ({
			id: c.chat.id,
			username: c.username,
			content: c.chat.content,
			createdAt: c.chat.createdAt
		})),
		resources: locals.user ? resources : null
	});
};

export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) return json({ error: '请先登录' }, { status: 401 });
	const map = await getGameMap(locals.db, params.id);
	if (!map) return json({ error: '地图不存在' }, { status: 404 });

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const action = String(body?.action ?? '');
	const uid = locals.user.id;

	switch (action) {
		case 'place': {
			const x = Number(body?.x);
			const y = Number(body?.y);
			const type = String(body?.type ?? '');
			if (!Number.isInteger(x) || !Number.isInteger(y))
				return json({ error: '坐标无效' }, { status: 400 });
			const r = await placeGameTile(locals.db, params.id, x, y, type, uid);
			return r.ok ? json({ ok: true }) : json({ error: r.error }, { status: 400 });
		}
		case 'remove': {
			const x = Number(body?.x);
			const y = Number(body?.y);
			if (!Number.isInteger(x) || !Number.isInteger(y))
				return json({ error: '坐标无效' }, { status: 400 });
			const r = await removeGameTile(locals.db, params.id, x, y, uid);
			return r.ok ? json({ ok: true }) : json({ error: r.error }, { status: 400 });
		}
		case 'collect': {
			const gained = await collectGameResources(locals.db, params.id, uid);
			return json({ ok: true, gained });
		}
		case 'chat': {
			const content = String(body?.content ?? '').trim();
			if (!content) return json({ error: '消息不能为空' }, { status: 400 });
			await addGameChat(locals.db, params.id, uid, content);
			return json({ ok: true });
		}
		case 'exchangePoints': {
			const resourceType = String(body?.resourceType ?? '');
			if (!['iron', 'wood', 'wheat'].includes(resourceType)) {
				return json({ error: '只能兑换铁/木/麦资源' }, { status: 400 });
			}
			const r = await exchangeGameResourcesToPoints(
				locals.db,
				uid,
				params.id,
				resourceType as 'iron' | 'wood' | 'wheat'
			);
			return r.ok
				? json({ ok: true, gained: r.gained })
				: json({ error: r.error }, { status: 400 });
		}
		case 'exchangeFlower': {
			const r = await exchangeGameFlower(locals.db, uid, params.id);
			return r.ok
				? json({ ok: true, flower: r.flower })
				: json({ error: r.error }, { status: 400 });
		}
		default:
			return json({ error: '未知操作' }, { status: 400 });
	}
};
