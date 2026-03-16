'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { decodeEventLog } from 'viem';
import { BET_MATCH_ABI, BET_FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts';
import { useAllMatches } from './useMatches';
import { useUserBets } from './useUserBets';
import { Team, type MoneyFlowEntry, type MoneyFlowSummary } from '@/types/match';
import type { TransactionReceipt, Block } from 'viem';

/** @internal Exported for testing — allows mocking to skip delays and RPC calls in tests. */
export const _internal = {
  sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  async rpcCall(method: string, params: unknown[]): Promise<any> {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) throw new Error('NEXT_PUBLIC_RPC_URL not configured');
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!res.ok) throw new Error(`RPC HTTP error: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
    return json.result;
  },
};

interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string;
  category: string;
}

/**
 * Uses alchemy_getAssetTransfers which supports unlimited block ranges
 * on Alchemy's free tier, unlike eth_getLogs which is capped at 10 blocks.
 */
async function getAssetTransfers(
  params: Record<string, unknown>,
): Promise<AlchemyTransfer[]> {
  const result = await _internal.rpcCall('alchemy_getAssetTransfers', [
    { ...params, maxCount: '0x3e8' },
  ]);
  return result?.transfers ?? [];
}

export function useTransactionHistory() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { matches } = useAllMatches();
  const { bets } = useUserBets();

  const { data: deployBlockRaw } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'deployBlock',
    query: { staleTime: Infinity },
  });

  const deployBlockHex = deployBlockRaw
    ? '0x' + deployBlockRaw.toString(16)
    : '0x0';

  const betMatchAddresses = useMemo(
    () => bets.map((b) => b.contractAddress as `0x${string}`),
    [bets]
  );

  const organizedAddresses = useMemo(
    () =>
      matches
        .filter((m) => m.organizer.toLowerCase() === address?.toLowerCase())
        .map((m) => m.contractAddress as `0x${string}`),
    [matches, address]
  );

  const relevantAddresses = useMemo(() => {
    const set = new Set<string>();
    for (const a of betMatchAddresses) set.add(a.toLowerCase());
    for (const a of organizedAddresses) set.add(a.toLowerCase());
    return set;
  }, [betMatchAddresses, organizedAddresses]);

  const matchLabelMap = useMemo(
    () =>
      new Map(
        matches.map((m) => [m.contractAddress.toLowerCase(), { teamA: m.teamA, teamB: m.teamB }])
      ),
    [matches]
  );

  const hasData =
    !!address &&
    !!publicClient &&
    deployBlockRaw !== undefined &&
    (betMatchAddresses.length > 0 || organizedAddresses.length > 0);

  return useQuery({
    queryKey: ['tx-history', address, chainId, betMatchAddresses.length, organizedAddresses.length],
    queryFn: async () => {
      const client = publicClient!;
      const userAddr = address!.toLowerCase();

      const [outgoing, incoming] = await Promise.all([
        getAssetTransfers({
          fromBlock: deployBlockHex,
          toBlock: 'latest',
          fromAddress: address,
          category: ['external'],
          excludeZeroValue: false,
        }),
        getAssetTransfers({
          fromBlock: deployBlockHex,
          toBlock: 'latest',
          toAddress: address,
          category: ['internal'],
          excludeZeroValue: false,
        }),
      ]);

      const factoryLower = FACTORY_ADDRESS.toLowerCase();
      const relevantOutgoing = outgoing.filter(
        (t) => relevantAddresses.has(t.to.toLowerCase()) || t.to.toLowerCase() === factoryLower
      );
      const relevantIncoming = incoming.filter(
        (t) => relevantAddresses.has(t.from.toLowerCase())
      );

      const allTxHashes = [
        ...new Set([
          ...relevantOutgoing.map((t) => t.hash),
          ...relevantIncoming.map((t) => t.hash),
        ]),
      ] as `0x${string}`[];

      if (allTxHashes.length === 0) {
        return {
          entries: [] as MoneyFlowEntry[],
          summary: {
            totalGasSpent: 0n,
            totalValueIn: 0n,
            totalValueOut: 0n,
            netPosition: 0n,
            entryCount: 0,
          },
        };
      }

      const receiptMap = new Map<string, TransactionReceipt>();
      const RECEIPT_BATCH = 5;
      for (let i = 0; i < allTxHashes.length; i += RECEIPT_BATCH) {
        const batch = allTxHashes.slice(i, i + RECEIPT_BATCH);
        const results = await Promise.all(
          batch.map((hash) =>
            queryClient.fetchQuery({
              queryKey: ['tx-receipt', hash],
              queryFn: () => client.getTransactionReceipt({ hash }),
              staleTime: Infinity,
            }).catch(() => null)
          )
        );
        for (let j = 0; j < results.length; j++) {
          if (results[j]) receiptMap.set(batch[j].toLowerCase(), results[j]!);
        }
      }

      const blockMap = new Map<bigint, Block>();
      const uniqueBlocks = [...new Set([...receiptMap.values()].map((r) => r.blockNumber))];
      const BLOCK_BATCH = 5;
      for (let i = 0; i < uniqueBlocks.length; i += BLOCK_BATCH) {
        const batch = uniqueBlocks.slice(i, i + BLOCK_BATCH);
        const results = await Promise.all(
          batch.map((blockNum) =>
            queryClient.fetchQuery({
              queryKey: ['block', blockNum.toString()],
              queryFn: () => client.getBlock({ blockNumber: blockNum }),
              staleTime: Infinity,
            }).catch(() => null)
          )
        );
        for (let j = 0; j < results.length; j++) {
          if (results[j]) blockMap.set(batch[j], results[j]!);
        }
      }

      const entries: MoneyFlowEntry[] = [];

      const getTimestamp = (blockNum: bigint): number => {
        const block = blockMap.get(blockNum);
        return block ? Number(block.timestamp) : 0;
      };

      const getMatchLabels = (contractAddr: string) =>
        matchLabelMap.get(contractAddr.toLowerCase()) ?? { teamA: 'Unknown', teamB: 'Unknown' };

      const orgSet = new Set(organizedAddresses.map((a) => a.toLowerCase()));

      for (const receipt of receiptMap.values()) {
        const isUserTx = receipt.from.toLowerCase() === userAddr;
        const txGas = isUserTx ? receipt.gasUsed * receipt.effectiveGasPrice : 0n;
        const ts = getTimestamp(receipt.blockNumber);
        let gasAssigned = false;

        for (const log of receipt.logs) {
          const logAddr = log.address.toLowerCase();
          if (!relevantAddresses.has(logAddr) && logAddr !== factoryLower) continue;
          if (log.topics.length === 0) continue;

          if (logAddr === factoryLower) {
            try {
              const decoded = decodeEventLog({
                abi: BET_FACTORY_ABI,
                data: log.data,
                topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
              });
              if (decoded.eventName === 'MatchCreated') {
                const args = decoded.args as any;
                if (args.organizer?.toLowerCase() !== userAddr) continue;
                const gas = gasAssigned ? 0n : txGas;
                gasAssigned = true;
                entries.push({
                  id: `${receipt.transactionHash}-${log.logIndex}`,
                  txHash: receipt.transactionHash,
                  blockNumber: receipt.blockNumber,
                  logIndex: Number(log.logIndex),
                  timestamp: ts,
                  type: 'create_match',
                  contractAddress: args.matchContract,
                  teamA: args.teamA,
                  teamB: args.teamB,
                  value: 0n,
                  gasCost: gas,
                  netImpact: -gas,
                });
              }
            } catch { /* not a recognized factory event */ }
            continue;
          }

          try {
            const decoded = decodeEventLog({
              abi: BET_MATCH_ABI,
              data: log.data,
              topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
            });
            const { teamA, teamB } = getMatchLabels(logAddr);

            switch (decoded.eventName) {
              case 'BetPlaced': {
                const args = decoded.args as any;
                if (args.bettor?.toLowerCase() !== userAddr) continue;
                const gas = gasAssigned ? 0n : txGas;
                gasAssigned = true;
                const betValue = -(args.amount as bigint);
                entries.push({
                  id: `${receipt.transactionHash}-${log.logIndex}`,
                  txHash: receipt.transactionHash,
                  blockNumber: receipt.blockNumber,
                  logIndex: Number(log.logIndex),
                  timestamp: ts,
                  type: 'place_bet',
                  contractAddress: log.address,
                  teamA,
                  teamB,
                  detail: args.team === Team.TeamA ? teamA : teamB,
                  value: betValue,
                  gasCost: gas,
                  netImpact: betValue - gas,
                });
                break;
              }
              case 'PrizeClaimed': {
                const args = decoded.args as any;
                if (args.winner?.toLowerCase() !== userAddr) continue;
                const gas = gasAssigned ? 0n : txGas;
                gasAssigned = true;
                entries.push({
                  id: `${receipt.transactionHash}-${log.logIndex}`,
                  txHash: receipt.transactionHash,
                  blockNumber: receipt.blockNumber,
                  logIndex: Number(log.logIndex),
                  timestamp: ts,
                  type: 'claim_prize',
                  contractAddress: log.address,
                  teamA,
                  teamB,
                  value: args.amount as bigint,
                  gasCost: gas,
                  netImpact: (args.amount as bigint) - gas,
                });
                break;
              }
              case 'RefundClaimed': {
                const args = decoded.args as any;
                if (args.bettor?.toLowerCase() !== userAddr) continue;
                const gas = gasAssigned ? 0n : txGas;
                gasAssigned = true;
                entries.push({
                  id: `${receipt.transactionHash}-${log.logIndex}`,
                  txHash: receipt.transactionHash,
                  blockNumber: receipt.blockNumber,
                  logIndex: Number(log.logIndex),
                  timestamp: ts,
                  type: 'claim_refund',
                  contractAddress: log.address,
                  teamA,
                  teamB,
                  value: args.amount as bigint,
                  gasCost: gas,
                  netImpact: (args.amount as bigint) - gas,
                });
                break;
              }
              case 'ResultSet': {
                if (!orgSet.has(logAddr)) continue;
                const gas = gasAssigned ? 0n : txGas;
                gasAssigned = true;
                entries.push({
                  id: `${receipt.transactionHash}-${log.logIndex}`,
                  txHash: receipt.transactionHash,
                  blockNumber: receipt.blockNumber,
                  logIndex: Number(log.logIndex),
                  timestamp: ts,
                  type: 'set_result',
                  contractAddress: log.address,
                  teamA,
                  teamB,
                  value: 0n,
                  gasCost: gas,
                  netImpact: -gas,
                });
                break;
              }
              case 'OrganizerPaid': {
                const args = decoded.args as any;
                if (args.organizer?.toLowerCase() !== userAddr) continue;
                entries.push({
                  id: `${receipt.transactionHash}-${log.logIndex}`,
                  txHash: receipt.transactionHash,
                  blockNumber: receipt.blockNumber,
                  logIndex: Number(log.logIndex),
                  timestamp: ts,
                  type: 'organizer_fee',
                  contractAddress: log.address,
                  teamA,
                  teamB,
                  value: args.amount as bigint,
                  gasCost: 0n,
                  netImpact: args.amount as bigint,
                });
                break;
              }
              case 'OrganizerPaymentFailed': {
                const args = decoded.args as any;
                if (args.organizer?.toLowerCase() !== userAddr) continue;
                entries.push({
                  id: `${receipt.transactionHash}-${log.logIndex}`,
                  txHash: receipt.transactionHash,
                  blockNumber: receipt.blockNumber,
                  logIndex: Number(log.logIndex),
                  timestamp: ts,
                  type: 'organizer_fee_failed',
                  contractAddress: log.address,
                  teamA,
                  teamB,
                  value: 0n,
                  gasCost: 0n,
                  netImpact: 0n,
                });
                break;
              }
            }
          } catch { /* not a recognized match event */ }
        }
      }

      entries.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber < b.blockNumber ? -1 : 1;
        }
        return a.logIndex - b.logIndex;
      });

      let totalGasSpent = 0n;
      let totalValueIn = 0n;
      let totalValueOut = 0n;

      for (const entry of entries) {
        totalGasSpent += entry.gasCost;
        if (entry.value > 0n) totalValueIn += entry.value;
        if (entry.value < 0n) totalValueOut += -entry.value;
      }

      const summary: MoneyFlowSummary = {
        totalGasSpent,
        totalValueIn,
        totalValueOut,
        netPosition: totalValueIn - totalValueOut - totalGasSpent,
        entryCount: entries.length,
      };

      return { entries, summary };
    },
    enabled: hasData,
    staleTime: 120_000,
    refetchInterval: 120_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(3000 * Math.pow(2, attempt), 15000),
  });
}
