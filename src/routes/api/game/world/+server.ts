import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	addGameChat,
	collectGameResources,
	exchangeGameFlower,
	exchangeGameResourcesToPoints,
	getGameRanking,
	getOrCreateWorldMap,
	listWorldPlayers,
	listGameChat,
	listGameResources,
	listGameTiles,
	placeGameTile,
	removeGameTile,
	stealGameResources
} from '#lib/server/queries';

export const GET: RequestHandler = async ({ locals }) => {
	const world = await getOrCreateWorldMap(locals.db);
	if (!world) return json({ error: '世界初始化失败' }, { status: 500 });
	const [tiles, chat, resources, players, ranking] = await Promise.all([
		listGameTiles(locals.db, world.id),
		listGameChat(locals.db, world.id, 50),
		locals.user ? listGameResources(locals.db, locals.user.id, world.id) : null,
		listWorldPlayers(locals.db, world.id),
		getGameRanking(locals.db, world.id, 20)
	]);
	return json({
		world: { id: world.id, name: world.name },
		tiles: tiles.map((t) => ({ x: t.x, y: t.y, type: t.type, ownerId: t.ownerId })),
		chat: chat.map((c) => ({
			id: c.chat.id,
			username: c.username,
			content: c.chat.content,
			createdAt: c.chat.createdAt
		})),
		resources: locals.user ? resources : null,
		players: players.filter((p) => p.userId !== locals.user?.id),
		ranking
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: '请先登录' }, { status: 401 });
	const world = await getOrCreateWorldMap(locals.db);
	if (!world) return json({ error: '世界初始化失败' }, { status: 500 });

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const action = String(body?.action ?? '');
	const uid = locals.user.id;
	const wid = world.id;

	switch (action) {
		case 'place': {
			const x = Number(body?.x);
			const y = Number(body?.y);
			const type = String(body?.type ?? '');
			if (!Number.isInteger(x) || !Number.isInteger(y))
				return json({ error: '坐标无效' }, { status: 400 });
			const r = await placeGameTile(locals.db, wid, x, y, type, uid);
			return r.ok ? json({ ok: true }) : json({ error: r.error }, { status: 400 });
		}
		case 'remove': {
			const x = Number(body?.x);
			const y = Number(body?.y);
			if (!Number.isInteger(x) || !Number.isInteger(y))
				return json({ error: '坐标无效' }, { status: 400 });
			const r = await removeGameTile(locals.db, wid, x, y);
			return r.ok ? json({ ok: true }) : json({ error: r.error }, { status: 400 });
		}
		case 'collect': {
			const gained = await collectGameResources(locals.db, wid, uid);
			return json({ ok: true, gained });
		}
		case 'chat': {
			const content = String(body?.content ?? '').trim();
			if (!content) return json({ error: '消息不能为空' }, { status: 400 });
			await addGameChat(locals.db, wid, uid, content);
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
				wid,
				resourceType as 'iron' | 'wood' | 'wheat'
			);
			return r.ok
				? json({ ok: true, gained: r.gained })
				: json({ error: r.error }, { status: 400 });
		}
		case 'exchangeFlower': {
			const r = await exchangeGameFlower(locals.db, uid, wid);
			return r.ok
				? json({ ok: true, flower: r.flower })
				: json({ error: r.error }, { status: 400 });
		}
		case 'steal': {
			const targetId = String(body?.targetId ?? '');
			if (!targetId) return json({ error: '请选择偷取目标' }, { status: 400 });
			const r = await stealGameResources(locals.db, uid, targetId, wid);
			return r.ok
				? json({ ok: true, gained: r.gained })
				: json({ error: r.error }, { status: 400 });
		}
		default:
			return json({ error: '未知操作' }, { status: 400 });
	}
};
