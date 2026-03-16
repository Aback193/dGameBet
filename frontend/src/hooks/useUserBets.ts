'use client';

import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { useAllMatches } from '@/hooks/useMatches';
import { BET_MATCH_ABI } from '@/lib/contracts';
import { type UserBetMatch, type BetOutcome, MatchResult } from '@/types/match';

const ZERO = BigInt(0);

function deriveBetOutcome(
  teamABet: bigint,
  teamBBet: bigint,
  result: number,
): BetOutcome {
  if (result === MatchResult.Pending) return 'pending';
  if (result === MatchResult.Draw) return 'draw';

  const betOnWinner =
    (result === MatchResult.TeamAWins && teamABet > ZERO) ||
    (result === MatchResult.TeamBWins && teamBBet > ZERO);

  return betOnWinner ? 'won' : 'lost';
}

export function deriveTeamOutcome(
  betOnThisTeam: bigint,
  thisTeamWon: boolean,
  result: number,
): BetOutcome {
  if (betOnThisTeam === ZERO) return 'pending';
  if (result === MatchResult.Pending) return 'pending';
  if (result === MatchResult.Draw) return 'draw';
  return thisTeamWon ? 'won' : 'lost';
}

export function useUserBets() {
  const { address } = useAccount();
  const {
    matches: allMatches,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useAllMatches();

  const contracts = useMemo(() => {
    if (!address || allMatches.length === 0) return [];
    return allMatches.flatMap((m) => [
      {
        address: m.contractAddress as `0x${string}`,
        abi: BET_MATCH_ABI,
        functionName: 'getUserBets' as const,
        args: [address] as const,
      },
      {
        address: m.contractAddress as `0x${string}`,
        abi: BET_MATCH_ABI,
        functionName: 'getMatchInfo' as const,
      },
      {
        address: m.contractAddress as `0x${string}`,
        abi: BET_MATCH_ABI,
        functionName: 'calculatePrize' as const,
        args: [address] as const,
      },
      {
        address: m.contractAddress as `0x${string}`,
        abi: BET_MATCH_ABI,
        functionName: 'hasClaimed' as const,
        args: [address] as const,
      },
    ]);
  }, [allMatches, address]);

  const enabled = !!address && allMatches.length > 0;

  const {
    data: batchData,
    isLoading: batchLoading,
    error: batchError,
    refetch: refetchBatch,
  } = useReadContracts({
    contracts: contracts as any,
    query: { enabled, refetchInterval: 15_000 },
  });

  const bets: UserBetMatch[] = useMemo(() => {
    if (!batchData || allMatches.length === 0) return [];

    return allMatches
      .map((m, i) => {
        const base = i * 4;
        const userBetsResult = batchData[base];
        const matchInfoResult = batchData[base + 1];
        const prizeResult = batchData[base + 2];
        const claimedResult = batchData[base + 3];

        if (userBetsResult?.status !== 'success' || !userBetsResult.result)
          return null;

        const betsData = userBetsResult.result as readonly [bigint, bigint];
        const teamABet = betsData[0];
        const teamBBet = betsData[1];

        if (teamABet === ZERO && teamBBet === ZERO) return null;

        const matchInfo =
          matchInfoResult?.status === 'success' ? matchInfoResult.result : null;
        const info = matchInfo as
          | [string, string, string, bigint, bigint, number, bigint, bigint]
          | null;

        const result = info ? Number(info[5]) : MatchResult.Pending;
        const totalPoolTeamA = info ? info[6] : ZERO;
        const totalPoolTeamB = info ? info[7] : ZERO;
        const prize =
          prizeResult?.status === 'success'
            ? (prizeResult.result as bigint)
            : ZERO;
        const hasClaimed =
          claimedResult?.status === 'success'
            ? (claimedResult.result as boolean)
            : false;

        return {
          contractAddress: m.contractAddress,
          organizer: m.organizer,
          teamA: m.teamA,
          teamB: m.teamB,
          matchStartTime: m.matchStartTime,
          betAmount: m.betAmount,
          isCompleted: m.isCompleted,
          result,
          teamABet,
          teamBBet,
          totalPoolTeamA,
          totalPoolTeamB,
          prize,
          hasClaimed,
          outcome: deriveBetOutcome(teamABet, teamBBet, result),
        };
      })
      .filter((b): b is UserBetMatch => b !== null);
  }, [batchData, allMatches]);

  const refetch = () => {
    refetchMatches();
    refetchBatch();
  };

  return {
    bets,
    isLoading: matchesLoading || (enabled && batchLoading),
    error: matchesError || batchError,
    refetch,
  };
}
