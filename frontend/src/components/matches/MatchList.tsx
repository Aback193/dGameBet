'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { useFilteredMatches } from '@/hooks/useMatches';
import { useWebSocket } from '@/hooks/useWebSocket';
import { BET_FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts';
import { AnimatePresence, motion } from 'framer-motion';
import { MatchCard } from './MatchCard';
import { Skeleton } from '@/components/ui/Skeleton';

type SubFilter = 'all' | 'my-organized';

interface MatchListProps {
  filter: 'active' | 'completed';
}

function MatchCardSkeleton() {
  return (
    <div className="card-glass p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-8" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}

export function MatchList({ filter }: MatchListProps) {
  const { matches, isLoading, error, refetch } = useFilteredMatches(filter);
  const { address } = useAccount();
  const [subFilter, setSubFilter] = useState<SubFilter>('all');

  const displayedMatches = useMemo(() => {
    if (filter !== 'completed' || subFilter === 'all') return matches;
    if (!address) return [];
    return matches.filter(
      (m) => m.organizer.toLowerCase() === address.toLowerCase()
    );
  }, [matches, filter, subFilter, address]);

  const uniqueOrganizers = useMemo(
    () => Array.from(new Set(displayedMatches.map((m) => m.organizer.toLowerCase()))),
    [displayedMatches],
  );

  const ratingContracts = useMemo(
    () =>
      uniqueOrganizers.map((org) => ({
        address: FACTORY_ADDRESS,
        abi: BET_FACTORY_ABI,
        functionName: 'getOrganizerRating' as const,
        args: [org as `0x${string}`] as const,
      })),
    [uniqueOrganizers],
  );

  const { data: ratingsData } = useReadContracts({
    contracts: ratingContracts as any,
    query: { enabled: uniqueOrganizers.length > 0 },
  });

  const ratingsMap = useMemo(() => {
    const map = new Map<string, readonly [bigint, bigint]>();
    if (!ratingsData) return map;
    uniqueOrganizers.forEach((org, i) => {
      const r = ratingsData[i];
      if (r?.status === 'success' && r.result) {
        map.set(org, r.result as readonly [bigint, bigint]);
      }
    });
    return map;
  }, [ratingsData, uniqueOrganizers]);

  const { lastMessage } = useWebSocket(['matches']);

  useEffect(() => {
    if (lastMessage) refetch();
  }, [lastMessage, refetch]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <p>Failed to load matches. Please try again.</p>
      </div>
    );
  }

  return (
    <>
      {filter === 'completed' && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSubFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              subFilter === 'all'
                ? 'bg-[var(--hover-overlay-strong)] text-foreground'
                : 'text-foreground-muted hover:text-foreground hover:bg-[var(--hover-overlay)]'
            }`}
          >
            All Matches
          </button>
          <button
            onClick={() => setSubFilter('my-organized')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              subFilter === 'my-organized'
                ? 'bg-[var(--hover-overlay-strong)] text-foreground'
                : 'text-foreground-muted hover:text-foreground hover:bg-[var(--hover-overlay)]'
            }`}
          >
            My Organized
          </button>
        </div>
      )}

      {displayedMatches.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">
          <p className="text-lg">
            {filter === 'active'
              ? 'No active matches found'
              : subFilter === 'my-organized'
                ? "You haven't organized any completed matches"
                : 'No matches have been completed yet'}
          </p>
          <p className="text-sm mt-2">
            {filter === 'active'
              ? 'Create a new match to get started!'
              : subFilter === 'my-organized' && !address
                ? 'Connect your wallet to see your organized matches.'
                : ''}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {displayedMatches.map((match, index) => (
              <motion.div
                key={match.contractAddress}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
              >
                <MatchCard
                  match={match}
                  rating={ratingsMap.get(match.organizer.toLowerCase())}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
