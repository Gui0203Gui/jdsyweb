import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserProfile, listPostsByAuthor, listUserFavorites } from '#lib/server/queries';
import { listPointLogs } from '#lib/server/points';
import { users } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login?redirect=/me');

	const [profile, myPosts, favorites, pointLogs] = await Promise.all([
		getUserProfile(locals.db, locals.user.id),
		listPostsByAuthor(locals.db, locals.user.id),
		listUserFavorites(locals.db, locals.user.id, 30),
		listPointLogs(locals.db, locals.user.id, 100)
	]);

	return {
		profile: profile!, // locals.user 已存在，profile 必然非空
		posts: myPosts,
		favorites,
		pointLogs
	};
};

export const actions: Actions = {
	/** 更新简介 */
	updateBio: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录' });
		const form = await request.formData();
		const bio = String(form.get('bio') ?? '')
			.trim()
			.slice(0, 200);
		await locals.db.update(users).set({ bio }).where(eq(users.id, locals.user.id));
		return { ok: true };
	}
};
