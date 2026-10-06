import type { PageServerLoad } from './$types';
import {
	countPosts,
	listActiveAnnouncements,
	listForums,
	listLatestPosts,
	listWorks
} from '#lib/server/queries';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);

	const [forums, posts, works, total, announcements] = await Promise.all([
		listForums(locals.db),
		listLatestPosts(locals.db, (page - 1) * PAGE_SIZE, PAGE_SIZE),
		listWorks(locals.db, 6),
		countPosts(locals.db),
		listActiveAnnouncements(locals.db, 5)
	]);

	return {
		forums,
		posts,
		works,
		page,
		pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		PAGE_SIZE,
		announcements
	};
};
