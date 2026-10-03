import type { PageServerLoad } from './$types';
import { listWorks } from '#lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	const works = await listWorks(locals.db);
	return { works };
};
