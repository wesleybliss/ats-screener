import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
// vitest 4 dropped `test` from vite's UserConfig type, so defineConfig comes from vitest
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// read package.json at config-load time so the client bundle can reference
// the version via the __APP_VERSION__ define. importing package.json from
// browser code triggers vite's fs.deny on package.json (403 in dev) and would
// otherwise inline the full manifest into the bundle.
const pkgUrl = new URL('./package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf-8')) as { version: string };

// firebase only ever runs in the browser, but its dynamic imports survive in the ssr build and
// vercel's file tracer then ships firebase's node sdk (and grpc-js) inside every function
function firebaseClientOnly(): Plugin {
	const stub = '\0firebase-ssr-stub';
	return {
		name: 'firebase-client-only',
		apply: 'build',
		enforce: 'pre',
		resolveId(id, _importer, opts) {
			if (opts?.ssr && (id === 'firebase' || id.startsWith('firebase/'))) return stub;
		},
		load(id) {
			if (id === stub) return 'export {};';
		}
	};
}

// Tailscale MagicDNS HTTPS — same pattern as Flow State / Hoard.
// Certs live in ~/localhost/_certs/<TAILSCALE_HOST>.{crt,key} (via `tailscale cert`).
const DEV_PORT = 3014;

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const tailscaleHost = env.TAILSCALE_HOST || 'geekom-a7.ide-cherimoya.ts.net';
	const tailscaleShortHost = tailscaleHost.split('.')[0]!;
	const useLocalHttps = env.USE_LOCAL_HTTPS === 'true';

	const https = useLocalHttps
		? {
				cert: readFileSync(join(homedir(), 'localhost/_certs', `${tailscaleHost}.crt`)),
				key: readFileSync(join(homedir(), 'localhost/_certs', `${tailscaleHost}.key`))
			}
		: undefined;

	return {
		plugins: [firebaseClientOnly(), sveltekit()],
		define: {
			__APP_VERSION__: JSON.stringify(pkg.version)
		},
		ssr: {
			// @number-flow/svelte ships .svelte files in dist/ that Node can't import directly
			// force Vite to bundle it so the svelte plugin processes those files during SSR
			noExternal: ['@number-flow/svelte']
		},
		server: {
			host: '0.0.0.0',
			port: DEV_PORT,
			strictPort: true,
			allowedHosts: [tailscaleShortHost, tailscaleHost],
			...(https ? { https } : {})
		},
		test: {
			include: ['tests/unit/**/*.test.ts'],
			environment: 'jsdom',
			globals: true,
			// vitest 4 stopped resetting vi.fn() mocks in restoreAllMocks, so call history leaks between tests
			clearMocks: true,
			setupFiles: ['tests/setup.ts']
		},
		worker: {
			format: 'es'
		}
	};
});
