'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUserBets } from '@/hooks/useUserBets';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AnimatePresence, motion } from 'framer-motion';
import { MyBetCard } from './MyBetCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { type BetOutcome, type UserBetMatch } from '@/types/match';

type SortOption = 'date' | 'outcome' | 'amount';
type FilterOption = 'all' | BetOutcome;

const outcomePriority: Record<BetOutcome, number> = {
  won: 0,
  pending: 1,
  draw: 2,
  lost: 3,
};

function sortBets(bets: UserBetMatch[], sortBy: SortOption): UserBetMatch[] {
  return [...bets].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return Number(b.matchStartTime - a.matchStartTime);
      case 'outcome':
        return outcomePriority[a.outcome] - outcomePriority[b.outcome];
      case 'amount': {
        const totalA = a.teamABet + a.teamBBet;
        const totalB = b.teamABet + b.teamBBet;
        return Number(totalB - totalA);
      }
      default:
        return 0;
    }
  });
}

function BetCardSkeleton() {
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
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-full" />
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

export function MyBetsList() {
  const { isConnected } = useAccount();
  const { bets, isLoading, error, refetch } = useUserBets();
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const { lastMessage } = useWebSocket(['matches']);

  useEffect(() => {
    if (lastMessage) refetch();
  }, [lastMessage, refetch]);

  const filteredAndSorted = useMemo(() => {
    const filtered = filterBy === 'all' ? bets : bets.filter((b) => b.outcome === filterBy);
    return sortBets(filtered, sortBy);
  }, [bets, sortBy, filterBy]);

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔗</div>
        <p className="text-foreground-muted text-lg">Connect your wallet to view your bets.</p>
        <p className="text-foreground-subtle text-sm mt-2">Your betting history will appear here once connected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <BetCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <p>Failed to load your bets. Please try again.</p>
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🎰</div>
        <p className="text-foreground-muted text-lg">You haven&apos;t placed any bets yet</p>
        <p className="text-foreground-subtle text-sm mt-2">Browse active matches and place your first bet!</p>
      </div>
    );
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'date', label: 'Date' },
    { value: 'outcome', label: 'Outcome' },
    { value: 'amount', label: 'Amount' },
  ];

  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
    { value: 'draw', label: 'Draw' },
    { value: 'pending', label: 'Pending' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">Filter:</span>
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filterBy === opt.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilterBy(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">Sort:</span>
          {sortOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={sortBy === opt.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">
          <p>No bets match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAndSorted.map((bet, index) => (
              <motion.div
                key={bet.contractAddress}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
              >
                <MyBetCard bet={bet} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
