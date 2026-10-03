import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	listAllPostsAdmin,
	setPostLocked,
	setPostPinned,
	softDeletePost,
	restorePost
} from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/');
	const keyword = url.searchParams.get('q') ?? '';
	const posts = await listAllPostsAdmin(locals.db, keyword, 100);
	return { posts, keyword };
};

export const actions: Actions = {
	pin: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少帖子 ID' });
		await setPostPinned(locals.db, id, true);
		return { ok: true };
	},
	unpin: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少帖子 ID' });
		await setPostPinned(locals.db, id, false);
		return { ok: true };
	},
	lock: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少帖子 ID' });
		await setPostLocked(locals.db, id, true);
		return { ok: true };
	},
	unlock: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少帖子 ID' });
		await setPostLocked(locals.db, id, false);
		return { ok: true };
	},
	delete: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少帖子 ID' });
		await softDeletePost(locals.db, id);
		return { ok: true };
	},
	restore: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: '无权限' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: '缺少帖子 ID' });
		await restorePost(locals.db, id);
		return { ok: true };
	}
};
