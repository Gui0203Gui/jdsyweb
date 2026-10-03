import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getForumBySlug, listPostsByForum } from '#lib/server/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
	const forum = await getForumBySlug(locals.db, params.slug);
	if (!forum) error(404, '板块不存在');

	const posts = await listPostsByForum(locals.db, forum.id);

	return { forum, posts };
};
