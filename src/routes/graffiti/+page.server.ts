import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteGraffiti, getGraffiti, listGraffiti } from '#lib/server/queries';
import { deleteFile } from '#lib/server/points';

export const load: PageServerLoad = async ({ locals }) => {
	const graffiti = await listGraffiti(locals.db, 40);
	return {
		graffiti: graffiti.map((g) => ({
			id: g.graffiti.id,
			author: g.author.username,
			authorId: g.author.id,
			imageKey: g.graffiti.imageKey,
			createdAt: g.graffiti.createdAt
		})),
		user: locals.user
			? { id: locals.user.id, username: locals.user.username, role: locals.user.role }
			: null
	};
};

export const actions: Actions = {
	erase: async ({ request, locals }) => {
		if (!locals.user) throw error(401, '请先登录');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少涂鸦 ID' });

		const g = await getGraffiti(locals.db, id);
		if (!g) return fail(400, { error: '涂鸦不存在或已被擦除' });

		await deleteGraffiti(locals.db, id);
		if (g.imageKey.startsWith('img/')) {
			await deleteFile(g.imageKey).catch(() => {});
		}
		return { success: '已擦除这张涂鸦' };
	}
};
