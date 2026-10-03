import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getUserByUsername,
	getUserProfile,
	listPostsByAuthor,
	listUserWorks
} from '#lib/server/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await getUserByUsername(locals.db, params.username);
	if (!user) error(404, '用户不存在');

	const [profile, posts, works] = await Promise.all([
		getUserProfile(locals.db, user.id),
		listPostsByAuthor(locals.db, user.id, 0, 20),
		listUserWorks(locals.db, user.id, 10)
	]);

	return { profile: profile!, posts, works };
};
