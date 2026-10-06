import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	countFollows,
	getUserByUsername,
	getUserProfile,
	isFollowing,
	listPostsByAuthor,
	listUserWorks,
	unfollowUser,
	followUser,
	checkAchievements
} from '#lib/server/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await getUserByUsername(locals.db, params.username);
	if (!user) error(404, '用户不存在');

	const [profile, posts, works, followCounts, following] = await Promise.all([
		getUserProfile(locals.db, user.id),
		listPostsByAuthor(locals.db, user.id, 0, 20),
		listUserWorks(locals.db, user.id, 10),
		countFollows(locals.db, user.id),
		locals.user && locals.user.id !== user.id
			? isFollowing(locals.db, locals.user.id, user.id)
			: Promise.resolve(false)
	]);

	return {
		profile: profile!,
		posts,
		works,
		followCounts,
		following,
		isMe: locals.user?.id === user.id
	};
};

export const actions: Actions = {
	/** 关注 / 取关 */
	follow: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });
		const target = await getUserByUsername(locals.db, params.username);
		if (!target) return fail(404, { error: '用户不存在' });
		if (locals.user.id === target.id) return fail(400, { error: '不能关注自己' });

		const already = await isFollowing(locals.db, locals.user.id, target.id);
		if (already) {
			await unfollowUser(locals.db, locals.user.id, target.id);
		} else {
			await followUser(locals.db, locals.user.id, target.id);
		}

		// 成就检查：关注数
		await checkAchievements(locals.db, locals.user.id);
		return { following: !already };
	}
};
