<script lang="ts">
	import { page } from '$app/state';
	import Logo from './Logo.svelte';
	import UserMenu from './UserMenu.svelte';
	import AuthButton from './AuthButton.svelte';
	import { authStore } from '$stores/auth.svelte';

	// controls the mobile menu visibility
	let mobileOpen = $state(false);

	// highlight the active route
	const currentPath = $derived(page.url.pathname);
</script>

<nav class="navbar">
	<div class="nav-inner">
		<Logo size="sm" />

		<div class="nav-links" class:open={mobileOpen}>
			<a
				href="/"
				class="nav-link"
				class:active={currentPath === '/'}
				aria-current={currentPath === '/' ? 'page' : undefined}>Scanner</a
			>
			<!-- auth slot hidden in anonymous self-host ('none' mode) since there's
			     no sign-in to offer. shown when auth is required (firebase, ldap, or
			     global password); the UserMenu / AuthButton split applies to all. -->
			{#if authStore.requiresAuth && !authStore.loading}
				{#if authStore.isAuthenticated}
					<UserMenu />
				{:else}
					<AuthButton />
				{/if}
			{/if}
		</div>

		<!-- mobile hamburger -->
		<button
			class="nav-toggle"
			onclick={() => (mobileOpen = !mobileOpen)}
			aria-label="toggle navigation"
		>
			<span class="bar" class:open={mobileOpen}></span>
			<span class="bar" class:open={mobileOpen}></span>
			<span class="bar" class:open={mobileOpen}></span>
		</button>
	</div>
</nav>

<style>
	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		padding: 0.875rem 2rem;
		background: rgba(10, 10, 20, 0.85);
		backdrop-filter: blur(24px);
		border-bottom: 1px solid var(--glass-border);
	}

	.nav-inner {
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.nav-link {
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		transition: color 0.2s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--text-primary);
	}

	.nav-toggle {
		display: none;
		flex-direction: column;
		gap: 4px;
		background: none;
		border: none;
		cursor: pointer;
		/* 44x44 meets WCAG 2.5.5 touch target size recommendation.
		   bars are 20x2px; the extra padding makes up the difference. */
		min-width: 44px;
		min-height: 44px;
		padding: 12px;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
	}

	.bar {
		width: 20px;
		height: 2px;
		background: var(--text-secondary);
		border-radius: 1px;
		transition:
			transform 0.3s ease,
			opacity 0.3s ease;
	}

	.bar.open:nth-child(1) {
		transform: rotate(45deg) translate(4px, 4px);
	}
	.bar.open:nth-child(2) {
		opacity: 0;
	}
	.bar.open:nth-child(3) {
		transform: rotate(-45deg) translate(4px, -4px);
	}

	@media (max-width: 640px) {
		.nav-toggle {
			display: flex;
		}

		.nav-links {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			flex-direction: column;
			padding: 1.5rem 2rem;
			background: rgba(10, 10, 20, 0.98);
			backdrop-filter: blur(24px);
			border-bottom: 1px solid var(--glass-border);
			gap: 1rem;
			display: none;
		}

		.nav-links.open {
			display: flex;
		}
	}
</style>
