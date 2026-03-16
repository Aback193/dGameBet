var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";

// src/config/index.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("postgres://dgamebet:dgamebet_dev@localhost:5432/dgamebet"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RPC_URL: z.string().default("https://eth-sepolia.g.alchemy.com/v2/demo"),
  FACTORY_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  CACHE_TTL: z.coerce.number().default(15)
});
var config = envSchema.parse(process.env);

// src/api/routes/matches.ts
import { z as z2 } from "zod";

// src/services/match-service.ts
import { eq, desc, asc, and, sql } from "drizzle-orm";

// src/config/database.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bets: () => bets,
  matches: () => matches,
  organizers: () => organizers,
  ratings: () => ratings,
  syncState: () => syncState
});
import { pgTable, text, uuid, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
var matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractAddress: text("contract_address").unique().notNull(),
  factoryId: integer("factory_id").notNull(),
  organizer: text("organizer").notNull(),
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  betAmount: numeric("bet_amount", { precision: 78, scale: 0 }).notNull(),
  matchStartTime: timestamp("match_start_time").notNull(),
  result: text("result").default("pending").notNull(),
  totalPoolA: numeric("total_pool_a", { precision: 78, scale: 0 }).default("0").notNull(),
  totalPoolB: numeric("total_pool_b", { precision: 78, scale: 0 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var bets = pgTable("bets", {
  id: uuid("id").defaultRandom().primaryKey(),
  matchId: uuid("match_id").references(() => matches.id).notNull(),
  bettor: text("bettor").notNull(),
  team: text("team").notNull(),
  amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
  txHash: text("tx_hash").unique().notNull(),
  blockNumber: integer("block_number").notNull(),
  claimed: boolean("claimed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var organizers = pgTable("organizers", {
  address: text("address").primaryKey(),
  totalMatches: integer("total_matches").default(0).notNull(),
  totalRatings: integer("total_ratings").default(0).notNull(),
  ratingSum: integer("rating_sum").default(0).notNull(),
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }),
  totalVolume: numeric("total_volume", { precision: 78, scale: 0 }).default("0").notNull(),
  totalEarnings: numeric("total_earnings", { precision: 78, scale: 0 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var ratings = pgTable("ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizer: text("organizer").references(() => organizers.address).notNull(),
  rater: text("rater").notNull(),
  matchId: uuid("match_id").references(() => matches.id).notNull(),
  rating: integer("rating").notNull(),
  txHash: text("tx_hash").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var syncState = pgTable("sync_state", {
  id: text("id").primaryKey().default("indexer"),
  lastBlockNumber: integer("last_block_number").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// src/config/database.ts
var queryClient = postgres(config.DATABASE_URL);
var db = drizzle(queryClient, { schema: schema_exports });

// src/config/redis.ts
import Redis from "ioredis";
var redis = new Redis(config.REDIS_URL);
var redisSub = new Redis(config.REDIS_URL);
var redisPub = new Redis(config.REDIS_URL);

// src/services/match-service.ts
var CACHE_TTL = config.CACHE_TTL;
async function getCached(key) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch {
  }
  return null;
}
async function setCache(key, data, ttl = CACHE_TTL) {
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch {
  }
}
function invalidatePattern(pattern) {
  redis.keys(pattern).then((keys) => {
    if (keys.length > 0) redis.del(...keys);
  }).catch(() => {
  });
}
var matchService = {
  async getAll(filters = {}) {
    const { status = "all", organizer, page = 1, limit = 20, sort = "createdAt", order = "desc" } = filters;
    const cacheKey = `matches:${status}:${organizer ?? "all"}:${sort}:${order}:${page}:${limit}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (status === "active") conditions.push(eq(matches.isActive, true));
    else if (status === "completed") conditions.push(eq(matches.isActive, false));
    if (organizer) conditions.push(eq(matches.organizer, organizer.toLowerCase()));
    const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
    const orderColumn = sort === "matchStartTime" ? matches.matchStartTime : matches.createdAt;
    const orderDir = order === "asc" ? asc(orderColumn) : desc(orderColumn);
    const results = await db.select().from(matches).where(whereClause).orderBy(orderDir).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql`count(*)` }).from(matches).where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);
    const response = {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    await setCache(cacheKey, response);
    return response;
  },
  async getByAddress(address) {
    const cacheKey = `match:${address.toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;
    const result = await db.select().from(matches).where(eq(matches.contractAddress, address.toLowerCase())).limit(1);
    const match = result[0] ?? null;
    if (match) await setCache(cacheKey, match);
    return match;
  },
  async getByFactoryId(factoryId) {
    const result = await db.select().from(matches).where(eq(matches.factoryId, factoryId)).limit(1);
    return result[0] ?? null;
  },
  async getMatchBets(contractAddress, page = 1, limit = 50) {
    const match = await this.getByAddress(contractAddress);
    if (!match) return null;
    const offset = (page - 1) * limit;
    const results = await db.select().from(bets).where(eq(bets.matchId, match.id)).orderBy(desc(bets.createdAt)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql`count(*)` }).from(bets).where(eq(bets.matchId, match.id));
    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },
  async getMatchStats(contractAddress) {
    const match = await this.getByAddress(contractAddress);
    if (!match) return null;
    const totalPoolA = BigInt(match.totalPoolA);
    const totalPoolB = BigInt(match.totalPoolB);
    const totalPool = totalPoolA + totalPoolB;
    const bettorCountA = await db.select({ count: sql`count(DISTINCT bettor)` }).from(bets).where(and(eq(bets.matchId, match.id), eq(bets.team, "teamA")));
    const bettorCountB = await db.select({ count: sql`count(DISTINCT bettor)` }).from(bets).where(and(eq(bets.matchId, match.id), eq(bets.team, "teamB")));
    return {
      totalPool: totalPool.toString(),
      totalBettors: Number(bettorCountA[0]?.count ?? 0) + Number(bettorCountB[0]?.count ?? 0),
      teamA: {
        pool: totalPoolA.toString(),
        bettors: Number(bettorCountA[0]?.count ?? 0)
      },
      teamB: {
        pool: totalPoolB.toString(),
        bettors: Number(bettorCountB[0]?.count ?? 0)
      }
    };
  },
  async upsertMatch(data) {
    const existing = await this.getByAddress(data.contractAddress);
    if (existing) return existing;
    const result = await db.insert(matches).values({
      contractAddress: data.contractAddress.toLowerCase(),
      factoryId: data.factoryId,
      organizer: data.organizer.toLowerCase(),
      teamA: data.teamA,
      teamB: data.teamB,
      betAmount: data.betAmount,
      matchStartTime: data.matchStartTime
    }).returning();
    await db.insert(organizers).values({
      address: data.organizer.toLowerCase(),
      totalMatches: 1
    }).onConflictDoUpdate({
      target: organizers.address,
      set: {
        totalMatches: sql`${organizers.totalMatches} + 1`,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    return result[0];
  },
  async updatePools(contractAddress, totalPoolA, totalPoolB) {
    await db.update(matches).set({ totalPoolA, totalPoolB, updatedAt: /* @__PURE__ */ new Date() }).where(eq(matches.contractAddress, contractAddress.toLowerCase()));
    invalidatePattern("matches:*");
    invalidatePattern(`match:${contractAddress.toLowerCase()}`);
  },
  async setResult(contractAddress, result) {
    await db.update(matches).set({ result, isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(matches.contractAddress, contractAddress.toLowerCase()));
    invalidatePattern("matches:*");
    invalidatePattern(`match:${contractAddress.toLowerCase()}`);
  }
};

// src/api/routes/matches.ts
var addressSchema = z2.string().regex(/^0x[a-fA-F0-9]{40}$/);
async function matchRoutes(app2) {
  app2.get("/matches", async (request, reply) => {
    const query = request.query;
    const result = await matchService.getAll({
      status: query.status ?? "all",
      organizer: query.organizer,
      sort: query.sort,
      order: query.order ?? "desc",
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20
    });
    return reply.send({ success: true, ...result });
  });
  app2.get("/matches/active", async (_request, reply) => {
    const result = await matchService.getAll({ status: "active" });
    return reply.send({ success: true, data: result.data });
  });
  app2.get("/matches/completed", async (_request, reply) => {
    const result = await matchService.getAll({ status: "completed" });
    return reply.send({ success: true, data: result.data });
  });
  app2.get("/matches/:address", async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const match = await matchService.getByAddress(request.params.address);
    if (!match) {
      return reply.status(404).send({
        success: false,
        error: { code: "MATCH_NOT_FOUND", message: `Match with address ${request.params.address} not found` }
      });
    }
    return reply.send({ success: true, data: match });
  });
  app2.get("/matches/:address/bets", async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const query = request.query;
    const result = await matchService.getMatchBets(
      request.params.address,
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 50
    );
    if (!result) {
      return reply.status(404).send({
        success: false,
        error: { code: "MATCH_NOT_FOUND", message: "Match not found" }
      });
    }
    return reply.send({ success: true, ...result });
  });
  app2.get("/matches/:address/stats", async (request, reply) => {
    const parseResult = addressSchema.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const stats = await matchService.getMatchStats(request.params.address);
    if (!stats) {
      return reply.status(404).send({
        success: false,
        error: { code: "MATCH_NOT_FOUND", message: "Match not found" }
      });
    }
    return reply.send({ success: true, data: stats });
  });
}

// src/api/routes/users.ts
import { z as z3 } from "zod";

// src/services/bet-service.ts
import { eq as eq2, desc as desc2, and as and2, sql as sql2 } from "drizzle-orm";
var betService = {
  async getUserBets(userAddress, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const results = await db.select({
      bet: bets,
      match: matches
    }).from(bets).innerJoin(matches, eq2(bets.matchId, matches.id)).where(eq2(bets.bettor, userAddress.toLowerCase())).orderBy(desc2(bets.createdAt)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql2`count(*)` }).from(bets).where(eq2(bets.bettor, userAddress.toLowerCase()));
    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: results.map((r) => ({
        ...r.bet,
        match: {
          contractAddress: r.match.contractAddress,
          teamA: r.match.teamA,
          teamB: r.match.teamB,
          matchStartTime: r.match.matchStartTime,
          result: r.match.result
        }
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },
  async getUnclaimedPrizes(userAddress) {
    const results = await db.select({
      bet: bets,
      match: matches
    }).from(bets).innerJoin(matches, eq2(bets.matchId, matches.id)).where(
      and2(
        eq2(bets.bettor, userAddress.toLowerCase()),
        eq2(bets.claimed, false),
        eq2(matches.isActive, false)
      )
    );
    return results.filter((r) => {
      if (r.match.result === "draw") return true;
      if (r.match.result === "teamA" && r.bet.team === "teamA") return true;
      if (r.match.result === "teamB" && r.bet.team === "teamB") return true;
      return false;
    }).map((r) => ({
      matchAddress: r.match.contractAddress,
      teamA: r.match.teamA,
      teamB: r.match.teamB,
      result: r.match.result,
      userBet: r.bet.amount,
      userTeam: r.bet.team
    }));
  },
  async recordBet(data) {
    const existing = await db.select().from(bets).where(eq2(bets.txHash, data.txHash)).limit(1);
    if (existing.length > 0) return existing[0];
    const result = await db.insert(bets).values({
      matchId: data.matchId,
      bettor: data.bettor.toLowerCase(),
      team: data.team,
      amount: data.amount,
      txHash: data.txHash,
      blockNumber: data.blockNumber
    }).returning();
    return result[0];
  },
  async markClaimed(matchAddress, bettor) {
    const matchResult = await db.select({ id: matches.id }).from(matches).where(eq2(matches.contractAddress, matchAddress.toLowerCase())).limit(1);
    if (!matchResult[0]) return;
    await db.update(bets).set({ claimed: true }).where(
      and2(
        eq2(bets.matchId, matchResult[0].id),
        eq2(bets.bettor, bettor.toLowerCase())
      )
    );
  }
};

// src/api/routes/users.ts
var addressSchema2 = z3.string().regex(/^0x[a-fA-F0-9]{40}$/);
async function userRoutes(app2) {
  app2.get("/users/:address/bets", async (request, reply) => {
    const parseResult = addressSchema2.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const query = request.query;
    const result = await betService.getUserBets(
      request.params.address,
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20
    );
    return reply.send({ success: true, ...result });
  });
  app2.get("/users/:address/unclaimed", async (request, reply) => {
    const parseResult = addressSchema2.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const unclaimed = await betService.getUnclaimedPrizes(request.params.address);
    return reply.send({ success: true, data: unclaimed });
  });
}

// src/api/routes/organizers.ts
import { z as z4 } from "zod";

// src/services/organizer-service.ts
import { eq as eq3, desc as desc3, sql as sql3 } from "drizzle-orm";
var organizerService = {
  async getProfile(address) {
    const result = await db.select().from(organizers).where(eq3(organizers.address, address.toLowerCase())).limit(1);
    if (result.length === 0) return null;
    const org = result[0];
    const activeMatches = await db.select({ count: sql3`count(*)` }).from(matches).where(sql3`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = true`);
    const completedMatches = await db.select({ count: sql3`count(*)` }).from(matches).where(sql3`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = false`);
    return {
      address: org.address,
      totalMatches: org.totalMatches,
      activeMatches: Number(activeMatches[0]?.count ?? 0),
      completedMatches: Number(completedMatches[0]?.count ?? 0),
      totalVolume: org.totalVolume,
      totalEarnings: org.totalEarnings,
      rating: {
        average: org.averageRating ? parseFloat(org.averageRating) : 0,
        count: org.totalRatings
      },
      createdAt: org.createdAt
    };
  },
  async getMatches(address, status = "all", page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let condition = sql3`${matches.organizer} = ${address.toLowerCase()}`;
    if (status === "active") {
      condition = sql3`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = true`;
    } else if (status === "completed") {
      condition = sql3`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = false`;
    }
    const results = await db.select().from(matches).where(condition).orderBy(desc3(matches.createdAt)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql3`count(*)` }).from(matches).where(condition);
    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },
  async getRatings(address, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const results = await db.select().from(ratings).where(eq3(ratings.organizer, address.toLowerCase())).orderBy(desc3(ratings.createdAt)).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql3`count(*)` }).from(ratings).where(eq3(ratings.organizer, address.toLowerCase()));
    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },
  async recordRating(data) {
    const existing = await db.select().from(ratings).where(eq3(ratings.txHash, data.txHash)).limit(1);
    if (existing.length > 0) return existing[0];
    const result = await db.insert(ratings).values({
      organizer: data.organizer.toLowerCase(),
      rater: data.rater.toLowerCase(),
      matchId: data.matchId,
      rating: data.rating,
      txHash: data.txHash
    }).returning();
    await db.update(organizers).set({
      totalRatings: sql3`${organizers.totalRatings} + 1`,
      ratingSum: sql3`${organizers.ratingSum} + ${data.rating}`,
      averageRating: sql3`ROUND((${organizers.ratingSum} + ${data.rating})::numeric / (${organizers.totalRatings} + 1), 2)`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(organizers.address, data.organizer.toLowerCase()));
    return result[0];
  },
  async getTopOrganizers(limit = 10) {
    const results = await db.select().from(organizers).orderBy(sql3`${organizers.averageRating} DESC NULLS LAST`).limit(limit);
    return results;
  }
};

// src/api/routes/organizers.ts
var addressSchema3 = z4.string().regex(/^0x[a-fA-F0-9]{40}$/);
async function organizerRoutes(app2) {
  app2.get("/organizers/top", async (request, reply) => {
    const query = request.query;
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 50) : 10;
    const result = await organizerService.getTopOrganizers(limit);
    return reply.send({ success: true, data: result });
  });
  app2.get("/organizers/:address", async (request, reply) => {
    const parseResult = addressSchema3.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const profile = await organizerService.getProfile(request.params.address);
    if (!profile) {
      return reply.status(404).send({
        success: false,
        error: { code: "ORGANIZER_NOT_FOUND", message: "Organizer not found" }
      });
    }
    return reply.send({ success: true, data: profile });
  });
  app2.get("/organizers/:address/matches", async (request, reply) => {
    const parseResult = addressSchema3.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const query = request.query;
    const result = await organizerService.getMatches(
      request.params.address,
      query.status ?? "all",
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20
    );
    return reply.send({ success: true, ...result });
  });
  app2.get("/organizers/:address/ratings", async (request, reply) => {
    const parseResult = addressSchema3.safeParse(request.params.address);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" }
      });
    }
    const query = request.query;
    const result = await organizerService.getRatings(
      request.params.address,
      query.page ? parseInt(query.page, 10) : 1,
      query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20
    );
    return reply.send({ success: true, ...result });
  });
}

// src/config/blockchain.ts
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
var publicClient = createPublicClient({
  chain: sepolia,
  transport: http(config.RPC_URL)
});

// src/api/routes/health.ts
import { sql as sql4 } from "drizzle-orm";
import { readFileSync } from "fs";
var pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf-8"));
var startTime = Date.now();
async function healthRoutes(app2) {
  app2.get("/health", async (_request, reply) => {
    return reply.send({
      status: "healthy",
      version: pkg.version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/health/detailed", async (_request, reply) => {
    let dbStatus = "unhealthy";
    let dbLatency = 0;
    try {
      const start2 = Date.now();
      await db.execute(sql4`SELECT 1`);
      dbLatency = Date.now() - start2;
      dbStatus = "healthy";
    } catch {
      dbStatus = "unhealthy";
    }
    let redisStatus = "unhealthy";
    let redisLatency = 0;
    try {
      const start2 = Date.now();
      await redis.ping();
      redisLatency = Date.now() - start2;
      redisStatus = "healthy";
    } catch {
      redisStatus = "unhealthy";
    }
    let blockchainStatus = "unhealthy";
    let blockchainLatency = 0;
    let lastBlock = 0;
    try {
      const start2 = Date.now();
      const blockNumber = await publicClient.getBlockNumber();
      blockchainLatency = Date.now() - start2;
      lastBlock = Number(blockNumber);
      blockchainStatus = "healthy";
    } catch {
      blockchainStatus = "unhealthy";
    }
    return reply.send({
      status: dbStatus === "healthy" && redisStatus === "healthy" ? "healthy" : "degraded",
      version: pkg.version,
      uptime: Math.floor((Date.now() - startTime) / 1e3),
      services: {
        database: { status: dbStatus, latency: dbLatency },
        redis: { status: redisStatus, latency: redisLatency },
        blockchain: { status: blockchainStatus, latency: blockchainLatency, lastBlock }
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
}

// src/api/websocket.ts
var clients = /* @__PURE__ */ new Set();
async function setupWebSocket(app2) {
  await app2.register(import("@fastify/websocket"));
  app2.get("/ws", { websocket: true }, (socket, _request) => {
    const client = {
      socket,
      subscriptions: /* @__PURE__ */ new Set()
    };
    clients.add(client);
    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "subscribe" && message.channel) {
          client.subscriptions.add(message.channel);
          socket.send(JSON.stringify({
            type: "subscribed",
            channel: message.channel
          }));
        }
        if (message.type === "unsubscribe" && message.channel) {
          client.subscriptions.delete(message.channel);
          socket.send(JSON.stringify({
            type: "unsubscribed",
            channel: message.channel
          }));
        }
        if (message.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        socket.send(JSON.stringify({
          type: "error",
          error: { code: "INVALID_MESSAGE", message: "Invalid JSON message" }
        }));
      }
    });
    socket.on("close", () => {
      clients.delete(client);
    });
  });
  redisSub.subscribe("dgamebet:events", (err) => {
    if (err) console.error("Redis subscribe error:", err);
  });
  redisSub.on("message", (_channel, message) => {
    try {
      const event = JSON.parse(message);
      for (const client of clients) {
        if (client.subscriptions.has(event.channel) || client.subscriptions.has("matches")) {
          client.socket.send(JSON.stringify({
            ...event,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
      }
    } catch {
    }
  });
}

// src/blockchain/indexer.ts
import { parseAbiItem } from "viem";
import { eq as eq4 } from "drizzle-orm";
var MATCH_CREATED_EVENT = parseAbiItem(
  "event MatchCreated(uint256 indexed matchId, address indexed matchContract, address indexed organizer, string teamA, string teamB, uint256 matchStartTime, uint256 betAmount)"
);
var BET_PLACED_EVENT = parseAbiItem(
  "event BetPlaced(address indexed bettor, uint8 team, uint256 amount)"
);
var RESULT_SET_EVENT = parseAbiItem(
  "event ResultSet(uint8 result)"
);
var PRIZE_CLAIMED_EVENT = parseAbiItem(
  "event PrizeClaimed(address indexed winner, uint256 amount)"
);
var REFUND_CLAIMED_EVENT = parseAbiItem(
  "event RefundClaimed(address indexed bettor, uint256 amount)"
);
var ORGANIZER_RATED_EVENT = parseAbiItem(
  "event OrganizerRated(address indexed organizer, address indexed rater, uint256 indexed matchId, uint8 rating)"
);
var isRunning = false;
var watchedMatchAddresses = /* @__PURE__ */ new Set();
async function getLastSyncedBlock() {
  const result = await db.select().from(syncState).where(eq4(syncState.id, "indexer")).limit(1);
  return result[0]?.lastBlockNumber ?? 0;
}
async function updateLastSyncedBlock(blockNumber) {
  await db.insert(syncState).values({
    id: "indexer",
    lastBlockNumber: blockNumber,
    updatedAt: /* @__PURE__ */ new Date()
  }).onConflictDoUpdate({
    target: syncState.id,
    set: {
      lastBlockNumber: blockNumber,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function publishEvent(channel, type, data) {
  await redisPub.publish("dgamebet:events", JSON.stringify({ channel, type, data }));
}
async function processMatchCreated(log) {
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
      matchStartTime: new Date(Number(args.matchStartTime) * 1e3)
    });
    await publishEvent("matches", "match:created", {
      contractAddress: args.matchContract,
      organizer: args.organizer,
      teamA: args.teamA,
      teamB: args.teamB
    });
    watchMatchContract(args.matchContract);
    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error("Error processing MatchCreated:", err);
  }
}
async function processBetPlaced(log) {
  try {
    const args = log.args;
    if (!args) return;
    const matchAddress = log.address;
    const match = await matchService.getByAddress(matchAddress);
    if (!match) return;
    const team = Number(args.team) === 0 ? "teamA" : "teamB";
    await betService.recordBet({
      matchId: match.id,
      bettor: args.bettor,
      team,
      amount: args.amount.toString(),
      txHash: log.transactionHash,
      blockNumber: Number(log.blockNumber)
    });
    const newPoolA = team === "teamA" ? (BigInt(match.totalPoolA) + args.amount).toString() : match.totalPoolA;
    const newPoolB = team === "teamB" ? (BigInt(match.totalPoolB) + args.amount).toString() : match.totalPoolB;
    await matchService.updatePools(matchAddress, newPoolA, newPoolB);
    await publishEvent(`match:${matchAddress}`, "bet:placed", {
      bettor: args.bettor,
      team,
      amount: args.amount.toString(),
      newPoolTeamA: newPoolA,
      newPoolTeamB: newPoolB
    });
    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error("Error processing BetPlaced:", err);
  }
}
async function processResultSet(log) {
  try {
    const args = log.args;
    if (!args) return;
    const matchAddress = log.address;
    const resultMap = {
      1: "teamA",
      2: "teamB",
      3: "draw"
    };
    const result = resultMap[Number(args.result)] ?? "pending";
    await matchService.setResult(matchAddress, result);
    await publishEvent(`match:${matchAddress}`, "result:set", {
      result
    });
    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error("Error processing ResultSet:", err);
  }
}
async function processPrizeClaimed(log) {
  try {
    const args = log.args;
    if (!args) return;
    const matchAddress = log.address;
    await betService.markClaimed(matchAddress, args.winner);
    await publishEvent(`match:${matchAddress}`, "prize:claimed", {
      winner: args.winner,
      amount: args.amount.toString()
    });
    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error("Error processing PrizeClaimed:", err);
  }
}
async function processRefundClaimed(log) {
  try {
    const args = log.args;
    if (!args) return;
    const matchAddress = log.address;
    await betService.markClaimed(matchAddress, args.bettor);
    await publishEvent(`match:${matchAddress}`, "refund:claimed", {
      bettor: args.bettor,
      amount: args.amount.toString()
    });
    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error("Error processing RefundClaimed:", err);
  }
}
async function processOrganizerRated(log) {
  try {
    const args = log.args;
    if (!args) return;
    const factoryId = Number(args.matchId);
    const match = await matchService.getByFactoryId(factoryId);
    if (!match) {
      console.error("OrganizerRated: no match found for factoryId", factoryId);
      return;
    }
    await organizerService.recordRating({
      organizer: args.organizer,
      rater: args.rater,
      matchId: match.id,
      rating: Number(args.rating),
      txHash: log.transactionHash
    });
    await publishEvent("ratings", "organizer:rated", {
      organizer: args.organizer,
      rater: args.rater,
      matchId: factoryId,
      rating: Number(args.rating)
    });
    if (log.blockNumber) {
      await updateLastSyncedBlock(Number(log.blockNumber));
    }
  } catch (err) {
    console.error("Error processing OrganizerRated:", err);
  }
}
var LOG_BLOCK_CHUNK_SIZE = 10n;
async function getLogsInChunks(params) {
  const allLogs = [];
  let cursor = params.fromBlock;
  while (cursor <= params.toBlock) {
    const chunkEnd = cursor + LOG_BLOCK_CHUNK_SIZE - 1n > params.toBlock ? params.toBlock : cursor + LOG_BLOCK_CHUNK_SIZE - 1n;
    const logs = await publicClient.getLogs({
      address: params.address,
      event: params.event,
      fromBlock: cursor,
      toBlock: chunkEnd
    });
    allLogs.push(...logs);
    cursor = chunkEnd + 1n;
  }
  return allLogs;
}
async function indexHistoricalEvents(fromBlock, toBlock) {
  console.log(`Indexing historical events from block ${fromBlock} to ${toBlock} (chunk size: ${LOG_BLOCK_CHUNK_SIZE})`);
  const factoryAddr = config.FACTORY_ADDRESS;
  const matchCreatedLogs = await getLogsInChunks({
    address: factoryAddr,
    event: MATCH_CREATED_EVENT,
    fromBlock,
    toBlock
  });
  for (const log of matchCreatedLogs) {
    await processMatchCreated(log);
  }
  for (const addr of watchedMatchAddresses) {
    const hexAddr = addr;
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
    toBlock
  });
  for (const log of ratedLogs) await processOrganizerRated(log);
}
function watchMatchContract(matchAddress) {
  if (watchedMatchAddresses.has(matchAddress)) return;
  watchedMatchAddresses.add(matchAddress);
  const addr = matchAddress;
  publicClient.watchEvent({
    address: addr,
    event: BET_PLACED_EVENT,
    onLogs: (logs) => {
      for (const log of logs) processBetPlaced(log);
    }
  });
  publicClient.watchEvent({
    address: addr,
    event: RESULT_SET_EVENT,
    onLogs: (logs) => {
      for (const log of logs) processResultSet(log);
    }
  });
  publicClient.watchEvent({
    address: addr,
    event: PRIZE_CLAIMED_EVENT,
    onLogs: (logs) => {
      for (const log of logs) processPrizeClaimed(log);
    }
  });
  publicClient.watchEvent({
    address: addr,
    event: REFUND_CLAIMED_EVENT,
    onLogs: (logs) => {
      for (const log of logs) processRefundClaimed(log);
    }
  });
  console.log("Watching match contract:", matchAddress);
}
async function startIndexer() {
  if (isRunning) return;
  if (config.FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.log("No factory address configured, skipping indexer");
    return;
  }
  isRunning = true;
  console.log("Starting blockchain indexer...");
  const lastBlock = await getLastSyncedBlock();
  console.log("Last synced block:", lastBlock);
  try {
    const currentBlock = await publicClient.getBlockNumber();
    let deployBlock = 0;
    try {
      const result = await publicClient.readContract({
        address: config.FACTORY_ADDRESS,
        abi: [{ type: "function", name: "deployBlock", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" }],
        functionName: "deployBlock"
      });
      deployBlock = Number(result);
    } catch {
      console.warn("Could not read deployBlock from factory, starting from block 0");
    }
    const fromBlock = lastBlock > 0 ? lastBlock : deployBlock;
    if (fromBlock < Number(currentBlock)) {
      await indexHistoricalEvents(BigInt(fromBlock), currentBlock);
    }
    publicClient.watchEvent({
      address: config.FACTORY_ADDRESS,
      event: MATCH_CREATED_EVENT,
      onLogs: (logs) => {
        for (const log of logs) {
          processMatchCreated(log);
        }
      }
    });
    publicClient.watchEvent({
      address: config.FACTORY_ADDRESS,
      event: ORGANIZER_RATED_EVENT,
      onLogs: (logs) => {
        for (const log of logs) {
          processOrganizerRated(log);
        }
      }
    });
    console.log("Indexer watching for events on factory:", config.FACTORY_ADDRESS);
  } catch (err) {
    console.error("Indexer error:", err);
    isRunning = false;
  }
}

// src/index.ts
var app = Fastify({
  logger: {
    level: config.NODE_ENV === "development" ? "info" : "warn"
  }
});
async function start() {
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: config.NODE_ENV === "development" ? error.message : "Internal server error"
      }
    });
  });
  await setupWebSocket(app);
  await app.register(healthRoutes);
  await app.register(matchRoutes, { prefix: "/api/v1" });
  await app.register(userRoutes, { prefix: "/api/v1" });
  await app.register(organizerRoutes, { prefix: "/api/v1" });
  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    console.log(`Backend server running on port ${config.PORT}`);
    await startIndexer();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
async function shutdown() {
  console.log("Shutting down gracefully...");
  await app.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
start();
export {
  app
};
