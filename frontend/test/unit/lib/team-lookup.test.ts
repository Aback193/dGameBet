import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { TeamData } from '@/types/team';

const mockTeams: TeamData[] = [
	{
		id: '1',
		name: 'FC Barcelona',
		shortName: 'Barcelona',
		country: 'Spain',
		league: 'La Liga',
		badgeUrl: 'https://example.com/barcelona.png',
		keywords: 'Barça',
	},
	{
		id: '2',
		name: 'Manchester United',
		shortName: 'Man Utd',
		country: 'England',
		league: 'Premier League',
		badgeUrl: 'https://example.com/manutd.png',
		keywords: 'Red Devils',
	},
	{
		id: '3',
		name: 'Real Madrid',
		shortName: 'Madrid',
		country: 'Spain',
		league: 'La Liga',
		badgeUrl: 'https://example.com/realmadrid.png',
		keywords: 'Los Blancos',
	},
];

describe('team-lookup', () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	let getTeamBadgeUrl: typeof import('@/lib/team-lookup').getTeamBadgeUrl;
	let useTeamBadgeUrl: typeof import('@/lib/team-lookup').useTeamBadgeUrl;

	beforeEach(async () => {
		// Clear module cache and reset mocks
		vi.resetModules();
		vi.restoreAllMocks();

		fetchMock = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockTeams),
			} as Response),
		);
		global.fetch = fetchMock;

		// Re-import the module to get fresh instances
		const module = await import('@/lib/team-lookup');
		getTeamBadgeUrl = module.getTeamBadgeUrl;
		useTeamBadgeUrl = module.useTeamBadgeUrl;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	describe('getTeamBadgeUrl', () => {
		it('returns badge URL for exact name match (case-insensitive)', async () => {
			const url = await getTeamBadgeUrl('FC Barcelona');
			expect(url).toBe('https://example.com/barcelona.png');
		});

		it('returns badge URL for exact name match with different case', async () => {
			const url = await getTeamBadgeUrl('fc barcelona');
			expect(url).toBe('https://example.com/barcelona.png');
		});

		it('returns badge URL for short name match', async () => {
			const url = await getTeamBadgeUrl('Barcelona');
			expect(url).toBe('https://example.com/barcelona.png');
		});

		it('returns badge URL for short name with different case', async () => {
			const url = await getTeamBadgeUrl('BARCELONA');
			expect(url).toBe('https://example.com/barcelona.png');
		});

		it('returns null for unknown team', async () => {
			const url = await getTeamBadgeUrl('Unknown Team');
			expect(url).toBeNull();
		});

		it('returns null for empty string', async () => {
			const url = await getTeamBadgeUrl('');
			expect(url).toBeNull();
		});

		it('handles whitespace in team names', async () => {
			const url = await getTeamBadgeUrl('  FC Barcelona  ');
			expect(url).toBe('https://example.com/barcelona.png');
		});

		it('caches data and does not fetch twice', async () => {
			await getTeamBadgeUrl('FC Barcelona');
			await getTeamBadgeUrl('Manchester United');

			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it('handles fetch failure gracefully', async () => {
			fetchMock.mockImplementationOnce(() =>
				Promise.resolve({
					ok: false,
					statusText: 'Not Found',
				} as Response),
			);

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const url = await getTeamBadgeUrl('FC Barcelona');
			expect(url).toBeNull();
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('handles JSON parse error gracefully', async () => {
			fetchMock.mockImplementationOnce(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.reject(new Error('Invalid JSON')),
				} as Response),
			);

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const url = await getTeamBadgeUrl('FC Barcelona');
			expect(url).toBeNull();
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('resolves multiple teams correctly', async () => {
			const url1 = await getTeamBadgeUrl('FC Barcelona');
			const url2 = await getTeamBadgeUrl('Manchester United');
			const url3 = await getTeamBadgeUrl('Real Madrid');

			expect(url1).toBe('https://example.com/barcelona.png');
			expect(url2).toBe('https://example.com/manutd.png');
			expect(url3).toBe('https://example.com/realmadrid.png');
		});
	});

	describe('useTeamBadgeUrl', () => {
		it('returns null initially and then the badge URL', async () => {
			const { result } = renderHook(() => useTeamBadgeUrl('FC Barcelona'));

			expect(result.current).toBeNull();

			await waitFor(
				() => {
					expect(result.current).toBe('https://example.com/barcelona.png');
				},
				{ timeout: 3000 },
			);
		});

		it('returns null for empty team name', async () => {
			const { result } = renderHook(() => useTeamBadgeUrl(''));

			await waitFor(() => {
				expect(result.current).toBeNull();
			});
		});

		it('returns null for unknown team', async () => {
			const { result } = renderHook(() => useTeamBadgeUrl('Unknown Team'));

			await waitFor(
				() => {
					expect(result.current).toBeNull();
				},
				{ timeout: 3000 },
			);
		});

		it('updates when team name changes', async () => {
			const { result, rerender } = renderHook(
				({ teamName }) => useTeamBadgeUrl(teamName),
				{
					initialProps: { teamName: 'FC Barcelona' },
				},
			);

			await waitFor(
				() => {
					expect(result.current).toBe('https://example.com/barcelona.png');
				},
				{ timeout: 3000 },
			);

			rerender({ teamName: 'Manchester United' });

			await waitFor(
				() => {
					expect(result.current).toBe('https://example.com/manutd.png');
				},
				{ timeout: 3000 },
			);
		});

		it('handles case-insensitive lookup', async () => {
			const { result } = renderHook(() => useTeamBadgeUrl('fc barcelona'));

			await waitFor(
				() => {
					expect(result.current).toBe('https://example.com/barcelona.png');
				},
				{ timeout: 3000 },
			);
		});

		it('handles short name lookup', async () => {
			const { result } = renderHook(() => useTeamBadgeUrl('Barcelona'));

			await waitFor(
				() => {
					expect(result.current).toBe('https://example.com/barcelona.png');
				},
				{ timeout: 3000 },
			);
		});

		it('cleans up on unmount', async () => {
			const { unmount } = renderHook(() => useTeamBadgeUrl('FC Barcelona'));

			unmount();

			// No errors should occur
			expect(true).toBe(true);
		});
	});
});
