import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { resolveAuthMode, isSessionAuthMode } from '$lib/server/auth/config';

// server-side guard for ldap / global-password modes: unauthenticated visitors
// are sent to /login before the page renders. no-op in firebase/none mode (the
// client auth gate handles those, exactly as before). password mode is also
// gated in hooks.server.ts; this is defense in depth for both session modes.
export const load: PageServerLoad = async ({ locals }) => {
	if (isSessionAuthMode(resolveAuthMode({ ...env, ...publicEnv })) && !locals.user) {
		throw redirect(303, '/login');
	}
	return {};
};
