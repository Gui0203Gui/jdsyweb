import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGameMap, listGameChat, listGameResources, listGameTiles } from '#lib/server/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const map = await getGameMap(locals.db, params.id);
	if (!map) throw error(404, '地图不存在');
	const [tiles, chat, resources] = await Promise.all([
		listGameTiles(locals.db, params.id),
		listGameChat(locals.db, params.id, 50),
		listGameResources(locals.db, locals.user.id, params.id)
	]);
	return {
		map: { id: map.map.id, name: map.map.name, ownerName: map.ownerName },
		tiles: tiles.map((t) => ({ x: t.x, y: t.y, type: t.type, ownerId: t.ownerId })),
		chat: chat.map((c) => ({
			username: c.username,
			content: c.chat.content,
			createdAt: c.chat.createdAt
		})),
		resources,
		myId: locals.user.id
	};
};
