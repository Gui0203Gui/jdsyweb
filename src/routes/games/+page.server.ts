import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listGameMaps } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	const maps = await listGameMaps(locals.db, 50);
	return {
		username: locals.user.username,
		maps: maps.map((m) => ({
			id: m.map.id,
			name: m.map.name,
			ownerName: m.ownerName,
			tileCount: m.tileCount,
			updatedAt: m.map.updatedAt
		}))
	};
};
