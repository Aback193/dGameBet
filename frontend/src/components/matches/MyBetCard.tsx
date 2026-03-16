'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, X, ArrowLeftRight, MoreHorizontal, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatEth, formatDate, formatAddress, getOutcomeLabel, getOutcomeBadgeVariant } from '@/lib/utils';
import { type UserBetMatch, type BetOutcome, MatchResult } from '@/types/match';
import { deriveTeamOutcome } from '@/hooks/useUserBets';
import { useTeamBadgeUrl } from '@/lib/team-lookup';

const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

interface MyBetCardProps {
  bet: UserBetMatch;
}

const outcomeStyles: Record<BetOutcome, { border: string; bg: string }> = {
  won:     { border: 'border-green-500/30', bg: 'bg-green-500/5' },
  lost:    { border: 'border-red-500/30',   bg: 'bg-red-500/5' },
  draw:    { border: 'border-gray-500/30',  bg: 'bg-gray-500/5' },
  pending: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5' },
};

const teamOutcomeColors: Record<BetOutcome, string> = {
  won:     'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
  lost:    'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
  draw:    'bg-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-400',
  pending: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
};

const teamOutcomeIcons: Record<BetOutcome, ReactNode> = {
  won: <Check size={14} />,
  lost: <X size={14} />,
  draw: <ArrowLeftRight size={14} />,
  pending: <MoreHorizontal size={14} />,
};

export const MyBetCard = memo(function MyBetCard({ bet }: MyBetCardProps) {
  const style = outcomeStyles[bet.outcome];
  const totalPool = bet.totalPoolTeamA + bet.totalPoolTeamB;

  const teamABadge = useTeamBadgeUrl(bet.teamA);
  const teamBBadge = useTeamBadgeUrl(bet.teamB);

  const teamAOutcome = deriveTeamOutcome(
    bet.teamABet,
    bet.result === MatchResult.TeamAWins,
    bet.result,
  );
  const teamBOutcome = deriveTeamOutcome(
    bet.teamBBet,
    bet.result === MatchResult.TeamBWins,
    bet.result,
  );

  return (
    <Link href={`/matches/${bet.contractAddress}`}>
      <div className={`rounded-xl border p-6 ${style.border} ${style.bg} hover:brightness-110 transition-all cursor-pointer h-full`}>
        <div className="flex items-center justify-between mb-4">
          <Badge variant={getOutcomeBadgeVariant(bet.outcome)}>
            {getOutcomeLabel(bet.outcome)}
          </Badge>
          <span className="text-xs text-foreground-subtle">{formatAddress(bet.contractAddress)}</span>
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center flex-1">
            <div className="flex justify-center mb-2">
              {teamABadge ? (
                <Image
                  src={teamABadge}
                  alt={`${bet.teamA} badge`}
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Shield className="w-8 h-8 text-[color:var(--muted-icon)]" />
              )}
            </div>
            <p className="font-semibold text-lg">{bet.teamA}</p>
          </div>
          <div className="text-foreground-subtle font-bold text-xl">VS</div>
          <div className="text-center flex-1">
            <div className="flex justify-center mb-2">
              {teamBBadge ? (
                <Image
                  src={teamBBadge}
                  alt={`${bet.teamB} badge`}
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Shield className="w-8 h-8 text-[color:var(--muted-icon)]" />
              )}
            </div>
            <p className="font-semibold text-lg">{bet.teamB}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-xs text-foreground-muted uppercase tracking-wider">Your Bets</p>
          {bet.teamABet > ZERO && (
            <div className={`flex justify-between items-center p-2.5 rounded-lg border ${teamOutcomeColors[teamAOutcome]}`}>
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{teamOutcomeIcons[teamAOutcome]}</span>
                <span className="text-sm">{bet.teamA}</span>
              </span>
              <span className="font-mono text-sm">{formatEth(bet.teamABet)}</span>
            </div>
          )}
          {bet.teamBBet > ZERO && (
            <div className={`flex justify-between items-center p-2.5 rounded-lg border ${teamOutcomeColors[teamBOutcome]}`}>
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{teamOutcomeIcons[teamBOutcome]}</span>
                <span className="text-sm">{bet.teamB}</span>
              </span>
              <span className="font-mono text-sm">{formatEth(bet.teamBBet)}</span>
            </div>
          )}
        </div>

        {totalPool > ZERO && (
          <div className="mb-4">
            <div className="flex rounded-full overflow-hidden h-2 bg-[var(--hover-overlay-strong)]">
              <div
                className="bg-primary-500 transition-all duration-700 ease-out"
                style={{ width: `${Number((bet.totalPoolTeamA * HUNDRED) / totalPool)}%` }}
              />
              <div
                className="bg-accent-500 transition-all duration-700 ease-out"
                style={{ width: `${Number((bet.totalPoolTeamB * HUNDRED) / totalPool)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-foreground-subtle mt-1">
              <span>{formatEth(bet.totalPoolTeamA)}</span>
              <span>{formatEth(bet.totalPoolTeamB)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-foreground-muted">Bet Amount</p>
            <p className="font-medium">{formatEth(bet.betAmount)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Start Time</p>
            <p className="font-medium">{formatDate(Number(bet.matchStartTime))}</p>
          </div>
        </div>

        {(bet.outcome === 'won' || bet.outcome === 'draw') && (
          <div className="mt-3 pt-3 border-t border-[color:var(--border)] flex items-center justify-between text-sm">
            <span className="text-foreground-muted">
              {bet.outcome === 'won' ? 'Prize:' : 'Refund:'}
              <span className={`ml-1 font-mono ${bet.outcome === 'won' ? 'text-green-400' : 'text-foreground-muted'}`}>
                {formatEth(bet.prize)}
              </span>
            </span>
            <Badge variant={bet.hasClaimed ? 'success' : 'warning'}>
              {bet.hasClaimed ? 'Claimed' : 'Unclaimed'}
            </Badge>
          </div>
        )}

        {bet.outcome === 'pending' && (
          <div className="mt-3 pt-3 border-t border-[color:var(--border)]">
            <p className="text-sm text-yellow-400/70">Awaiting result...</p>
          </div>
        )}
      </div>
    </Link>
  );
});
