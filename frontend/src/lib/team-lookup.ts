'use client';

import { useState, useEffect } from 'react';
import type { TeamData } from '@/types/team';

/**
 * Module-level cache for team badge URLs
 * Key: lowercase team name or short name
 * Value: badge URL
 */
let badgeCache: Map<string, string> | null = null;
let cachePromise: Promise<void> | null = null;

/**
 * Load teams data and build the badge cache
 */
async function loadBadgeCache(): Promise<void> {
	if (badgeCache) return;

	try {
		const response = await fetch('/data/teams.json');
		if (!response.ok) {
			console.warn('Failed to load teams data for badge lookup');
			badgeCache = new Map();
			return;
		}

		const teams: TeamData[] = await response.json();
		badgeCache = new Map();

		for (const team of teams) {
			const nameLower = team.name.toLowerCase();
			const shortNameLower = team.shortName.toLowerCase();

			badgeCache.set(nameLower, team.badgeUrl);
			if (shortNameLower && shortNameLower !== nameLower) {
				badgeCache.set(shortNameLower, team.badgeUrl);
			}
		}
	} catch (error) {
		console.error('Error loading badge cache:', error);
		badgeCache = new Map();
	}
}

/**
 * Get the badge URL for a team name (async)
 * @param teamName - Team name to look up
 * @returns Badge URL or null if not found
 */
export async function getTeamBadgeUrl(teamName: string): Promise<string | null> {
	if (!cachePromise) {
		cachePromise = loadBadgeCache();
	}

	await cachePromise;

	if (!badgeCache || !teamName) return null;

	const nameLower = teamName.toLowerCase().trim();
	return badgeCache.get(nameLower) || null;
}

/**
 * React hook to get the badge URL for a team name
 * @param teamName - Team name to look up
 * @returns Badge URL or null if not found (null during initial load)
 */
export function useTeamBadgeUrl(teamName: string): string | null {
	const [badgeUrl, setBadgeUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!teamName) {
			setBadgeUrl(null);
			return;
		}

		let mounted = true;

		getTeamBadgeUrl(teamName).then((url) => {
			if (mounted) {
				setBadgeUrl(url);
			}
		});

		return () => {
			mounted = false;
		};
	}, [teamName]);

	return badgeUrl;
}
