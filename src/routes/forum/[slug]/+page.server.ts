import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { countPosts, getForumBySlug, listPostsByForum } from '#lib/server/queries';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const forum = await getForumBySlug(locals.db, params.slug);
	if (!forum) error(404, '板块不存在');

	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);

	const [posts, total] = await Promise.all([
		listPostsByForum(locals.db, forum.id, (page - 1) * PAGE_SIZE, PAGE_SIZE),
		countPosts(locals.db, forum.id)
	]);

	return { forum, posts, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
};
