'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { BET_FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts';
import { type Match } from '@/types/match';

export function mapMatches(rawMatches: readonly any[] | undefined): Match[] {
  if (!rawMatches) return [];
  return rawMatches.map((m: any) => ({
    contractAddress: m.matchContract,
    organizer: m.organizer,
    teamA: m.teamA,
    teamB: m.teamB,
    matchStartTime: m.matchStartTime,
    betAmount: m.betAmount,
    isCompleted: m.isCompleted,
  }));
}

function mapSingleMatch(result: any): Match | null {
  if (!result || result.status !== 'success' || !result.result) return null;
  const m = result.result;
  return {
    contractAddress: m.matchContract,
    organizer: m.organizer,
    teamA: m.teamA,
    teamB: m.teamB,
    matchStartTime: m.matchStartTime,
    betAmount: m.betAmount,
    isCompleted: m.isCompleted,
  };
}

export function useActiveMatches() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'getActiveMatches',
    query: { refetchInterval: 12_000 },
  });

  const matches = useMemo(() => mapMatches(data as any), [data]);
  return { matches, isLoading, error, refetch };
}

export function useCompletedMatches() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'getCompletedMatches',
    query: { refetchInterval: 12_000 },
  });

  const matches = useMemo(() => mapMatches(data as any), [data]);
  return { matches, isLoading, error, refetch };
}

export function useFilteredMatches(filter: 'active' | 'completed') {
  const { matches: allMatches, isLoading, error, refetch } = useAllMatches();

  const matches = useMemo(
    () =>
      filter === 'active'
        ? allMatches.filter((m) => !m.isCompleted)
        : allMatches.filter((m) => m.isCompleted),
    [allMatches, filter],
  );

  return { matches, isLoading, error, refetch };
}

/**
 * Fetches ALL matches by first getting the count, then multicalling getMatch(i)
 * for each index. This works around the on-chain getAllMatches() revert caused
 * by Solidity's storage-to-memory copy of struct arrays with dynamic string fields.
 */
export function useAllMatches() {
  const {
    data: countData,
    isLoading: countLoading,
    error: countError,
    refetch: refetchCount,
  } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'getMatchCount',
    query: { refetchInterval: 15_000 },
  });

  const matchCount = countData ? Number(countData) : 0;

  const matchContracts = useMemo(() => {
    if (matchCount === 0) return [];
    return Array.from({ length: matchCount }, (_, i) => ({
      address: FACTORY_ADDRESS,
      abi: BET_FACTORY_ABI,
      functionName: 'getMatch' as const,
      args: [BigInt(i)] as const,
    }));
  }, [matchCount]);

  const {
    data: matchesData,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useReadContracts({
    contracts: matchContracts as any,
    query: {
      enabled: matchCount > 0,
      refetchInterval: 15_000,
    },
  });

  const matches = useMemo((): Match[] => {
    if (!matchesData) return [];
    return (matchesData as any[])
      .map(mapSingleMatch)
      .filter((m): m is Match => m !== null);
  }, [matchesData]);

  return {
    matches,
    isLoading: countLoading || (matchCount > 0 && matchesLoading),
    error: countError || matchesError,
    refetch: () => { refetchCount(); refetchMatches(); },
  };
}

export function useMatchCount() {
  const { data, isLoading } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'getMatchCount',
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
  };
}
