import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { bets, matches } from '../db/schema.js';

export const betService = {
  async getUserBets(userAddress: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const results = await db
      .select({
        bet: bets,
        match: matches,
      })
      .from(bets)
      .innerJoin(matches, eq(bets.matchId, matches.id))
      .where(eq(bets.bettor, userAddress.toLowerCase()))
      .orderBy(desc(bets.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bets)
      .where(eq(bets.bettor, userAddress.toLowerCase()));

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: results.map(r => ({
        ...r.bet,
        match: {
          contractAddress: r.match.contractAddress,
          teamA: r.match.teamA,
          teamB: r.match.teamB,
          matchStartTime: r.match.matchStartTime,
          result: r.match.result,
        },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getUnclaimedPrizes(userAddress: string) {
    const results = await db
      .select({
        bet: bets,
        match: matches,
      })
      .from(bets)
      .innerJoin(matches, eq(bets.matchId, matches.id))
      .where(
        and(
          eq(bets.bettor, userAddress.toLowerCase()),
          eq(bets.claimed, false),
          eq(matches.isActive, false),
        )
      );

    return results
      .filter(r => {
        if (r.match.result === 'draw') return true;
        if (r.match.result === 'teamA' && r.bet.team === 'teamA') return true;
        if (r.match.result === 'teamB' && r.bet.team === 'teamB') return true;
        return false;
      })
      .map(r => ({
        matchAddress: r.match.contractAddress,
        teamA: r.match.teamA,
        teamB: r.match.teamB,
        result: r.match.result,
        userBet: r.bet.amount,
        userTeam: r.bet.team,
      }));
  },

  async recordBet(data: {
    matchId: string;
    bettor: string;
    team: string;
    amount: string;
    txHash: string;
    blockNumber: number;
  }) {
    const existing = await db.select().from(bets).where(eq(bets.txHash, data.txHash)).limit(1);
    if (existing.length > 0) return existing[0];

    const result = await db.insert(bets).values({
      matchId: data.matchId,
      bettor: data.bettor.toLowerCase(),
      team: data.team,
      amount: data.amount,
      txHash: data.txHash,
      blockNumber: data.blockNumber,
    }).returning();

    return result[0];
  },

  async markClaimed(matchAddress: string, bettor: string) {
    const matchResult = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.contractAddress, matchAddress.toLowerCase()))
      .limit(1);
    if (!matchResult[0]) return;

    await db.update(bets)
      .set({ claimed: true })
      .where(
        and(
          eq(bets.matchId, matchResult[0].id),
          eq(bets.bettor, bettor.toLowerCase()),
        )
      );
  },
};
