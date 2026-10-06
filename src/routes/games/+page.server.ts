import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getGamePlayerInfo,
	getGameRanking,
	getOrCreateWorldMap,
	listGameChat,
	listGameResources,
	listGameTiles,
	listWorldPlayers
} from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const myId = locals.user.id;
	const world = await getOrCreateWorldMap(locals.db);
	if (!world) throw error(500, '世界初始化失败');
	const [tiles, chat, resources, players, ranking, me] = await Promise.all([
		listGameTiles(locals.db, world.id),
		listGameChat(locals.db, world.id, 50),
		listGameResources(locals.db, myId, world.id),
		listWorldPlayers(locals.db, world.id),
		getGameRanking(locals.db, world.id, 20),
		getGamePlayerInfo(locals.db, world.id, myId)
	]);
	return {
		world: { id: world.id, name: world.name },
		tiles: tiles.map((t) => ({ x: t.x, y: t.y, type: t.type, ownerId: t.ownerId, power: t.power })),
		chat: chat.map((c) => ({
			username: c.username,
			content: c.chat.content,
			createdAt: c.chat.createdAt
		})),
		resources,
		players: players.filter((pl) => pl.userId !== myId),
		ranking,
		points: me.points,
		armyPower: me.armyPower,
		myId
	};
};
