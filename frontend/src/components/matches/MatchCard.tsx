'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatEth, formatDate, formatAddress } from '@/lib/utils';
import { useTeamBadgeUrl } from '@/lib/team-lookup';
import { type Match } from '@/types/match';

interface MatchCardProps {
  match: Match;
  rating?: readonly [bigint, bigint];
}

export const MatchCard = memo(function MatchCard({ match, rating }: MatchCardProps) {
  const isActive = !match.isCompleted && BigInt(match.matchStartTime) > BigInt(Math.floor(Date.now() / 1000));
  const teamABadge = useTeamBadgeUrl(match.teamA);
  const teamBBadge = useTeamBadgeUrl(match.teamB);

  return (
    <Link href={`/matches/${match.contractAddress}`}>
      <Card variant="interactive" className="h-full group">
        <div className="flex items-center justify-between mb-4">
          <Badge variant={isActive ? 'success' : match.isCompleted ? 'default' : 'warning'}>
            {isActive ? 'Active' : match.isCompleted ? 'Completed' : 'Started'}
          </Badge>
          <span className="text-xs text-foreground-subtle">{formatAddress(match.contractAddress)}</span>
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center flex-1">
            <div className="flex justify-center mb-2">
              {teamABadge ? (
                <Image
                  src={teamABadge}
                  alt={`${match.teamA} badge`}
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Shield className="w-8 h-8 text-[color:var(--muted-icon)]" />
              )}
            </div>
            <p className="font-semibold text-lg">{match.teamA}</p>
          </div>
          <div className="text-foreground-subtle font-bold text-xl">VS</div>
          <div className="text-center flex-1">
            <div className="flex justify-center mb-2">
              {teamBBadge ? (
                <Image
                  src={teamBBadge}
                  alt={`${match.teamB} badge`}
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Shield className="w-8 h-8 text-[color:var(--muted-icon)]" />
              )}
            </div>
            <p className="font-semibold text-lg">{match.teamB}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-foreground-muted">Bet Amount</p>
            <p className="font-medium">{formatEth(match.betAmount)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Start Time</p>
            <p className="font-medium">{formatDate(Number(match.matchStartTime))}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-foreground-subtle">
          <span>Organizer: {formatAddress(match.organizer)}</span>
          {rating && Number(rating[1]) > 0 && (
            <span className="text-yellow-400 flex items-center gap-1">
              <Star size={12} fill="currentColor" /> {(Number(rating[0]) / 100).toFixed(1)}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
});
