import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// legacy /scanner URL; scanner now lives at the site root
export const load: PageServerLoad = async () => {
	throw redirect(308, '/');
};
