// single shared-password auth for self-host. compares the submitted password
// against APP_GLOBAL_PASSWORD with a SHA-256 + XOR fold so length and bytes
// don't leak via early returns. uses Web Crypto (not node:crypto) so this
// module stays safe to import from hooks.server.ts on edge runtimes.
//
// successful auth mints the same signed session cookie LDAP uses, with a
// synthetic subject so locals.user / the client auth store stay uniform.

import type { AuthenticatedUser } from './provider';

const encoder = new TextEncoder();

// stable synthetic identity for the global-password session. one password =
// one shared "user"; history is not namespaced (everyone shares the bucket).
export const GLOBAL_PASSWORD_USER: AuthenticatedUser = {
	sub: 'global-password',
	name: 'Authenticated',
	email: '',
	groups: []
};

export async function verifyGlobalPassword(
	expected: string,
	provided: string
): Promise<boolean> {
	const [expectedHash, providedHash] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(expected)),
		crypto.subtle.digest('SHA-256', encoder.encode(provided))
	]);
	const a = new Uint8Array(expectedHash);
	const b = new Uint8Array(providedHash);
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
	return diff === 0;
}
