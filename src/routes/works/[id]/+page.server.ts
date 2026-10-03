import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWorkDetail, incrementWorkViews } from '#lib/server/queries';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = await getWorkDetail(locals.db, params.id);
	if (!detail) error(404, '作品不存在或已被删除');

	await incrementWorkViews(locals.db, params.id);
	return { work: detail.work, author: detail.author };
};
