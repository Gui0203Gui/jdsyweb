import type { PageServerLoad } from './$types';
import { getFileInfo } from '#lib/server/points';
import { WALL_KEY } from '#lib/wall';

export const load: PageServerLoad = async ({ locals }) => {
	const info = await getFileInfo(WALL_KEY);
	return {
		hasWall: Boolean(info),
		wallUrl: info ? `/api/img/${WALL_KEY}` : null,
		editor: info?.metadata && 'editor' in info.metadata ? String(info.metadata.editor) : null,
		updatedAt:
			info?.metadata && 'updatedAt' in info.metadata
				? Number(info.metadata.updatedAt) || null
				: null,
		user: locals.user
			? { id: locals.user.id, username: locals.user.username, role: locals.user.role }
			: null
	};
};
