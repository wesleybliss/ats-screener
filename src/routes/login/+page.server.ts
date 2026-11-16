import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	resolveAuthMode,
	resolveLdapConfig,
	resolvePasswordConfig
} from '$lib/server/auth/config';
import { buildServerAuthProvider } from '$lib/server/auth/provider';
import {
	verifyGlobalPassword,
	GLOBAL_PASSWORD_USER
} from '$lib/server/auth/password';
import {
	signSession,
	makeSessionPayload,
	sessionCookieOptions,
	SESSION_COOKIE
} from '$lib/server/auth/session';
import {
	checkLoginRateLimit,
	recordLoginFailure,
	resetLoginRateLimit
} from '$lib/server/auth/login-rate-limit';
import { logger } from '$lib/log';

function requestIsSecure(request: Request, url: URL): boolean {
	// mark the cookie Secure when the *original* request was https. behind a
	// TLS-terminating reverse proxy the internal request is http, so prefer
	// x-forwarded-proto and fall back to url.protocol for a direct connection.
	const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
	return forwardedProto ? forwardedProto === 'https' : url.protocol === 'https:';
}

export const load: PageServerLoad = async ({ locals }) => {
	const merged = { ...env, ...publicEnv };
	const mode = resolveAuthMode(merged);
	// no sign-in surface in anonymous mode
	if (mode === 'none') throw redirect(303, '/scanner');
	// already have a server session (ldap / password)
	if (locals.user) throw redirect(303, '/scanner');
	return {};
};

// ldap + global-password sign-in. firebase sign-in is client-side, so a POST
// here in firebase mode just bounces to the scanner. SvelteKit's built-in
// form-action origin check (csrf.checkOrigin, default true) covers CSRF.
export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const merged = { ...env, ...publicEnv };
		const mode = resolveAuthMode(merged);
		if (mode !== 'ldap' && mode !== 'password') throw redirect(303, '/scanner');

		const ip = getClientAddress();
		const gate = checkLoginRateLimit(ip);
		if (!gate.allowed) {
			return fail(429, {
				message: `Too many attempts. Try again in ${gate.retryAfterSec}s.`,
				username: ''
			});
		}

		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const secure = requestIsSecure(request, url);

		if (mode === 'password') {
			if (!password) {
				return fail(400, { message: 'Enter the password.', username: '' });
			}

			let cfg;
			try {
				cfg = resolvePasswordConfig(merged);
			} catch (err) {
				logger.error('password.misconfigured', {
					error: err instanceof Error ? err.message : String(err)
				});
				return fail(500, {
					message: 'Server authentication is misconfigured. Contact your administrator.',
					username: ''
				});
			}
			if (!cfg) throw redirect(303, '/scanner');

			const ok = await verifyGlobalPassword(cfg.password, password);
			if (!ok) {
				recordLoginFailure(ip);
				return fail(401, { message: 'Incorrect password.', username: '' });
			}

			resetLoginRateLimit(ip);
			const token = await signSession(
				makeSessionPayload(GLOBAL_PASSWORD_USER, cfg.sessionMaxAgeSec),
				cfg.sessionSecret
			);
			cookies.set(SESSION_COOKIE, token, sessionCookieOptions(cfg.sessionMaxAgeSec, secure));
			logger.info('password.login_success', { sub: GLOBAL_PASSWORD_USER.sub });
			throw redirect(303, '/scanner');
		}

		// --- ldap ---
		const username = String(form.get('username') ?? '').trim();
		if (!username || !password) {
			return fail(400, { message: 'Enter your username and password.', username });
		}

		let provider;
		try {
			provider = buildServerAuthProvider(merged);
		} catch (err) {
			// resolveLdapConfig throws on misconfig (missing companion var / weak
			// secret). fail closed with a server-side log; don't leak details.
			logger.error('ldap.misconfigured', {
				error: err instanceof Error ? err.message : String(err)
			});
			return fail(500, {
				message: 'Server authentication is misconfigured. Contact your administrator.',
				username
			});
		}
		if (!provider) throw redirect(303, '/scanner');

		const result = await provider.authenticate(username, password);
		if (!result.ok) {
			recordLoginFailure(ip);
			return fail(401, { message: result.message, username });
		}

		resetLoginRateLimit(ip);
		const cfg = resolveLdapConfig(merged)!;
		const token = await signSession(
			makeSessionPayload(result.user, cfg.sessionMaxAgeSec),
			cfg.sessionSecret
		);
		cookies.set(SESSION_COOKIE, token, sessionCookieOptions(cfg.sessionMaxAgeSec, secure));
		logger.info('ldap.login_success', { sub: result.user.sub });
		throw redirect(303, '/scanner');
	}
};
