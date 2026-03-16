import { eq, desc, asc, and, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { redis } from '../config/redis.js';
import { matches, bets, organizers } from '../db/schema.js';
import { config } from '../config/index.js';

const CACHE_TTL = config.CACHE_TTL;

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch { /* cache miss */ }
  return null;
}

async function setCache(key: string, data: unknown, ttl = CACHE_TTL): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch { /* cache write failure is non-fatal */ }
}

function invalidatePattern(pattern: string): void {
  redis.keys(pattern).then(keys => {
    if (keys.length > 0) redis.del(...keys);
  }).catch(() => {});
}

export interface MatchFilters {
  status?: 'all' | 'active' | 'completed';
  organizer?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const matchService = {
  async getAll(filters: MatchFilters = {}) {
    const { status = 'all', organizer, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = filters;
    const cacheKey = `matches:${status}:${organizer ?? 'all'}:${sort}:${order}:${page}:${limit}`;

    const cached = await getCached<ReturnType<typeof this.getAll> extends Promise<infer R> ? R : never>(cacheKey);
    if (cached) return cached;

    const offset = (page - 1) * limit;

    const conditions = [];
    if (status === 'active') conditions.push(eq(matches.isActive, true));
    else if (status === 'completed') conditions.push(eq(matches.isActive, false));
    if (organizer) conditions.push(eq(matches.organizer, organizer.toLowerCase()));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderColumn = sort === 'matchStartTime' ? matches.matchStartTime : matches.createdAt;
    const orderDir = order === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const results = await db
      .select()
      .from(matches)
      .where(whereClause)
      .orderBy(orderDir)
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);

    const response = {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await setCache(cacheKey, response);
    return response;
  },

  async getByAddress(address: string) {
    const cacheKey = `match:${address.toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    const result = await db
      .select()
      .from(matches)
      .where(eq(matches.contractAddress, address.toLowerCase()))
      .limit(1);

    const match = result[0] ?? null;
    if (match) await setCache(cacheKey, match);
    return match;
  },

  async getByFactoryId(factoryId: number) {
    const result = await db
      .select()
      .from(matches)
      .where(eq(matches.factoryId, factoryId))
      .limit(1);
    return result[0] ?? null;
  },

  async getMatchBets(contractAddress: string, page = 1, limit = 50) {
    const match = await this.getByAddress(contractAddress);
    if (!match) return null;

    const offset = (page - 1) * limit;
    const results = await db
      .select()
      .from(bets)
      .where(eq(bets.matchId, match.id))
      .orderBy(desc(bets.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bets)
      .where(eq(bets.matchId, match.id));

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getMatchStats(contractAddress: string) {
    const match = await this.getByAddress(contractAddress);
    if (!match) return null;

    const totalPoolA = BigInt(match.totalPoolA);
    const totalPoolB = BigInt(match.totalPoolB);
    const totalPool = totalPoolA + totalPoolB;

    const bettorCountA = await db
      .select({ count: sql<number>`count(DISTINCT bettor)` })
      .from(bets)
      .where(and(eq(bets.matchId, match.id), eq(bets.team, 'teamA')));

    const bettorCountB = await db
      .select({ count: sql<number>`count(DISTINCT bettor)` })
      .from(bets)
      .where(and(eq(bets.matchId, match.id), eq(bets.team, 'teamB')));

    return {
      totalPool: totalPool.toString(),
      totalBettors: Number(bettorCountA[0]?.count ?? 0) + Number(bettorCountB[0]?.count ?? 0),
      teamA: {
        pool: totalPoolA.toString(),
        bettors: Number(bettorCountA[0]?.count ?? 0),
      },
      teamB: {
        pool: totalPoolB.toString(),
        bettors: Number(bettorCountB[0]?.count ?? 0),
      },
    };
  },

  async upsertMatch(data: {
    contractAddress: string;
    factoryId: number;
    organizer: string;
    teamA: string;
    teamB: string;
    betAmount: string;
    matchStartTime: Date;
  }) {
    const existing = await this.getByAddress(data.contractAddress);
    if (existing) return existing;

    const result = await db.insert(matches).values({
      contractAddress: data.contractAddress.toLowerCase(),
      factoryId: data.factoryId,
      organizer: data.organizer.toLowerCase(),
      teamA: data.teamA,
      teamB: data.teamB,
      betAmount: data.betAmount,
      matchStartTime: data.matchStartTime,
    }).returning();

    await db.insert(organizers).values({
      address: data.organizer.toLowerCase(),
      totalMatches: 1,
    }).onConflictDoUpdate({
      target: organizers.address,
      set: {
        totalMatches: sql`${organizers.totalMatches} + 1`,
        updatedAt: new Date(),
      },
    });

    return result[0];
  },

  async updatePools(contractAddress: string, totalPoolA: string, totalPoolB: string) {
    await db.update(matches)
      .set({ totalPoolA, totalPoolB, updatedAt: new Date() })
      .where(eq(matches.contractAddress, contractAddress.toLowerCase()));
    invalidatePattern('matches:*');
    invalidatePattern(`match:${contractAddress.toLowerCase()}`);
  },

  async setResult(contractAddress: string, result: string) {
    await db.update(matches)
      .set({ result, isActive: false, updatedAt: new Date() })
      .where(eq(matches.contractAddress, contractAddress.toLowerCase()));
    invalidatePattern('matches:*');
    invalidatePattern(`match:${contractAddress.toLowerCase()}`);
  },
};
