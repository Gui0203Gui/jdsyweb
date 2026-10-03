import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { trySignIn } from '#lib/server/points';

export const load: PageServerLoad = async ({ locals }) => {
	// 防止直接访问 /signin 页面，仅作为 action 端点
	if (!locals.user) return { ok: false };
	return { ok: true };
};

export const actions: Actions = {
	default: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: '请先登录再签到' });
		const result = await trySignIn(locals.db, locals.user.id);
		return { ok: result.ok, signed: result.signed };
	}
};
