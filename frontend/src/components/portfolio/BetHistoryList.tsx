'use client';

import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatEth, formatPnL, formatGas, getOutcomeBadgeVariant, getOutcomeLabel } from '@/lib/utils';
import { MoneyFlowRow } from './MoneyFlowRow';
import type { PortfolioEntry, MoneyFlowEntry, MoneyFlowSummary } from '@/types/match';

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis', total];
  if (current >= total - 3) return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

interface BetHistoryRowProps {
  entry: PortfolioEntry;
  gasMap?: Map<string, bigint>;
}

const outcomeIcon = {
  won: <TrendingUp className="w-5 h-5 text-green-400" />,
  lost: <TrendingDown className="w-5 h-5 text-red-400" />,
  draw: <Minus className="w-5 h-5 text-gray-400" />,
};

const BetHistoryRow = memo(function BetHistoryRow({ entry, gasMap }: BetHistoryRowProps) {
  const dateStr = new Date(entry.matchStartTime * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const hasOrgFee = entry.organizerFeeOffset > 0n;
  const gasCost = gasMap?.get(entry.contractAddress.toLowerCase()) ?? entry.gasCost;
  const hasGas = gasCost > 0n;
  const effectivePnL = entry.netPnL + entry.organizerFeeOffset;
  const hasUnclaimed = entry.unclaimed > 0n;

  const pnlColor =
    effectivePnL > 0n
      ? 'text-green-400'
      : effectivePnL < 0n
        ? 'text-red-400'
        : 'text-foreground-subtle';

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">{outcomeIcon[entry.outcome]}</div>
        <div className="min-w-0">
          <p className="font-medium truncate">
            {entry.teamA} vs {entry.teamB}
          </p>
          <p className="text-xs text-foreground-subtle">{dateStr}</p>
          {hasGas && (
            <p className="text-xs text-orange-400">gas: -{formatGas(gasCost)}</p>
          )}
          {hasOrgFee && (
            <p className="text-xs text-purple-400">incl. {formatPnL(entry.organizerFeeOffset)} org fee</p>
          )}
          {hasUnclaimed && (
            <p className="text-xs text-yellow-400">{formatEth(entry.unclaimed)} unclaimed</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-sm text-foreground-muted">{formatEth(entry.wagered)}</p>
          <p className={`text-sm font-mono font-semibold ${pnlColor}`}>
            {formatPnL(effectivePnL)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={getOutcomeBadgeVariant(entry.outcome)}>
            {getOutcomeLabel(entry.outcome)}
          </Badge>
          {hasUnclaimed && (
            <Badge variant="warning">Unclaimed</Badge>
          )}
        </div>
      </div>
    </div>
  );
});

interface BetHistoryListProps {
  entries: PortfolioEntry[];
  gasMap?: Map<string, bigint>;
  timeline?: MoneyFlowEntry[];
  timelineSummary?: MoneyFlowSummary;
  isLoading?: boolean;
  timelineError?: Error | null;
}

type FilterType = 'all' | 'bets' | 'claims' | 'organizer';

export function BetHistoryList({
  entries,
  gasMap,
  timeline = [],
  timelineSummary,
  isLoading = false,
  timelineError,
}: BetHistoryListProps) {
  const hasTimeline = timeline.length > 0;
  const hasSummary = entries.length > 0;

  const [timelinePage, setTimelinePage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortNewest, setSortNewest] = useState(true);

  if (isLoading) {
    return (
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Bet History</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start justify-between py-4">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="w-5 h-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!hasTimeline && !hasSummary && !timelineError) {
    return (
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Bet History</h2>
        <p className="text-foreground-muted text-center py-8">No activity yet.</p>
      </Card>
    );
  }

  // Filter timeline entries
  const filteredTimeline = timeline.filter((entry) => {
    if (filter === 'all') return true;
    if (filter === 'bets') return entry.type === 'place_bet';
    if (filter === 'claims') return entry.type === 'claim_prize' || entry.type === 'claim_refund';
    if (filter === 'organizer')
      return (
        entry.type === 'create_match' ||
        entry.type === 'set_result' ||
        entry.type === 'organizer_fee' ||
        entry.type === 'organizer_fee_failed'
      );
    return true;
  });

  // Sort timeline entries
  const sortedTimeline = [...filteredTimeline].sort((a, b) => {
    const blockDiff = a.blockNumber !== b.blockNumber
      ? (a.blockNumber < b.blockNumber ? -1 : 1)
      : a.logIndex - b.logIndex;
    return sortNewest ? -blockDiff : blockDiff;
  });

  const totalTimelinePages = Math.max(1, Math.ceil(sortedTimeline.length / PAGE_SIZE));
  const safeTimelinePage = Math.min(timelinePage, totalTimelinePages);
  const visibleTimeline = sortedTimeline.slice((safeTimelinePage - 1) * PAGE_SIZE, safeTimelinePage * PAGE_SIZE);

  // Summary fallback
  const reversed = [...entries].reverse();
  const totalSummaryPages = Math.max(1, Math.ceil(reversed.length / PAGE_SIZE));
  const safeSummaryPage = Math.min(summaryPage, totalSummaryPages);
  const visible = reversed.slice((safeSummaryPage - 1) * PAGE_SIZE, safeSummaryPage * PAGE_SIZE);

  return (
    <Card className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Bet History</h2>

      {/* Timeline error state */}
      {timelineError && !hasTimeline && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-400">Could not load transaction details with gas fees.</p>
            <p className="text-xs text-foreground-subtle mt-1 truncate">
              {timelineError.message || 'RPC error — could not fetch deploy block from factory contract'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Primary: Timeline view (money-flow entries with gas fees) */}
      {hasTimeline && (
        <>
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setFilter('all'); setTimelinePage(1); }}
            >
              All ({timeline.length})
            </Button>
            <Button
              variant={filter === 'bets' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setFilter('bets'); setTimelinePage(1); }}
            >
              Bets ({timeline.filter((e) => e.type === 'place_bet').length})
            </Button>
            <Button
              variant={filter === 'claims' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setFilter('claims'); setTimelinePage(1); }}
            >
              Claims (
              {
                timeline.filter((e) => e.type === 'claim_prize' || e.type === 'claim_refund')
                  .length
              }
              )
            </Button>
            <Button
              variant={filter === 'organizer' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setFilter('organizer'); setTimelinePage(1); }}
            >
              Organizer (
              {
                timeline.filter(
                  (e) =>
                    e.type === 'create_match' ||
                    e.type === 'set_result' ||
                    e.type === 'organizer_fee' ||
                    e.type === 'organizer_fee_failed'
                ).length
              }
              )
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSortNewest(!sortNewest); setTimelinePage(1); }}
            >
              {sortNewest ? 'Newest First' : 'Oldest First'}
            </Button>
          </div>

          {/* Timeline Entries */}
          <div className="divide-y divide-[var(--border-subtle)]">
            <AnimatePresence mode="popLayout">
              {visibleTimeline.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                >
                  <MoneyFlowRow entry={entry} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {totalTimelinePages > 1 && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <p className="text-xs text-foreground-subtle">
                Showing {(safeTimelinePage - 1) * PAGE_SIZE + 1}–{Math.min(safeTimelinePage * PAGE_SIZE, sortedTimeline.length)} of {sortedTimeline.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimelinePage((p) => Math.max(1, p - 1))}
                  disabled={safeTimelinePage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {getPageNumbers(safeTimelinePage, totalTimelinePages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-1 text-foreground-subtle">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === safeTimelinePage ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setTimelinePage(p as number)}
                      className="min-w-[2rem]"
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimelinePage((p) => Math.min(totalTimelinePages, p + 1))}
                  disabled={safeTimelinePage === totalTimelinePages}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Timeline Summary Footer */}
          {timelineSummary && (
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Gas Spent</p>
                <p className="text-sm font-mono font-semibold text-orange-400">
                  -{formatGas(timelineSummary.totalGasSpent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Value In</p>
                <p className="text-sm font-mono font-semibold text-green-400">
                  +{formatPnL(timelineSummary.totalValueIn).replace(/^\+/, '')}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Value Out</p>
                <p className="text-sm font-mono font-semibold text-red-400">
                  -{formatPnL(timelineSummary.totalValueOut).replace(/^\+/, '')}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Net Position</p>
                <p
                  className={`text-sm font-mono font-semibold ${
                    timelineSummary.netPosition >= 0n ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {formatPnL(timelineSummary.netPosition)}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fallback: Summary view when timeline not available */}
      {!hasTimeline && hasSummary && (
        <>
          <div className="divide-y divide-[var(--border-subtle)]">
            <AnimatePresence mode="popLayout">
              {visible.map((entry, index) => (
                <motion.div
                  key={entry.contractAddress}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                >
                  <BetHistoryRow entry={entry} gasMap={gasMap} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {totalSummaryPages > 1 && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <p className="text-xs text-foreground-subtle">
                Showing {(safeSummaryPage - 1) * PAGE_SIZE + 1}–{Math.min(safeSummaryPage * PAGE_SIZE, reversed.length)} of {reversed.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                  disabled={safeSummaryPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {getPageNumbers(safeSummaryPage, totalSummaryPages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-1 text-foreground-subtle">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === safeSummaryPage ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setSummaryPage(p as number)}
                      className="min-w-[2rem]"
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSummaryPage((p) => Math.min(totalSummaryPages, p + 1))}
                  disabled={safeSummaryPage === totalSummaryPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
