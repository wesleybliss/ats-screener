import { describe, expect, it } from 'vitest';
import { isAuthPublicPath } from '../../../../src/lib/server/auth/guard';

describe('isAuthPublicPath', () => {
	it('allows login, logout, and healthz', () => {
		expect(isAuthPublicPath('/login')).toBe(true);
		expect(isAuthPublicPath('/login/')).toBe(true);
		expect(isAuthPublicPath('/logout')).toBe(true);
		expect(isAuthPublicPath('/healthz')).toBe(true);
	});

	it('allows SvelteKit assets and icons', () => {
		expect(isAuthPublicPath('/_app/immutable/entry/app.js')).toBe(true);
		expect(isAuthPublicPath('/service-worker.js')).toBe(true);
		expect(isAuthPublicPath('/favicon.ico')).toBe(true);
		expect(isAuthPublicPath('/icon-192.png')).toBe(true);
		expect(isAuthPublicPath('/manifest.webmanifest')).toBe(true);
		expect(isAuthPublicPath('/robots.txt')).toBe(true);
	});

	it('denies app pages and APIs', () => {
		expect(isAuthPublicPath('/')).toBe(false);
		expect(isAuthPublicPath('/scanner')).toBe(false);
		expect(isAuthPublicPath('/history')).toBe(false);
		expect(isAuthPublicPath('/api/analyze')).toBe(false);
		expect(isAuthPublicPath('/docs/index.html')).toBe(false);
	});
});
