import { parseAbiItem, type Log } from 'viem';
import { publicClient } from '../config/blockchain.js';
import { redisPub } from '../config/redis.js';
import { matchService } from '../services/match-service.js';
import { betService } from '../services/bet-service.js';
import { organizerService } from '../services/organizer-service.js';
import { config } from '../config/index.js';
import { db } from '../config/database.js';
import { syncState } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const MATCH_CREATED_EVENT = parseAbiItem(
  'event MatchCreated(uint256 indexed matchId, address indexed matchContract, address indexed organizer, string teamA, string teamB, uint256 matchStartTime, uint256 betAmount)'
);

const BET_PLACED_EVENT = parseAbiItem(
  'event BetPlaced(address indexed bettor, uint8 team, uint256 amount)'
);

const RESULT_SET_EVENT = parseAbiItem(
  'event ResultSet(uint8 result)'
);

const PRIZE_CLAIMED_EVENT = parseAbiItem(
  'event PrizeClaimed(address indexed winner, uint256 amount)'
);

const REFUND_CLAIMED_EVENT = parseAbiItem(
  'event RefundClaimed(address indexed bettor, uint256 amount)'
);

const ORGANIZER_RATED_EVENT = parseAbiItem(
  'event OrganizerRated(address indexed organizer, address indexed rater, uint256 indexed matchId, uint8 rating)'
);

let isRunning = false;
const watchedMatchAddresses = new Set<string>();

async function getLastSyncedBlock(): Promise<number> {
  const result = await db.select().from(syncState).where(eq(syncState.id, 'indexer')).limit(1);
  return result[0]?.lastBlockNumber ?? 0;
}

async function updateLastSyncedBlock(blockNumber: number) {
  await db.insert(syncState).values({
    id: 'indexer',
    lastBlockNumber: blockNumber,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: syncState.id,
    set: {
      lastBlockNumber: blockNumber,
      updatedAt: new Date(),
    },
  });
}

async function publishEvent(channel: string, type: string, data: Record<string, unknown>) {
  await redisPub.publish('dgamebet:events', JSON.stringify({ channel, type, data }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMatchCreated(log: Log & { args?: any }) {
  try {
    const args = log.args;
    if (!args) return;

    await matchService.upsertMatch({
      contractAddress: args.matchContract,
      factoryId: Number(args.matchId),
      organizer: args.organizer,
      teamA: args.teamA,
      teamB: args.teamB,
      betAmount: args.betAmount.toString(),
      matchStartTime: new Date(Number(args.matchStartTime) * 1000),
    });

    await publishEvent('matches', 'match:created', {
      contractAddress: args.matchContract,
      organizer: args.organizer,
      teamA: args.teamA,
      teamB: args.teamB,
    });

    watchMatchContract(args.matchContract);

    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error('Error processing MatchCreated:', err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processBetPlaced(log: Log & { args?: any }) {
  try {
    const args = log.args;
    if (!args) return;

    const matchAddress = log.address;
    const match = await matchService.getByAddress(matchAddress);
    if (!match) return;

    const team = Number(args.team) === 0 ? 'teamA' : 'teamB';
    await betService.recordBet({
      matchId: match.id,
      bettor: args.bettor,
      team,
      amount: args.amount.toString(),
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
    });

    const newPoolA = team === 'teamA'
      ? (BigInt(match.totalPoolA) + args.amount).toString()
      : match.totalPoolA;
    const newPoolB = team === 'teamB'
      ? (BigInt(match.totalPoolB) + args.amount).toString()
      : match.totalPoolB;

    await matchService.updatePools(matchAddress, newPoolA, newPoolB);

    await publishEvent(`match:${matchAddress}`, 'bet:placed', {
      bettor: args.bettor,
      team,
      amount: args.amount.toString(),
      newPoolTeamA: newPoolA,
      newPoolTeamB: newPoolB,
    });

    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error('Error processing BetPlaced:', err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processResultSet(log: Log & { args?: any }) {
  try {
    const args = log.args;
    if (!args) return;

    const matchAddress = log.address;
    const resultMap: Record<number, string> = {
      1: 'teamA',
      2: 'teamB',
      3: 'draw',
    };
    const result = resultMap[Number(args.result)] ?? 'pending';

    await matchService.setResult(matchAddress, result);

    await publishEvent(`match:${matchAddress}`, 'result:set', {
      result,
    });

    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error('Error processing ResultSet:', err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processPrizeClaimed(log: Log & { args?: any }) {
  try {
    const args = log.args;
    if (!args) return;

    const matchAddress = log.address;
    await betService.markClaimed(matchAddress, args.winner);

    await publishEvent(`match:${matchAddress}`, 'prize:claimed', {
      winner: args.winner,
      amount: args.amount.toString(),
    });

    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error('Error processing PrizeClaimed:', err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processRefundClaimed(log: Log & { args?: any }) {
  try {
    const args = log.args;
    if (!args) return;

    const matchAddress = log.address;
    await betService.markClaimed(matchAddress, args.bettor);

    await publishEvent(`match:${matchAddress}`, 'refund:claimed', {
      bettor: args.bettor,
      amount: args.amount.toString(),
    });

    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error('Error processing RefundClaimed:', err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processOrganizerRated(log: Log & { args?: any }) {
  try {
    const args = log.args;
    if (!args) return;

    const factoryId = Number(args.matchId);
    const match = await matchService.getByFactoryId(factoryId);
    if (!match) {
      console.error('OrganizerRated: no match found for factoryId', factoryId);
      return;
    }

    await organizerService.recordRating({
      organizer: args.organizer,
      rater: args.rater,
      matchId: match.id,
      rating: Number(args.rating),
      txHash: log.transactionHash!,
    });

    await publishEvent('ratings', 'organizer:rated', {
      organizer: args.organizer,
      rater: args.rater,
      matchId: factoryId,
      rating: Number(args.rating),
    });

    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error('Error processing OrganizerRated:', err);
  }
}

const LOG_BLOCK_CHUNK_SIZE = 10n;

async function getLogsInChunks(params: {
  address: `0x${string}`;
  event: ReturnType<typeof parseAbiItem>;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  const allLogs: (Log & { args?: unknown })[] = [];
  let cursor = params.fromBlock;

  while (cursor <= params.toBlock) {
    const chunkEnd = cursor + LOG_BLOCK_CHUNK_SIZE - 1n > params.toBlock
      ? params.toBlock
      : cursor + LOG_BLOCK_CHUNK_SIZE - 1n;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs = await publicClient.getLogs({
      address: params.address,
      event: params.event as any,
      fromBlock: cursor,
      toBlock: chunkEnd,
    });

    allLogs.push(...logs);
    cursor = chunkEnd + 1n;
  }

  return allLogs;
}

async function indexHistoricalEvents(fromBlock: bigint, toBlock: bigint) {
  console.log(`Indexing historical events from block ${fromBlock} to ${toBlock} (chunk size: ${LOG_BLOCK_CHUNK_SIZE})`);

  const factoryAddr = config.FACTORY_ADDRESS as `0x${string}`;

  const matchCreatedLogs = await getLogsInChunks({
    address: factoryAddr,
    event: MATCH_CREATED_EVENT,
    fromBlock,
    toBlock,
  });

  for (const log of matchCreatedLogs) {
    await processMatchCreated(log);
  }

  for (const addr of watchedMatchAddresses) {
    const hexAddr = addr as `0x${string}`;

    const betLogs = await getLogsInChunks({ address: hexAddr, event: BET_PLACED_EVENT, fromBlock, toBlock });
    for (const log of betLogs) await processBetPlaced(log);

    const resultLogs = await getLogsInChunks({ address: hexAddr, event: RESULT_SET_EVENT, fromBlock, toBlock });
    for (const log of resultLogs) await processResultSet(log);

    const prizeLogs = await getLogsInChunks({ address: hexAddr, event: PRIZE_CLAIMED_EVENT, fromBlock, toBlock });
    for (const log of prizeLogs) await processPrizeClaimed(log);

    const refundLogs = await getLogsInChunks({ address: hexAddr, event: REFUND_CLAIMED_EVENT, fromBlock, toBlock });
    for (const log of refundLogs) await processRefundClaimed(log);
  }

  const ratedLogs = await getLogsInChunks({
    address: factoryAddr,
    event: ORGANIZER_RATED_EVENT,
    fromBlock,
    toBlock,
  });
  for (const log of ratedLogs) await processOrganizerRated(log);
}

function watchMatchContract(matchAddress: string) {
  if (watchedMatchAddresses.has(matchAddress)) return;
  watchedMatchAddresses.add(matchAddress);

  const addr = matchAddress as `0x${string}`;

  publicClient.watchEvent({
    address: addr,
    event: BET_PLACED_EVENT,
    onLogs: (logs) => { for (const log of logs) processBetPlaced(log); },
  });

  publicClient.watchEvent({
    address: addr,
    event: RESULT_SET_EVENT,
    onLogs: (logs) => { for (const log of logs) processResultSet(log); },
  });

  publicClient.watchEvent({
    address: addr,
    event: PRIZE_CLAIMED_EVENT,
    onLogs: (logs) => { for (const log of logs) processPrizeClaimed(log); },
  });

  publicClient.watchEvent({
    address: addr,
    event: REFUND_CLAIMED_EVENT,
    onLogs: (logs) => { for (const log of logs) processRefundClaimed(log); },
  });

  console.log('Watching match contract:', matchAddress);
}

export async function startIndexer() {
  if (isRunning) return;
  if (config.FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.log('No factory address configured, skipping indexer');
    return;
  }

  isRunning = true;
  console.log('Starting blockchain indexer...');

  const lastBlock = await getLastSyncedBlock();
  console.log('Last synced block:', lastBlock);

  try {
    const currentBlock = await publicClient.getBlockNumber();

    let deployBlock = 0;
    try {
      const result = await publicClient.readContract({
        address: config.FACTORY_ADDRESS as `0x${string}`,
        abi: [{ type: 'function', name: 'deployBlock', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }] as const,
        functionName: 'deployBlock',
      });
      deployBlock = Number(result);
    } catch {
      console.warn('Could not read deployBlock from factory, starting from block 0');
    }

    const fromBlock = lastBlock > 0 ? lastBlock : deployBlock;

    if (fromBlock < Number(currentBlock)) {
      await indexHistoricalEvents(BigInt(fromBlock), currentBlock);
    }

    publicClient.watchEvent({
      address: config.FACTORY_ADDRESS as `0x${string}`,
      event: MATCH_CREATED_EVENT,
      onLogs: (logs) => {
        for (const log of logs) {
          processMatchCreated(log);
        }
      },
    });

    publicClient.watchEvent({
      address: config.FACTORY_ADDRESS as `0x${string}`,
      event: ORGANIZER_RATED_EVENT,
      onLogs: (logs) => {
        for (const log of logs) {
          processOrganizerRated(log);
        }
      },
    });

    console.log('Indexer watching for events on factory:', config.FACTORY_ADDRESS);
  } catch (err) {
    console.error('Indexer error:', err);
    isRunning = false;
  }
}
