import type { PageServerLoad } from './$types';
import { listForums, listLatestPosts } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	const [forums, posts] = await Promise.all([listForums(locals.db), listLatestPosts(locals.db)]);

	return { forums, posts };
};
