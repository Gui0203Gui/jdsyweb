import type { PageServerLoad } from './$types';
import { countSearchPosts, searchPosts } from '#lib/server/queries';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	const keyword = (url.searchParams.get('q') ?? '').trim();
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);

	if (!keyword) return { keyword: '', posts: [], total: 0, page: 1, pageCount: 0, PAGE_SIZE };

	const [posts, total] = await Promise.all([
		searchPosts(locals.db, keyword, (page - 1) * PAGE_SIZE, PAGE_SIZE),
		countSearchPosts(locals.db, keyword)
	]);

	return {
		keyword,
		posts,
		total,
		page,
		pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		PAGE_SIZE
	};
};
