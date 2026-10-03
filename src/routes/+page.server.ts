import type { PageServerLoad } from './$types';
import { listForums, listLatestPosts, listWorks } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	const [forums, posts, works] = await Promise.all([
		listForums(locals.db),
		listLatestPosts(locals.db),
		listWorks(locals.db, 6)
	]);

	return { forums, posts, works };
};
