'use client';

import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { useUserBets } from './useUserBets';
import { useAllMatches } from './useMatches';
import { useTransactionHistory } from './useTransactionHistory';
import { BET_MATCH_ABI } from '@/lib/contracts';
import { MatchResult } from '@/types/match';
import type {
  PortfolioEntry,
  PortfolioChartPoint,
  PortfolioSummary,
  OrganizerEarnings,
  OrganizerFeeEntry,
} from '@/types/match';

export function usePortfolio() {
  const { address } = useAccount();
  const { bets, isLoading: betsLoading, error: betsError, refetch: refetchBets } = useUserBets();
  const { matches: allMatches } = useAllMatches();

  const { data: txHistory, isLoading: txHistoryLoading, error: txHistoryError, refetch: refetchTxHistory } = useTransactionHistory();

  const gasMap = useMemo(() => {
    const map = new Map<string, bigint>();
    if (!txHistory?.entries) return map;
    for (const e of txHistory.entries) {
      const key = e.contractAddress.toLowerCase();
      map.set(key, (map.get(key) ?? 0n) + e.gasCost);
    }
    return map;
  }, [txHistory]);

  const entries: PortfolioEntry[] = useMemo(() => {
    const userAddr = address?.toLowerCase();
    return bets
      .filter((b) => b.outcome !== 'pending')
      .map((b) => {
        const wagered = b.teamABet + b.teamBBet;
        const entitled = b.outcome === 'won' ? b.prize : b.outcome === 'draw' ? wagered : 0n;
        const returned = b.hasClaimed ? entitled : 0n;
        const unclaimed = b.hasClaimed ? 0n : entitled;

        const isOrganizer = !!userAddr && b.organizer.toLowerCase() === userAddr;
        const isNonDraw = b.outcome !== 'draw';
        const totalPool = b.totalPoolTeamA + b.totalPoolTeamB;
        const organizerFeeOffset = isOrganizer && isNonDraw ? (totalPool * 5n) / 100n : 0n;

        return {
          contractAddress: b.contractAddress,
          teamA: b.teamA,
          teamB: b.teamB,
          matchStartTime: Number(b.matchStartTime),
          wagered,
          returned,
          unclaimed,
          netPnL: returned - wagered,
          outcome: b.outcome as 'won' | 'lost' | 'draw',
          hasClaimed: b.hasClaimed,
          organizerFeeOffset,
          gasCost: 0n,
        };
      })
      .sort((a, b) => a.matchStartTime - b.matchStartTime);
  }, [bets, address]);

  const organizedCompleted = useMemo(() => {
    if (!address || !allMatches.length) return [];
    const userAddr = address.toLowerCase();
    return allMatches.filter(
      (m) => m.organizer.toLowerCase() === userAddr && m.isCompleted
    );
  }, [allMatches, address]);

  const orgContracts = useMemo(() => {
    return organizedCompleted.map((m) => ({
      address: m.contractAddress as `0x${string}`,
      abi: BET_MATCH_ABI,
      functionName: 'getMatchInfo' as const,
    }));
  }, [organizedCompleted]);

  const {
    data: orgBatchData,
    isLoading: orgBatchLoading,
    error: orgBatchError,
    refetch: refetchOrgBatch,
  } = useReadContracts({
    contracts: orgContracts as any,
    query: {
      enabled: organizedCompleted.length > 0,
      refetchInterval: 30_000,
      staleTime: 60_000,
    },
  });

  const organizerEarnings: OrganizerEarnings = useMemo(() => {
    if (!orgBatchData || organizedCompleted.length === 0) {
      return { totalFees: 0n, matchCount: 0, feePerMatch: [] };
    }

    const feePerMatch: OrganizerFeeEntry[] = [];
    let totalFees = 0n;

    orgBatchData.forEach((res, i) => {
      if (res?.status !== 'success' || !res.result) return;
      const info = res.result as [string, string, string, bigint, bigint, number, bigint, bigint];
      const result = Number(info[5]);
      if (result === MatchResult.Draw || result === MatchResult.Pending) return;

      const totalPool = info[6] + info[7];
      const fee = (totalPool * 5n) / 100n;
      totalFees += fee;

      feePerMatch.push({
        contractAddress: organizedCompleted[i].contractAddress,
        teamA: organizedCompleted[i].teamA,
        teamB: organizedCompleted[i].teamB,
        totalPool,
        fee,
      });
    });

    return { totalFees, matchCount: feePerMatch.length, feePerMatch };
  }, [orgBatchData, organizedCompleted]);

  const chartData: PortfolioChartPoint[] = useMemo(() => {
    type TimelineEvent = { date: number; pnl: number };
    const events: TimelineEvent[] = [];

    const betContracts = new Set(entries.map((e) => e.contractAddress));
    const gasAccountedFor = new Set<string>();

    for (const e of entries) {
      const gas = gasMap.get(e.contractAddress.toLowerCase()) ?? 0n;
      gasAccountedFor.add(e.contractAddress.toLowerCase());
      const pnl = parseFloat(formatEther(e.netPnL + e.organizerFeeOffset - gas));
      events.push({ date: e.matchStartTime, pnl });
    }

    for (const f of organizerEarnings.feePerMatch) {
      if (betContracts.has(f.contractAddress)) continue;
      const gas = gasMap.get(f.contractAddress.toLowerCase()) ?? 0n;
      gasAccountedFor.add(f.contractAddress.toLowerCase());
      const orgMatch = organizedCompleted.find((m) => m.contractAddress === f.contractAddress);
      if (orgMatch) {
        events.push({ date: Number(orgMatch.matchStartTime), pnl: parseFloat(formatEther(f.fee - gas)) });
      }
    }

    if (address) {
      const userAddr = address.toLowerCase();
      for (const m of allMatches) {
        if (m.organizer.toLowerCase() !== userAddr) continue;
        const addr = m.contractAddress.toLowerCase();
        if (gasAccountedFor.has(addr)) continue;
        const gas = gasMap.get(addr);
        if (gas && gas > 0n) {
          gasAccountedFor.add(addr);
          events.push({ date: Number(m.matchStartTime), pnl: -parseFloat(formatEther(gas)) });
        }
      }
    }

    events.sort((a, b) => a.date - b.date);

    if (events.length === 0) return [];

    const origin: PortfolioChartPoint = {
      date: events[0].date - 86400,
      label: 'Start',
      cumulativePnL: 0,
    };

    let cumulative = 0;
    const points = events.map((e) => {
      cumulative += e.pnl;
      return {
        date: e.date,
        label: new Date(e.date * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        cumulativePnL: parseFloat(cumulative.toFixed(6)),
      };
    });

    return [origin, ...points];
  }, [entries, organizerEarnings, organizedCompleted, gasMap, allMatches, address]);

  const summary: PortfolioSummary = useMemo(() => {
    const wins = entries.filter((e) => e.outcome === 'won');
    const losses = entries.filter((e) => e.outcome === 'lost');
    const draws = entries.filter((e) => e.outcome === 'draw');
    const totalWagered = entries.reduce((s, e) => s + e.wagered, 0n);
    const totalReturned = entries.reduce((s, e) => s + e.returned, 0n);
    const totalUnclaimed = entries.reduce((s, e) => s + e.unclaimed, 0n);
    const totalPnL = totalReturned - totalWagered;
    let totalGas = 0n;
    for (const g of gasMap.values()) totalGas += g;
    const netPosition = totalPnL + organizerEarnings.totalFees - totalGas;
    const decisiveBets = wins.length + losses.length;
    const winRate = decisiveBets > 0
      ? ((wins.length / decisiveBets) * 100).toFixed(1)
      : '0.0';

    return {
      totalBets: entries.length,
      wins: wins.length,
      losses: losses.length,
      draws: draws.length,
      totalWagered,
      totalReturned,
      totalUnclaimed,
      totalPnL,
      netPosition,
      winRate,
    };
  }, [entries, organizerEarnings, gasMap]);

  const refetch = () => {
    refetchBets();
    refetchOrgBatch();
    refetchTxHistory();
  };

  return {
    entries,
    chartData,
    summary,
    organizerEarnings,
    gasMap,
    timeline: txHistory?.entries ?? [],
    timelineSummary: txHistory?.summary,
    timelineLoading: txHistoryLoading,
    timelineError: txHistoryError,
    isLoading: betsLoading || txHistoryLoading || (organizedCompleted.length > 0 && orgBatchLoading),
    error: betsError || orgBatchError,
    refetch,
  };
}
