import type { PageServerLoad } from './$types';
import { listHotPosts } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	const posts = await listHotPosts(locals.db, 30);
	return { posts };
};
