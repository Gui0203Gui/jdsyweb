import type { LayoutServerLoad } from './$types';
import { listForums } from '#lib/server/queries';

export const load: LayoutServerLoad = async ({ locals }) => {
	const [forums] = await Promise.all([listForums(locals.db)]);

	return {
		user: locals.user
			? {
					id: locals.user.id,
					username: locals.user.username,
					avatar: locals.user.avatar,
					role: locals.user.role
				}
			: null,
		forums
	};
};
