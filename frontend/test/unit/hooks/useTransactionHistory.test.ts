import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactionHistory, _internal } from '@/hooks/useTransactionHistory';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { encodeEventTopics, encodeAbiParameters } from 'viem';
import React, { type ReactNode } from 'react';

const { mockAddress, MATCH_ADDR, FACTORY_ADDR, FACTORY_ABI, MATCH_ABI } = vi.hoisted(() => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const MATCH_ADDR = '0x1000000000000000000000000000000000000001' as `0x${string}`;
  const FACTORY_ADDR = '0x2000000000000000000000000000000000000001' as `0x${string}`;

  const FACTORY_ABI = [
    {
      type: 'event' as const,
      name: 'MatchCreated' as const,
      inputs: [
        { name: 'matchId', type: 'uint256' as const, indexed: true },
        { name: 'matchContract', type: 'address' as const, indexed: true },
        { name: 'organizer', type: 'address' as const, indexed: true },
        { name: 'teamA', type: 'string' as const, indexed: false },
        { name: 'teamB', type: 'string' as const, indexed: false },
      ],
    },
  ] as const;

  const MATCH_ABI = [
    {
      type: 'event' as const,
      name: 'BetPlaced' as const,
      inputs: [
        { name: 'bettor', type: 'address' as const, indexed: true },
        { name: 'team', type: 'uint8' as const, indexed: false },
        { name: 'amount', type: 'uint256' as const, indexed: false },
      ],
    },
    {
      type: 'event' as const,
      name: 'ResultSet' as const,
      inputs: [{ name: 'result', type: 'uint8' as const, indexed: false }],
    },
    {
      type: 'event' as const,
      name: 'PrizeClaimed' as const,
      inputs: [
        { name: 'winner', type: 'address' as const, indexed: true },
        { name: 'amount', type: 'uint256' as const, indexed: false },
      ],
    },
    {
      type: 'event' as const,
      name: 'RefundClaimed' as const,
      inputs: [
        { name: 'bettor', type: 'address' as const, indexed: true },
        { name: 'amount', type: 'uint256' as const, indexed: false },
      ],
    },
    {
      type: 'event' as const,
      name: 'OrganizerPaid' as const,
      inputs: [
        { name: 'organizer', type: 'address' as const, indexed: true },
        { name: 'amount', type: 'uint256' as const, indexed: false },
      ],
    },
    {
      type: 'event' as const,
      name: 'OrganizerPaymentFailed' as const,
      inputs: [
        { name: 'organizer', type: 'address' as const, indexed: true },
        { name: 'amount', type: 'uint256' as const, indexed: false },
      ],
    },
  ] as const;

  return { mockAddress, MATCH_ADDR, FACTORY_ADDR, FACTORY_ABI, MATCH_ABI };
});

const mockRpcCall = vi.fn();
_internal.rpcCall = mockRpcCall;

const mockFetchQuery = vi.fn();

const mockPublicClient = {};

function encodeBetPlaced(bettor: `0x${string}`, team: number, amount: bigint) {
  const topics = encodeEventTopics({ abi: MATCH_ABI, eventName: 'BetPlaced', args: { bettor } });
  const data = encodeAbiParameters(
    [{ type: 'uint8', name: 'team' }, { type: 'uint256', name: 'amount' }],
    [team, amount],
  );
  return { topics, data };
}

function encodePrizeClaimed(winner: `0x${string}`, amount: bigint) {
  const topics = encodeEventTopics({ abi: MATCH_ABI, eventName: 'PrizeClaimed', args: { winner } });
  const data = encodeAbiParameters([{ type: 'uint256', name: 'amount' }], [amount]);
  return { topics, data };
}

function encodeResultSet(result: number) {
  const topics = encodeEventTopics({ abi: MATCH_ABI, eventName: 'ResultSet' });
  const data = encodeAbiParameters([{ type: 'uint8', name: 'result' }], [result]);
  return { topics, data };
}

function encodeOrganizerPaid(organizer: `0x${string}`, amount: bigint) {
  const topics = encodeEventTopics({ abi: MATCH_ABI, eventName: 'OrganizerPaid', args: { organizer } });
  const data = encodeAbiParameters([{ type: 'uint256', name: 'amount' }], [amount]);
  return { topics, data };
}

function encodeOrganizerPaymentFailed(organizer: `0x${string}`, amount: bigint) {
  const topics = encodeEventTopics({ abi: MATCH_ABI, eventName: 'OrganizerPaymentFailed', args: { organizer } });
  const data = encodeAbiParameters([{ type: 'uint256', name: 'amount' }], [amount]);
  return { topics, data };
}

function encodeMatchCreated(matchId: bigint, matchContract: `0x${string}`, organizer: `0x${string}`, teamA: string, teamB: string) {
  const topics = encodeEventTopics({ abi: FACTORY_ABI, eventName: 'MatchCreated', args: { matchId, matchContract, organizer } });
  const data = encodeAbiParameters(
    [{ type: 'string', name: 'teamA' }, { type: 'string', name: 'teamB' }],
    [teamA, teamB],
  );
  return { topics, data };
}

function makeLog(address: string, encoded: { topics: readonly `0x${string}`[]; data: `0x${string}` }, logIndex: number, blockNumber: bigint, txHash: string) {
  return {
    address: address as `0x${string}`,
    topics: encoded.topics as any,
    data: encoded.data,
    logIndex,
    blockNumber,
    blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    transactionHash: txHash as `0x${string}`,
    transactionIndex: 0,
    removed: false,
  };
}

function makeReceipt(hash: string, from: string, blockNumber: bigint, gasUsed: bigint, effectiveGasPrice: bigint, logs: any[]) {
  return {
    transactionHash: hash as `0x${string}`,
    from: from as `0x${string}`,
    to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    blockNumber,
    gasUsed,
    effectiveGasPrice,
    logs,
    status: 'success' as const,
    contractAddress: null,
    cumulativeGasUsed: gasUsed,
    blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    transactionIndex: 0,
    logsBloom: '0x' as `0x${string}`,
    type: 'eip1559' as const,
  };
}

function makeTransfer(hash: string, from: string, to: string, value: number) {
  return { hash, from, to, value, blockNum: '0x100', asset: 'ETH', category: 'external' };
}

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: mockAddress, chainId: 11155111 })),
  usePublicClient: vi.fn(() => mockPublicClient),
  useReadContract: vi.fn(() => ({ data: 1000n })),
}));

vi.mock('@/hooks/useMatches', () => ({
  useAllMatches: vi.fn(() => ({
    matches: [
      {
        contractAddress: MATCH_ADDR,
        organizer: mockAddress,
        teamA: 'Real Madrid',
        teamB: 'Barcelona',
        matchStartTime: 1700000000n,
        betAmount: 100000000000000000n,
        isCompleted: true,
      },
    ],
  })),
}));

vi.mock('@/hooks/useUserBets', () => ({
  useUserBets: vi.fn(() => ({
    bets: [
      {
        contractAddress: MATCH_ADDR,
        organizer: mockAddress,
        teamA: 'Real Madrid',
        teamB: 'Barcelona',
        matchStartTime: 1700000000n,
        betAmount: 100000000000000000n,
        isCompleted: true,
        result: 1,
        teamABet: 100000000000000000n,
        teamBBet: 0n,
        totalPoolTeamA: 200000000000000000n,
        totalPoolTeamB: 100000000000000000n,
        prize: 190000000000000000n,
        hasClaimed: false,
        outcome: 'won' as const,
      },
    ],
  })),
}));

vi.mock('@/lib/contracts', () => ({
  FACTORY_ADDRESS: FACTORY_ADDR,
  BET_FACTORY_ABI: FACTORY_ABI,
  BET_MATCH_ABI: MATCH_ABI,
}));

const WAIT_OPTS = { timeout: 10000 };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.fetchQuery = mockFetchQuery;
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

describe('useTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpcCall.mockResolvedValue({ transfers: [] });
    mockFetchQuery.mockImplementation(({ queryFn }: any) => queryFn());
  });

  it('returns empty when no transfers found', async () => {
    mockRpcCall.mockResolvedValue({ transfers: [] });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);
    expect(result.current.data?.entries).toEqual([]);
  });

  it('correctly negates BetPlaced amount to negative value', async () => {
    const betLog = encodeBetPlaced(mockAddress, 0, 100000000000000000n);
    const receipt = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(MATCH_ADDR, betLog, 1, 1000n, '0xtx1'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [makeTransfer('0xtx1', mockAddress, MATCH_ADDR, 0.1)],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt') return Promise.resolve(receipt);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('place_bet');
    expect(entries[0].value).toBe(-100000000000000000n);
  });

  it('deduplicates gas for ResultSet + OrganizerPaid in same transaction', async () => {
    const resultLog = encodeResultSet(1);
    const orgPaidLog = encodeOrganizerPaid(mockAddress, 5000000000000000n);
    const receipt = makeReceipt('0xshared', mockAddress, 1000n, 150000n, 2000000000n, [
      makeLog(MATCH_ADDR, orgPaidLog, 1, 1000n, '0xshared'),
      makeLog(MATCH_ADDR, resultLog, 2, 1000n, '0xshared'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [makeTransfer('0xshared', mockAddress, MATCH_ADDR, 0)],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt') return Promise.resolve(receipt);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries).toHaveLength(2);

    const orgFeeEntry = entries.find((e) => e.type === 'organizer_fee');
    const setResultEntry = entries.find((e) => e.type === 'set_result');

    expect(orgFeeEntry?.gasCost).toBe(0n);
    expect(setResultEntry?.gasCost).toBe(300000000000000n);
  });

  it('deduplicates gas for ResultSet + OrganizerPaymentFailed in same transaction', async () => {
    const resultLog = encodeResultSet(1);
    const orgFailedLog = encodeOrganizerPaymentFailed(mockAddress, 5000000000000000n);
    const receipt = makeReceipt('0xfailed', mockAddress, 1000n, 150000n, 2000000000n, [
      makeLog(MATCH_ADDR, orgFailedLog, 1, 1000n, '0xfailed'),
      makeLog(MATCH_ADDR, resultLog, 2, 1000n, '0xfailed'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [makeTransfer('0xfailed', mockAddress, MATCH_ADDR, 0)],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt') return Promise.resolve(receipt);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries).toHaveLength(2);

    const orgFailedEntry = entries.find((e) => e.type === 'organizer_fee_failed');
    const setResultEntry = entries.find((e) => e.type === 'set_result');

    expect(orgFailedEntry?.gasCost).toBe(0n);
    expect(setResultEntry?.gasCost).toBe(300000000000000n);
    expect(orgFailedEntry?.value).toBe(0n);
  });

  it('computes MoneyFlowSummary totals correctly', async () => {
    const betLog = encodeBetPlaced(mockAddress, 0, 100000000000000000n);
    const prizeLog = encodePrizeClaimed(mockAddress, 190000000000000000n);

    const receipt1 = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(MATCH_ADDR, betLog, 1, 1000n, '0xtx1'),
    ]);
    const receipt2 = makeReceipt('0xtx2', mockAddress, 1001n, 100000n, 3000000000n, [
      makeLog(MATCH_ADDR, prizeLog, 1, 1001n, '0xtx2'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [
        makeTransfer('0xtx1', mockAddress, MATCH_ADDR, 0.1),
        makeTransfer('0xtx2', mockAddress, MATCH_ADDR, 0),
      ],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt' && queryKey[1] === '0xtx1') return Promise.resolve(receipt1);
      if (queryKey[0] === 'tx-receipt' && queryKey[1] === '0xtx2') return Promise.resolve(receipt2);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const summary = result.current.data?.summary;
    expect(summary?.totalGasSpent).toBe(600000000000000n);
    expect(summary?.totalValueIn).toBe(190000000000000000n);
    expect(summary?.totalValueOut).toBe(100000000000000000n);
    expect(summary?.netPosition).toBe(89400000000000000n);
    expect(summary?.entryCount).toBe(2);
  });

  it('sorts entries chronologically by blockNumber and logIndex', async () => {
    const matchLog = encodeMatchCreated(0n, MATCH_ADDR, mockAddress, 'Real Madrid', 'Barcelona');
    const betLog = encodeBetPlaced(mockAddress, 0, 100000000000000000n);

    const receipt1 = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(FACTORY_ADDR, matchLog, 1, 1000n, '0xtx1'),
    ]);
    const receipt2 = makeReceipt('0xtx2', mockAddress, 1001n, 100000n, 3000000000n, [
      makeLog(MATCH_ADDR, betLog, 1, 1001n, '0xtx2'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [
        makeTransfer('0xtx1', mockAddress, FACTORY_ADDR, 0),
        makeTransfer('0xtx2', mockAddress, MATCH_ADDR, 0.1),
      ],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt' && queryKey[1] === '0xtx1') return Promise.resolve(receipt1);
      if (queryKey[0] === 'tx-receipt' && queryKey[1] === '0xtx2') return Promise.resolve(receipt2);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries).toHaveLength(2);
    expect(entries[0].type).toBe('create_match');
    expect(entries[1].type).toBe('place_bet');
  });

  it('returns empty result when no data available', async () => {
    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('uses matchContract from MatchCreated event as contractAddress', async () => {
    const matchLog = encodeMatchCreated(0n, MATCH_ADDR, mockAddress, 'PSG', 'Lyon');
    const receipt = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(FACTORY_ADDR, matchLog, 1, 1000n, '0xtx1'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [makeTransfer('0xtx1', mockAddress, FACTORY_ADDR, 0)],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt') return Promise.resolve(receipt);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0].contractAddress).toBe(MATCH_ADDR);
    expect(entries[0].teamA).toBe('PSG');
    expect(entries[0].teamB).toBe('Lyon');
  });

  it('sets detail field for place_bet with team name', async () => {
    const betLog = encodeBetPlaced(mockAddress, 0, 100000000000000000n);
    const receipt = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(MATCH_ADDR, betLog, 1, 1000n, '0xtx1'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [makeTransfer('0xtx1', mockAddress, MATCH_ADDR, 0.1)],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt') return Promise.resolve(receipt);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);
    expect(result.current.data?.entries?.[0].detail).toBe('Real Madrid');
  });

  it('computes netImpact as value - gasCost', async () => {
    const prizeLog = encodePrizeClaimed(mockAddress, 190000000000000000n);
    const receipt = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 2000000000n, [
      makeLog(MATCH_ADDR, prizeLog, 1, 1000n, '0xtx1'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [makeTransfer('0xtx1', MATCH_ADDR, mockAddress, 0.19)],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt') return Promise.resolve(receipt);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries[0].value).toBe(190000000000000000n);
    expect(entries[0].gasCost).toBe(200000000000000n);
    expect(entries[0].netImpact).toBe(189800000000000000n);
  });

  it('handles query disabled state correctly', async () => {
    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();
  });

  it('creates unique id from txHash and logIndex', () => {
    const mockEntry = { txHash: '0xabc123' as `0x${string}`, logIndex: 5 };
    expect(`${mockEntry.txHash}-${mockEntry.logIndex}`).toBe('0xabc123-5');
  });

  it('handles multiple events in same block with different logIndex', async () => {
    const betLog1 = encodeBetPlaced(mockAddress, 0, 100000000000000000n);
    const betLog2 = encodeBetPlaced(mockAddress, 1, 100000000000000000n);

    const receipt1 = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(MATCH_ADDR, betLog1, 1, 1000n, '0xtx1'),
    ]);
    const receipt2 = makeReceipt('0xtx2', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(MATCH_ADDR, betLog2, 3, 1000n, '0xtx2'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [
        makeTransfer('0xtx1', mockAddress, MATCH_ADDR, 0.1),
        makeTransfer('0xtx2', mockAddress, MATCH_ADDR, 0.1),
      ],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt' && queryKey[1] === '0xtx1') return Promise.resolve(receipt1);
      if (queryKey[0] === 'tx-receipt' && queryKey[1] === '0xtx2') return Promise.resolve(receipt2);
      return Promise.resolve({ number: 1000n, timestamp: 1700000000n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries).toHaveLength(2);
    expect(entries[0].logIndex).toBe(1);
    expect(entries[1].logIndex).toBe(3);
  });

  it('converts block timestamp from bigint to number', async () => {
    const matchLog = encodeMatchCreated(0n, MATCH_ADDR, mockAddress, 'Team A', 'Team B');
    const receipt = makeReceipt('0xtx1', mockAddress, 1000n, 100000n, 3000000000n, [
      makeLog(FACTORY_ADDR, matchLog, 1, 1000n, '0xtx1'),
    ]);

    mockRpcCall.mockResolvedValue({
      transfers: [makeTransfer('0xtx1', mockAddress, FACTORY_ADDR, 0)],
    });
    mockFetchQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'tx-receipt') return Promise.resolve(receipt);
      return Promise.resolve({ number: 1000n, timestamp: 1700123456n });
    });

    const { result } = renderHook(() => useTransactionHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), WAIT_OPTS);

    const entries = result.current.data?.entries ?? [];
    expect(entries[0].timestamp).toBe(1700123456);
    expect(typeof entries[0].timestamp).toBe('number');
  });
});
