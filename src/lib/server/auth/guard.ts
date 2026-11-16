// path allow-list for session-gated modes (ldap / password). assets and the
// login/logout/health surfaces must stay reachable without a cookie so the
// browser can load the sign-in page and ops can probe liveness.

export function isAuthPublicPath(pathname: string): boolean {
	if (pathname === '/login' || pathname.startsWith('/login/')) return true;
	if (pathname === '/logout') return true;
	if (pathname === '/healthz') return true;
	// SvelteKit client assets + service worker must load on the login page
	if (pathname.startsWith('/_app/')) return true;
	if (pathname === '/service-worker.js') return true;
	if (pathname.startsWith('/.well-known/')) return true;
	// static icons / manifests / plain-text probes (robots, humans, llms)
	if (
		/\.(ico|png|svg|webmanifest|txt|woff2?|map|jpg|jpeg|webp|gif)$/i.test(pathname)
	) {
		return true;
	}
	return false;
}
