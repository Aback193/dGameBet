'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { BET_FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts';
import { useAllMatches } from '@/hooks/useMatches';
import { usePortfolio } from '@/hooks/usePortfolio';
import { formatAddress, formatPnL } from '@/lib/utils';
import { BetHistoryList } from '@/components/portfolio/BetHistoryList';
import { PortfolioChartSkeleton } from '@/components/portfolio/PortfolioChartSkeleton';

const PortfolioChart = dynamic(
  () => import('@/components/portfolio/PortfolioChart').then((m) => m.PortfolioChart),
  {
    ssr: false,
    loading: () => <PortfolioChartSkeleton />,
  }
);

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 28 : size === 'md' ? 20 : 16;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={iconSize}
          className={star <= Math.round(rating) ? 'text-yellow-400' : 'text-[color:var(--muted-icon)]'}
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

function AddressAvatar({ address }: { address: string }) {
  const hue1 = parseInt(address.slice(2, 8), 16) % 360;
  const hue2 = (hue1 + 120) % 360;
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 50%))`,
      }}
    >
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();

  const { data: rating } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'getOrganizerRating',
    args: address ? [address] : undefined,
    query: { refetchInterval: 15_000 },
  });

  const { matches: allMatches, isLoading: matchesLoading } = useAllMatches();

  const stats = useMemo(() => {
    if (!allMatches.length || !address) return { organized: 0, organizedCompleted: 0 };
    const userAddr = address.toLowerCase();
    const organized = allMatches.filter((m) => m.organizer.toLowerCase() === userAddr);
    return {
      organized: organized.length,
      organizedCompleted: organized.filter((m) => m.isCompleted).length,
    };
  }, [allMatches, address]);

  const { entries, chartData, summary, gasMap, timeline, timelineSummary, timelineError, isLoading: portfolioLoading } = usePortfolio();

  if (!isConnected || !address) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Card>
          <p className="text-foreground-muted text-lg py-8">Connect your wallet to view your profile.</p>
        </Card>
      </div>
    );
  }

  const avgRating = rating ? Number(rating[0]) / 100 : 0;
  const ratingCount = rating ? Number(rating[1]) : 0;

  const displayNetPosition = timelineSummary?.netPosition ?? summary.netPosition;
  const displayIsProfitable = displayNetPosition >= 0n;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Profile Header */}
      <Card className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <AddressAvatar address={address} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold truncate">{formatAddress(address)}</h1>
              <Badge variant="info">Sepolia</Badge>
            </div>
            <p className="font-mono text-xs text-foreground-subtle break-all">{address}</p>
            {ratingCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={avgRating} size="sm" />
                <span className="text-yellow-400 font-semibold text-sm">{avgRating.toFixed(1)}</span>
                <span className="text-foreground-subtle text-xs">({ratingCount} rating{ratingCount !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Unclaimed Banner */}
      {!portfolioLoading && summary.totalUnclaimed > 0n && (
        <div className="mb-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-yellow-400">Unclaimed Prizes</p>
            <p className="text-xs text-foreground-subtle mt-0.5">
              You have {formatPnL(summary.totalUnclaimed).replace(/^\+/, '')} waiting to be claimed on-chain.
            </p>
          </div>
          <a href="/matches?tab=mybets" className="text-sm font-medium text-yellow-400 hover:text-yellow-300 transition shrink-0">
            Claim Now &rarr;
          </a>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs text-foreground-muted uppercase tracking-wider">Organized</p>
          <p className="text-2xl font-bold mt-1">
            {matchesLoading ? <Spinner size="sm" /> : stats.organized}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-foreground-muted uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold mt-1">
            {matchesLoading ? <Spinner size="sm" /> : stats.organizedCompleted}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-foreground-muted uppercase tracking-wider">Win Rate</p>
          <p className={`text-2xl font-bold mt-1 ${portfolioLoading ? '' : parseFloat(summary.winRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {portfolioLoading ? <Spinner size="sm" /> : `${summary.winRate}%`}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-foreground-muted uppercase tracking-wider">Net P&amp;L</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${portfolioLoading ? '' : displayIsProfitable ? 'text-green-400' : 'text-red-400'}`}>
            {portfolioLoading ? <Spinner size="sm" /> : formatPnL(displayNetPosition)}
          </p>
          {!portfolioLoading && summary.totalUnclaimed > 0n && (
            <p className="text-xs text-yellow-400 mt-1 font-mono">
              +{formatPnL(summary.totalUnclaimed).replace(/^\+/, '')} unclaimed
            </p>
          )}
        </Card>
      </div>

      {/* Portfolio Growth Chart */}
      {portfolioLoading ? (
        <PortfolioChartSkeleton />
      ) : (
        <PortfolioChart
          data={chartData}
          currentPnL={formatPnL(displayNetPosition)}
          isProfitable={displayIsProfitable}
        />
      )}

      {/* Bet History */}
      <BetHistoryList
        entries={entries}
        gasMap={gasMap}
        timeline={timeline}
        timelineSummary={timelineSummary}
        isLoading={portfolioLoading}
        timelineError={timelineError}
      />

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/matches" className="p-4 rounded-lg bg-surface-2 hover:bg-surface-3 transition text-center">
            <p className="font-medium">Browse Matches</p>
            <p className="text-sm text-foreground-muted">Find active betting markets</p>
          </a>
          <a href="/create" className="p-4 rounded-lg bg-surface-2 hover:bg-surface-3 transition text-center">
            <p className="font-medium">Create Match</p>
            <p className="text-sm text-foreground-muted">Deploy a new betting market</p>
          </a>
          <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer"
            className="p-4 rounded-lg bg-surface-2 hover:bg-surface-3 transition text-center">
            <p className="font-medium">View on Etherscan</p>
            <p className="text-sm text-foreground-muted">See your on-chain activity</p>
          </a>
        </div>
      </Card>
    </motion.div>
  );
}
