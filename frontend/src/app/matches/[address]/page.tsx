'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useReadContracts, useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Clock, Copy, Check, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { BetForm } from '@/components/betting/BetForm';
import { ClaimButton } from '@/components/betting/ClaimButton';
import { SetResultForm } from '@/components/betting/SetResultForm';
import { RateOrganizer } from '@/components/betting/RateOrganizer';
import { BET_MATCH_ABI } from '@/lib/contracts';
import { formatEth, formatDate, formatAddress, getResultLabel, getResultColor } from '@/lib/utils';
import { useTeamBadgeUrl } from '@/lib/team-lookup';
import { MatchResult } from '@/types/match';
import { useWebSocket } from '@/hooks/useWebSocket';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;

function useCountdown(targetTimestamp: number) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = Math.floor(Date.now() / 1000);
      const diff = targetTimestamp - now;
      if (diff <= 0) {
        setTimeLeft('');
        return;
      }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft(
        d > 0
          ? `${d}d ${h}h ${m}m`
          : h > 0
            ? `${h}h ${m}m ${s}s`
            : `${m}m ${s}s`
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTimestamp]);

  return timeLeft;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-foreground-subtle hover:text-foreground-muted transition-colors"
      aria-label="Copy address"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchAddress = params.address as `0x${string}`;
  const { address: userAddress } = useAccount();
  const queryClient = useQueryClient();

  const { lastMessage } = useWebSocket([`match:${matchAddress}`, 'matches']);

  useEffect(() => {
    if (!lastMessage) return;
    const addr = matchAddress.toLowerCase();
    queryClient.invalidateQueries({
      predicate: (query) =>
        JSON.stringify(query.queryKey, (_, v) => typeof v === 'bigint' ? v.toString() : v).toLowerCase().includes(addr),
    });
  }, [lastMessage, queryClient, matchAddress]);

  const userOrZero = userAddress ?? ZERO_ADDR;

  const contracts = useMemo(
    () => [
      {
        address: matchAddress,
        abi: BET_MATCH_ABI,
        functionName: 'getMatchInfo' as const,
      },
      {
        address: matchAddress,
        abi: BET_MATCH_ABI,
        functionName: 'matchId' as const,
      },
      {
        address: matchAddress,
        abi: BET_MATCH_ABI,
        functionName: 'getUserBets' as const,
        args: [userOrZero] as const,
      },
      {
        address: matchAddress,
        abi: BET_MATCH_ABI,
        functionName: 'calculatePrize' as const,
        args: [userOrZero] as const,
      },
      {
        address: matchAddress,
        abi: BET_MATCH_ABI,
        functionName: 'hasClaimed' as const,
        args: [userOrZero] as const,
      },
    ],
    [matchAddress, userOrZero],
  );

  const { data: batchData, isLoading } = useReadContracts({
    contracts: contracts as any,
    query: { refetchInterval: 12_000 },
  });

  type MatchInfoTuple = readonly [string, string, string, bigint, bigint, number, bigint, bigint];
  const matchInfo =
    batchData?.[0]?.status === 'success'
      ? (batchData[0].result as MatchInfoTuple)
      : null;
  const matchIdData =
    batchData?.[1]?.status === 'success' ? (batchData[1].result as bigint) : undefined;
  const userBets =
    userAddress && batchData?.[2]?.status === 'success'
      ? (batchData[2].result as readonly [bigint, bigint])
      : undefined;
  const userPrize =
    userAddress && batchData?.[3]?.status === 'success'
      ? (batchData[3].result as bigint)
      : undefined;
  const hasClaimedData =
    userAddress && batchData?.[4]?.status === 'success'
      ? (batchData[4].result as boolean)
      : undefined;

  const matchStartTime = matchInfo ? Number(matchInfo[3]) : 0;
  const timeLeft = useCountdown(matchStartTime);

  const teamA = matchInfo ? matchInfo[1] : '';
  const teamB = matchInfo ? matchInfo[2] : '';
  const teamABadge = useTeamBadgeUrl(teamA);
  const teamBBadge = useTeamBadgeUrl(teamB);

  if (isLoading || !matchInfo) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-glass p-6 space-y-6 mb-6">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center justify-center gap-8 py-6">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-16" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-24" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-16" /></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-glass p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="card-glass p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const [organizer, , , , betAmount, result, totalPoolTeamA, totalPoolTeamB] = matchInfo;
  const totalPool = totalPoolTeamA + totalPoolTeamB;
  const isPending = Number(result) === MatchResult.Pending;
  const isBettingOpen = isPending && BigInt(matchStartTime) > BigInt(Math.floor(Date.now() / 1000));
  const isOrganizer = userAddress?.toLowerCase() === organizer.toLowerCase();

  const userTeamABet = userBets ? userBets[0] : BigInt(0);
  const userTeamBBet = userBets ? userBets[1] : BigInt(0);
  const hasUserBet = userTeamABet > BigInt(0) || userTeamBBet > BigInt(0);

  const hasClaimed = hasClaimedData ?? false;
  const canClaimPrize = !isPending && Number(result) !== MatchResult.Draw && (userPrize ?? BigInt(0)) > BigInt(0);
  const canClaimRefund = Number(result) === MatchResult.Draw && hasUserBet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Match Header */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant={isBettingOpen ? 'success' : isPending ? 'warning' : 'default'}>
              {isBettingOpen ? 'Betting Open' : isPending ? 'Waiting for Result' : getResultLabel(Number(result))}
            </Badge>
            {isBettingOpen && timeLeft && (
              <span className="text-sm text-yellow-400 font-mono flex items-center gap-1.5">
                <Clock size={14} /> {timeLeft}
              </span>
            )}
          </div>
          <span className="text-xs text-foreground-subtle flex items-center gap-1.5">
            {formatAddress(matchAddress)}
            <CopyButton text={matchAddress} />
          </span>
        </div>

        <div className="flex items-center justify-center gap-8 py-6">
          <div className="text-center flex-1">
            <div className="flex justify-center mb-3">
              {teamABadge ? (
                <Image
                  src={teamABadge}
                  alt={`${teamA} badge`}
                  width={48}
                  height={48}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Shield className="w-12 h-12 text-[color:var(--muted-icon)]" />
              )}
            </div>
            <p className="text-2xl font-bold">{teamA}</p>
            <p className="text-primary-400 font-mono mt-2">{formatEth(totalPoolTeamA)}</p>
            <p className="text-xs text-foreground-subtle">Pool</p>
          </div>
          <div className="text-foreground-subtle font-bold text-3xl">VS</div>
          <div className="text-center flex-1">
            <div className="flex justify-center mb-3">
              {teamBBadge ? (
                <Image
                  src={teamBBadge}
                  alt={`${teamB} badge`}
                  width={48}
                  height={48}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Shield className="w-12 h-12 text-[color:var(--muted-icon)]" />
              )}
            </div>
            <p className="text-2xl font-bold">{teamB}</p>
            <p className="text-accent-400 font-mono mt-2">{formatEth(totalPoolTeamB)}</p>
            <p className="text-xs text-foreground-subtle">Pool</p>
          </div>
        </div>

        {/* Pool Visualization */}
        {totalPool > BigInt(0) && (
          <div className="mb-4">
            <div className="flex rounded-full overflow-hidden h-3 bg-[var(--hover-overlay-strong)]">
              <div
                className="bg-primary-500 transition-all duration-700 ease-out"
                style={{ width: `${Number((totalPoolTeamA * BigInt(100)) / totalPool)}%` }}
              />
              <div
                className="bg-accent-500 transition-all duration-700 ease-out"
                style={{ width: `${Number((totalPoolTeamB * BigInt(100)) / totalPool)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-foreground-muted mt-1">
              <span>{totalPool > BigInt(0) ? `${Number((totalPoolTeamA * BigInt(100)) / totalPool)}%` : '0%'}</span>
              <span>Total: {formatEth(totalPool)}</span>
              <span>{totalPool > BigInt(0) ? `${Number((totalPoolTeamB * BigInt(100)) / totalPool)}%` : '0%'}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-sm border-t border-[color:var(--border)] pt-4">
          <div>
            <p className="text-foreground-muted">Bet Amount</p>
            <p className="font-medium">{formatEth(betAmount)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Start Time</p>
            <p className="font-medium">{formatDate(matchStartTime)}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Result</p>
            <p className={`font-medium ${getResultColor(Number(result))}`}>{getResultLabel(Number(result))}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Betting / Claiming */}
        <Card>
          {isBettingOpen ? (
            <BetForm
              matchAddress={matchAddress}
              teamA={teamA}
              teamB={teamB}
              betAmount={betAmount}
              disabled={!userAddress}
            />
          ) : (canClaimPrize || canClaimRefund) && !hasClaimed ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {Number(result) === MatchResult.Draw ? 'Claim Refund' : 'Claim Prize'}
              </h3>
              {userPrize && userPrize > BigInt(0) && (
                <p className="text-green-400 text-lg">Your prize: {formatEth(userPrize)}</p>
              )}
              <ClaimButton
                matchAddress={matchAddress}
                result={Number(result)}
                hasClaimed={hasClaimed}
                canClaim={(canClaimPrize || canClaimRefund) && !hasClaimed}
              />
            </div>
          ) : (
            <div className="text-center py-6 text-foreground-muted">
              {isPending ? 'Waiting for the match to start and the organizer to set the result.' : hasClaimed ? 'You have already claimed.' : 'No actions available.'}
            </div>
          )}
        </Card>

        {/* User's Bets */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Your Bets</h3>
          {hasUserBet ? (
            <div className="space-y-3">
              {userTeamABet > BigInt(0) && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
                  <span>{teamA}</span>
                  <span className="font-mono">{formatEth(userTeamABet)}</span>
                </div>
              )}
              {userTeamBBet > BigInt(0) && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-accent-500/10 border border-accent-500/20">
                  <span>{teamB}</span>
                  <span className="font-mono">{formatEth(userTeamBBet)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-foreground-muted text-center py-4">
              {userAddress ? 'You haven\'t placed any bets on this match.' : 'Connect your wallet to see your bets.'}
            </p>
          )}
        </Card>
      </div>

      {/* Set Result (Organizer Only) */}
      {isOrganizer && isPending && !isBettingOpen && (
        <Card className="mt-6">
          <SetResultForm matchAddress={matchAddress} teamA={teamA} teamB={teamB} />
        </Card>
      )}

      {/* Rate Organizer (Bettors Only, After Completion) */}
      {!isPending && !isOrganizer && hasUserBet && matchIdData !== undefined && (
        <Card className="mt-6">
          <RateOrganizer matchId={matchIdData as bigint} organizerAddress={organizer} />
        </Card>
      )}

      {/* Organizer Info */}
      <Card className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Organizer</h3>
        <p className="text-foreground-muted font-mono flex items-center gap-2">
          {organizer}
          <CopyButton text={organizer} />
        </p>
      </Card>
    </motion.div>
  );
}
