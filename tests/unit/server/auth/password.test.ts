import { describe, expect, it } from 'vitest';
import {
	verifyGlobalPassword,
	GLOBAL_PASSWORD_USER
} from '../../../../src/lib/server/auth/password';

describe('verifyGlobalPassword', () => {
	it('accepts an exact match', async () => {
		expect(await verifyGlobalPassword('correct-horse', 'correct-horse')).toBe(true);
	});

	it('rejects a mismatch', async () => {
		expect(await verifyGlobalPassword('correct-horse', 'wrong')).toBe(false);
	});

	it('rejects empty against a set password', async () => {
		expect(await verifyGlobalPassword('correct-horse', '')).toBe(false);
	});

	it('is case-sensitive', async () => {
		expect(await verifyGlobalPassword('Secret', 'secret')).toBe(false);
	});
});

describe('GLOBAL_PASSWORD_USER', () => {
	it('exposes a stable synthetic subject for session + history', () => {
		expect(GLOBAL_PASSWORD_USER.sub).toBe('global-password');
		expect(GLOBAL_PASSWORD_USER.name).toBe('Authenticated');
	});
});
