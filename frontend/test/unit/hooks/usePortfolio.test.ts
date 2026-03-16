import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { MatchResult, type UserBetMatch, type Match } from '@/types/match';

const mockAddress = '0x1234567890123456789012345678901234567890';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: mockAddress })),
  useReadContracts: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

const mockBets: UserBetMatch[] = [];
const mockRefetchBets = vi.fn();
const mockMatches: Match[] = [];

vi.mock('@/hooks/useUserBets', () => ({
  useUserBets: vi.fn(() => ({
    bets: mockBets,
    isLoading: false,
    error: null,
    refetch: mockRefetchBets,
  })),
}));

vi.mock('@/hooks/useMatches', () => ({
  useAllMatches: vi.fn(() => ({
    matches: mockMatches,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/lib/contracts', () => ({
  BET_MATCH_ABI: [],
  FACTORY_ADDRESS: '0xfactory',
  BET_FACTORY_ABI: [],
}));

vi.mock('@/hooks/useTransactionHistory', () => ({
  useTransactionHistory: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

import { useUserBets } from '@/hooks/useUserBets';
import { useAllMatches } from '@/hooks/useMatches';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { useReadContracts } from 'wagmi';

function setMockBets(bets: UserBetMatch[]) {
  vi.mocked(useUserBets).mockReturnValue({
    bets,
    isLoading: false,
    error: null,
    refetch: mockRefetchBets,
  });
}

function setMockMatches(matches: Match[]) {
  vi.mocked(useAllMatches).mockReturnValue({
    matches,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function makeBet(overrides: Partial<UserBetMatch> = {}): UserBetMatch {
  return {
    contractAddress: '0xabc',
    organizer: '0xorg',
    teamA: 'Team A',
    teamB: 'Team B',
    matchStartTime: 1700000000n,
    betAmount: 100000000000000000n,
    isCompleted: true,
    result: MatchResult.TeamAWins,
    teamABet: 100000000000000000n,
    teamBBet: 0n,
    totalPoolTeamA: 200000000000000000n,
    totalPoolTeamB: 100000000000000000n,
    prize: 190000000000000000n,
    hasClaimed: true,
    outcome: 'won',
    ...overrides,
  };
}

describe('usePortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockBets([]);
    setMockMatches([]);
  });

  it('returns empty entries for empty bets array', () => {
    setMockBets([]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries).toEqual([]);
    expect(result.current.chartData).toEqual([]);
    expect(result.current.summary.totalBets).toBe(0);
  });

  it('excludes pending bets from entries', () => {
    setMockBets([
      makeBet({ outcome: 'pending', result: MatchResult.Pending, isCompleted: false }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries).toHaveLength(0);
  });

  it('correctly computes won bet entry', () => {
    setMockBets([
      makeBet({
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        prize: 190000000000000000n,
        outcome: 'won',
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries).toHaveLength(1);
    const entry = result.current.entries[0];
    expect(entry.wagered).toBe(100000000000000000n);
    expect(entry.returned).toBe(190000000000000000n);
    expect(entry.netPnL).toBe(90000000000000000n);
    expect(entry.outcome).toBe('won');
    expect(entry.organizerFeeOffset).toBe(0n);
  });

  it('correctly computes lost bet entry', () => {
    setMockBets([
      makeBet({
        teamABet: 0n,
        teamBBet: 100000000000000000n,
        prize: 0n,
        outcome: 'lost',
        result: MatchResult.TeamAWins,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    const entry = result.current.entries[0];
    expect(entry.wagered).toBe(100000000000000000n);
    expect(entry.returned).toBe(0n);
    expect(entry.netPnL).toBe(-100000000000000000n);
    expect(entry.outcome).toBe('lost');
  });

  it('correctly computes draw bet entry (full refund)', () => {
    setMockBets([
      makeBet({
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        prize: 0n,
        outcome: 'draw',
        result: MatchResult.Draw,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    const entry = result.current.entries[0];
    expect(entry.wagered).toBe(100000000000000000n);
    expect(entry.returned).toBe(100000000000000000n);
    expect(entry.netPnL).toBe(0n);
    expect(entry.outcome).toBe('draw');
  });

  it('handles hedged bet (bet on both teams, outcome won but negative P&L)', () => {
    setMockBets([
      makeBet({
        teamABet: 100000000000000000n,
        teamBBet: 200000000000000000n,
        prize: 150000000000000000n,
        outcome: 'won',
        result: MatchResult.TeamAWins,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    const entry = result.current.entries[0];
    expect(entry.wagered).toBe(300000000000000000n);
    expect(entry.returned).toBe(150000000000000000n);
    expect(entry.netPnL).toBe(-150000000000000000n);
    expect(entry.outcome).toBe('won');
  });

  it('generates chart data with origin point at zero', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xfirst',
        matchStartTime: 1700000000n,
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        prize: 190000000000000000n,
        outcome: 'won',
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.chartData).toHaveLength(2);
    expect(result.current.chartData[0].label).toBe('Start');
    expect(result.current.chartData[0].cumulativePnL).toBe(0);
    expect(result.current.chartData[1].cumulativePnL).toBeGreaterThan(0);
  });

  it('computes cumulative P&L across multiple bets', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xa',
        matchStartTime: 1700000000n,
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        prize: 190000000000000000n,
        outcome: 'won',
      }),
      makeBet({
        contractAddress: '0xb',
        matchStartTime: 1700100000n,
        teamABet: 0n,
        teamBBet: 100000000000000000n,
        prize: 0n,
        outcome: 'lost',
        result: MatchResult.TeamAWins,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.chartData).toHaveLength(3);
    const lastPoint = result.current.chartData[2];
    expect(lastPoint.cumulativePnL).toBeLessThan(result.current.chartData[1].cumulativePnL);
  });

  it('computes win rate as wins / (wins + losses), excluding draws', () => {
    setMockBets([
      makeBet({ contractAddress: '0xa', outcome: 'won', matchStartTime: 1700000000n }),
      makeBet({ contractAddress: '0xb', outcome: 'won', matchStartTime: 1700100000n }),
      makeBet({
        contractAddress: '0xc',
        outcome: 'lost',
        matchStartTime: 1700200000n,
        teamABet: 0n,
        teamBBet: 100000000000000000n,
        prize: 0n,
        result: MatchResult.TeamAWins,
      }),
      makeBet({
        contractAddress: '0xd',
        outcome: 'draw',
        matchStartTime: 1700300000n,
        result: MatchResult.Draw,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.summary.totalBets).toBe(4);
    expect(result.current.summary.wins).toBe(2);
    expect(result.current.summary.losses).toBe(1);
    expect(result.current.summary.draws).toBe(1);
    // winRate = wins / (wins + losses) = 2 / 3 = 66.7%
    expect(result.current.summary.winRate).toBe('66.7');
  });

  it('returns 0.0 win rate when only draws (no decisive bets)', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xa',
        outcome: 'draw',
        result: MatchResult.Draw,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.summary.winRate).toBe('0.0');
  });

  it('returns default organizer earnings when no organized matches', () => {
    setMockBets([]);
    setMockMatches([]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.organizerEarnings.totalFees).toBe(0n);
    expect(result.current.organizerEarnings.matchCount).toBe(0);
    expect(result.current.organizerEarnings.feePerMatch).toEqual([]);
  });

  it('sorts entries by matchStartTime ascending', () => {
    setMockBets([
      makeBet({ contractAddress: '0xlater', matchStartTime: 1700200000n, outcome: 'won' }),
      makeBet({ contractAddress: '0xearlier', matchStartTime: 1700000000n, outcome: 'lost', teamABet: 0n, teamBBet: 100000000000000000n, prize: 0n, result: MatchResult.TeamAWins }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries[0].contractAddress).toBe('0xearlier');
    expect(result.current.entries[1].contractAddress).toBe('0xlater');
  });

  it('computes organizer fee for completed non-draw matches', () => {
    setMockMatches([
      {
        contractAddress: '0xmatch1',
        organizer: mockAddress,
        teamA: 'Team A',
        teamB: 'Team B',
        matchStartTime: 1700000000n,
        betAmount: 100000000000000000n,
        isCompleted: true,
      },
    ]);
    vi.mocked(useReadContracts).mockReturnValue({
      data: [
        {
          status: 'success' as const,
          result: [
            mockAddress,     // organizer
            'Team A',        // teamA
            'Team B',        // teamB
            1700000000n,     // matchStartTime
            100000000000000000n, // betAmount
            MatchResult.TeamAWins, // result (non-draw)
            500000000000000000n,   // totalPoolTeamA
            300000000000000000n,   // totalPoolTeamB
          ] as [string, string, string, bigint, bigint, number, bigint, bigint],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    // fee = (500000000000000000 + 300000000000000000) * 5 / 100 = 40000000000000000
    expect(result.current.organizerEarnings.totalFees).toBe(40000000000000000n);
    expect(result.current.organizerEarnings.matchCount).toBe(1);
    expect(result.current.organizerEarnings.feePerMatch).toHaveLength(1);
    expect(result.current.organizerEarnings.feePerMatch[0].fee).toBe(40000000000000000n);
  });

  it('excludes draw matches from organizer fee calculation', () => {
    setMockMatches([
      {
        contractAddress: '0xdraw',
        organizer: mockAddress,
        teamA: 'Team A',
        teamB: 'Team B',
        matchStartTime: 1700000000n,
        betAmount: 100000000000000000n,
        isCompleted: true,
      },
    ]);
    vi.mocked(useReadContracts).mockReturnValue({
      data: [
        {
          status: 'success' as const,
          result: [
            mockAddress,
            'Team A',
            'Team B',
            1700000000n,
            100000000000000000n,
            MatchResult.Draw,          // draw result — organizer gets no fee
            400000000000000000n,
            400000000000000000n,
          ] as [string, string, string, bigint, bigint, number, bigint, bigint],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.organizerEarnings.totalFees).toBe(0n);
    expect(result.current.organizerEarnings.matchCount).toBe(0);
    expect(result.current.organizerEarnings.feePerMatch).toEqual([]);
  });

  it('populates both bettor entries and organizer earnings when user is both', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xmatch1',
        organizer: mockAddress,
        outcome: 'won',
      }),
    ]);
    setMockMatches([
      {
        contractAddress: '0xmatch1',
        organizer: mockAddress,
        teamA: 'Team A',
        teamB: 'Team B',
        matchStartTime: 1700000000n,
        betAmount: 100000000000000000n,
        isCompleted: true,
      },
    ]);
    vi.mocked(useReadContracts).mockReturnValue({
      data: [
        {
          status: 'success' as const,
          result: [
            mockAddress,
            'Team A',
            'Team B',
            1700000000n,
            100000000000000000n,
            MatchResult.TeamAWins,
            200000000000000000n,
            100000000000000000n,
          ] as [string, string, string, bigint, bigint, number, bigint, bigint],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].outcome).toBe('won');
    // fee = (200000000000000000 + 100000000000000000) * 5 / 100 = 15000000000000000
    expect(result.current.organizerEarnings.totalFees).toBe(15000000000000000n);
    expect(result.current.organizerEarnings.matchCount).toBe(1);
    expect(result.current.entries[0].organizerFeeOffset).toBe(15000000000000000n);
  });

  it('computes organizerFeeOffset on entries when user is the organizer', () => {
    setMockBets([
      makeBet({
        organizer: mockAddress,
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        totalPoolTeamA: 100000000000000000n,
        totalPoolTeamB: 0n,
        prize: 95000000000000000n,
        outcome: 'won',
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());
    const entry = result.current.entries[0];

    expect(entry.netPnL).toBe(-5000000000000000n);
    expect(entry.organizerFeeOffset).toBe(5000000000000000n);
  });

  it('sets organizerFeeOffset to zero for draw even when user is organizer', () => {
    setMockBets([
      makeBet({
        organizer: mockAddress,
        outcome: 'draw',
        result: MatchResult.Draw,
        totalPoolTeamA: 100000000000000000n,
        totalPoolTeamB: 100000000000000000n,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries[0].organizerFeeOffset).toBe(0n);
  });

  it('computes netPosition as totalPnL + organizer fees', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xmatch1',
        organizer: mockAddress,
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        totalPoolTeamA: 100000000000000000n,
        totalPoolTeamB: 0n,
        prize: 95000000000000000n,
        outcome: 'won',
      }),
    ]);
    setMockMatches([
      {
        contractAddress: '0xmatch1',
        organizer: mockAddress,
        teamA: 'Team A',
        teamB: 'Team B',
        matchStartTime: 1700000000n,
        betAmount: 100000000000000000n,
        isCompleted: true,
      },
    ]);
    vi.mocked(useReadContracts).mockReturnValue({
      data: [
        {
          status: 'success' as const,
          result: [
            mockAddress,
            'Team A',
            'Team B',
            1700000000n,
            100000000000000000n,
            MatchResult.TeamAWins,
            100000000000000000n,
            0n,
          ] as [string, string, string, bigint, bigint, number, bigint, bigint],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.summary.totalPnL).toBe(-5000000000000000n);
    expect(result.current.organizerEarnings.totalFees).toBe(5000000000000000n);
    expect(result.current.summary.netPosition).toBe(0n);
  });

  it('includes organizer fee offset in chart cumulative P&L', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xmatch1',
        organizer: mockAddress,
        matchStartTime: 1700000000n,
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        totalPoolTeamA: 100000000000000000n,
        totalPoolTeamB: 0n,
        prize: 95000000000000000n,
        outcome: 'won',
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.chartData).toHaveLength(2);
    expect(result.current.chartData[0].cumulativePnL).toBe(0);
    expect(result.current.chartData[1].cumulativePnL).toBe(0);
  });

  it('includes timeline and timelineSummary from useTransactionHistory', () => {
    const mockTimeline = [
      {
        id: '0x1-1',
        txHash: '0x1' as `0x${string}`,
        blockNumber: 1000n,
        logIndex: 1,
        timestamp: 1700000000,
        type: 'place_bet' as const,
        contractAddress: '0xmatch',
        teamA: 'Team A',
        teamB: 'Team B',
        value: -100000000000000000n,
        gasCost: 300000000000000n,
        netImpact: -100300000000000000n,
      },
    ];
    const mockSummary = {
      totalGasSpent: 300000000000000n,
      totalValueIn: 0n,
      totalValueOut: 100000000000000000n,
      netPosition: -100300000000000000n,
      entryCount: 1,
    };

    vi.mocked(useTransactionHistory).mockReturnValue({
      data: { entries: mockTimeline, summary: mockSummary },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.timeline).toEqual(mockTimeline);
    expect(result.current.timelineSummary).toEqual(mockSummary);
  });

  it('returns empty timeline when useTransactionHistory returns undefined', () => {
    vi.mocked(useTransactionHistory).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.timeline).toEqual([]);
    expect(result.current.timelineSummary).toBeUndefined();
  });

  it('exposes timelineLoading and timelineError separately', () => {
    const mockError = new Error('RPC error');
    vi.mocked(useTransactionHistory).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: mockError,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.timelineLoading).toBe(true);
    expect(result.current.timelineError).toBe(mockError);
  });

  it('populates gasCost on entries from transaction history', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xmatch1',
        outcome: 'won',
      }),
    ]);

    vi.mocked(useTransactionHistory).mockReturnValue({
      data: {
        entries: [
          {
            id: '0x1-1',
            txHash: '0x1' as `0x${string}`,
            blockNumber: 1000n,
            logIndex: 1,
            timestamp: 1700000000,
            type: 'place_bet' as const,
            contractAddress: '0xmatch1',
            teamA: 'Team A',
            teamB: 'Team B',
            value: -100000000000000000n,
            gasCost: 300000000000000n,
            netImpact: -100300000000000000n,
          },
          {
            id: '0x2-1',
            txHash: '0x2' as `0x${string}`,
            blockNumber: 1001n,
            logIndex: 1,
            timestamp: 1700100000,
            type: 'claim_prize' as const,
            contractAddress: '0xmatch1',
            teamA: 'Team A',
            teamB: 'Team B',
            value: 190000000000000000n,
            gasCost: 200000000000000n,
            netImpact: 189800000000000000n,
          },
        ],
        summary: {
          totalGasSpent: 500000000000000n,
          totalValueIn: 190000000000000000n,
          totalValueOut: 100000000000000000n,
          netPosition: 89500000000000000n,
          entryCount: 2,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries[0].gasCost).toBe(0n);
    expect(result.current.gasMap.get('0xmatch1')).toBe(500000000000000n);
  });

  it('sets gasCost to 0n when no transaction history for that contract', () => {
    setMockBets([makeBet({ contractAddress: '0xno_history' })]);

    vi.mocked(useTransactionHistory).mockReturnValue({
      data: { entries: [], summary: { totalGasSpent: 0n, totalValueIn: 0n, totalValueOut: 0n, netPosition: 0n, entryCount: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.entries[0].gasCost).toBe(0n);
    expect(result.current.gasMap.get('0xno_history')).toBeUndefined();
  });

  it('includes timeline loading in overall isLoading', () => {
    vi.mocked(useTransactionHistory).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => usePortfolio());

    expect(result.current.timelineLoading).toBe(true);
    expect(result.current.isLoading).toBe(true);
  });

  it('sets returned to 0 and tracks unclaimed for won bet that has not been claimed', () => {
    setMockBets([
      makeBet({
        hasClaimed: false,
        prize: 190000000000000000n,
        outcome: 'won',
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    const entry = result.current.entries[0];
    expect(entry.returned).toBe(0n);
    expect(entry.unclaimed).toBe(190000000000000000n);
    expect(entry.netPnL).toBe(-100000000000000000n);
    expect(entry.hasClaimed).toBe(false);
  });

  it('sets returned to prize and unclaimed to 0 for claimed won bet', () => {
    setMockBets([
      makeBet({
        hasClaimed: true,
        prize: 190000000000000000n,
        outcome: 'won',
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    const entry = result.current.entries[0];
    expect(entry.returned).toBe(190000000000000000n);
    expect(entry.unclaimed).toBe(0n);
    expect(entry.netPnL).toBe(90000000000000000n);
    expect(entry.hasClaimed).toBe(true);
  });

  it('tracks unclaimed refund for unclaimed draw bet', () => {
    setMockBets([
      makeBet({
        hasClaimed: false,
        outcome: 'draw',
        result: MatchResult.Draw,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    const entry = result.current.entries[0];
    expect(entry.returned).toBe(0n);
    expect(entry.unclaimed).toBe(100000000000000000n);
    expect(entry.netPnL).toBe(-100000000000000000n);
  });

  it('computes totalUnclaimed in summary across multiple unclaimed bets', () => {
    setMockBets([
      makeBet({
        contractAddress: '0xa',
        hasClaimed: false,
        prize: 190000000000000000n,
        outcome: 'won',
        matchStartTime: 1700000000n,
      }),
      makeBet({
        contractAddress: '0xb',
        hasClaimed: false,
        outcome: 'draw',
        result: MatchResult.Draw,
        matchStartTime: 1700100000n,
      }),
      makeBet({
        contractAddress: '0xc',
        hasClaimed: true,
        prize: 180000000000000000n,
        outcome: 'won',
        matchStartTime: 1700200000n,
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.summary.totalUnclaimed).toBe(290000000000000000n);
    expect(result.current.summary.totalReturned).toBe(180000000000000000n);
  });

  it('netPosition reflects only claimed returns, not unclaimed', () => {
    setMockBets([
      makeBet({
        hasClaimed: false,
        prize: 190000000000000000n,
        outcome: 'won',
      }),
    ]);
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.summary.netPosition).toBe(-100000000000000000n);
    expect(result.current.summary.totalUnclaimed).toBe(190000000000000000n);
  });
});
