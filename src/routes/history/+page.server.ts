import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { resolveAuthMode, isSessionAuthMode } from '$lib/server/auth/config';

// server-side guard for ldap / global-password modes: unauthenticated visitors
// are sent to /login before the page renders. no-op in firebase/none mode
// (history there is client-gated exactly as before).
export const load: PageServerLoad = async ({ locals }) => {
	if (isSessionAuthMode(resolveAuthMode({ ...env, ...publicEnv })) && !locals.user) {
		throw redirect(303, '/login');
	}
	return {};
};
