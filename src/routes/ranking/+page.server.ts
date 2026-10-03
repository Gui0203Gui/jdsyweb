import type { PageServerLoad } from './$types';
import { getUserRank, listLeaderboard } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	const [board, myRank] = await Promise.all([
		listLeaderboard(locals.db, 50),
		locals.user ? getUserRank(locals.db, locals.user.id) : Promise.resolve(null)
	]);

	return { board, myRank, myUserId: locals.user?.id ?? null };
};
