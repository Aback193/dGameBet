'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { TeamData } from '@/types/team';

/**
 * Hook for searching teams with fuzzy matching using Fuse.js
 * @param query - Search query string
 * @returns Array of matching teams (max 8 results)
 */
export function useTeamSearch(query: string): TeamData[] {
	const [teams, setTeams] = useState<TeamData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const fuseRef = useRef<any>(null);

	// Load teams data and initialize Fuse.js once
	useEffect(() => {
		let mounted = true;

		async function loadData() {
			try {
				// Fetch teams data
				const response = await fetch('/data/teams.json');
				if (!response.ok) {
					console.warn('Failed to load teams data:', response.statusText);
					setIsLoading(false);
					return;
				}

				const data: TeamData[] = await response.json();

				if (!mounted) return;

				// Lazy-load Fuse.js for code splitting
				const Fuse = (await import('fuse.js')).default;

				// Initialize Fuse with weighted search keys
				fuseRef.current = new Fuse(data, {
					keys: [
						{ name: 'name', weight: 1.0 },
						{ name: 'shortName', weight: 0.8 },
						{ name: 'keywords', weight: 0.6 },
					],
					threshold: 0.35, // Allow minor typos
					includeScore: true,
					minMatchCharLength: 2,
				});

				setTeams(data);
				setIsLoading(false);
			} catch (error) {
				console.error('Error loading teams data:', error);
				if (mounted) {
					setIsLoading(false);
				}
			}
		}

		loadData();

		return () => {
			mounted = false;
		};
	}, []);

	// Perform fuzzy search on query change
	const results = useMemo(() => {
		if (!query || query.length < 2 || !fuseRef.current) {
			return [];
		}

		const searchResults = fuseRef.current.search(query);
		return searchResults.slice(0, 8).map((result: any) => result.item);
	}, [query]);

	// Return empty array if still loading or no query
	if (isLoading || !query || query.length < 2) {
		return [];
	}

	return results;
}
