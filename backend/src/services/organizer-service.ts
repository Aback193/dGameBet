import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { organizers, ratings, matches } from '../db/schema.js';

export const organizerService = {
  async getProfile(address: string) {
    const result = await db
      .select()
      .from(organizers)
      .where(eq(organizers.address, address.toLowerCase()))
      .limit(1);

    if (result.length === 0) return null;

    const org = result[0];
    const activeMatches = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .where(sql`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = true`);

    const completedMatches = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .where(sql`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = false`);

    return {
      address: org.address,
      totalMatches: org.totalMatches,
      activeMatches: Number(activeMatches[0]?.count ?? 0),
      completedMatches: Number(completedMatches[0]?.count ?? 0),
      totalVolume: org.totalVolume,
      totalEarnings: org.totalEarnings,
      rating: {
        average: org.averageRating ? parseFloat(org.averageRating) : 0,
        count: org.totalRatings,
      },
      createdAt: org.createdAt,
    };
  },

  async getMatches(address: string, status = 'all', page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    let condition = sql`${matches.organizer} = ${address.toLowerCase()}`;
    if (status === 'active') {
      condition = sql`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = true`;
    } else if (status === 'completed') {
      condition = sql`${matches.organizer} = ${address.toLowerCase()} AND ${matches.isActive} = false`;
    }

    const results = await db
      .select()
      .from(matches)
      .where(condition)
      .orderBy(desc(matches.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .where(condition);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getRatings(address: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(ratings)
      .where(eq(ratings.organizer, address.toLowerCase()))
      .orderBy(desc(ratings.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ratings)
      .where(eq(ratings.organizer, address.toLowerCase()));

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async recordRating(data: {
    organizer: string;
    rater: string;
    matchId: string;
    rating: number;
    txHash: string;
  }) {
    const existing = await db.select().from(ratings).where(eq(ratings.txHash, data.txHash)).limit(1);
    if (existing.length > 0) return existing[0];

    const result = await db.insert(ratings).values({
      organizer: data.organizer.toLowerCase(),
      rater: data.rater.toLowerCase(),
      matchId: data.matchId,
      rating: data.rating,
      txHash: data.txHash,
    }).returning();

    await db.update(organizers)
      .set({
        totalRatings: sql`${organizers.totalRatings} + 1`,
        ratingSum: sql`${organizers.ratingSum} + ${data.rating}`,
        averageRating: sql`ROUND((${organizers.ratingSum} + ${data.rating})::numeric / (${organizers.totalRatings} + 1), 2)`,
        updatedAt: new Date(),
      })
      .where(eq(organizers.address, data.organizer.toLowerCase()));

    return result[0];
  },

  async getTopOrganizers(limit = 10) {
    const results = await db
      .select()
      .from(organizers)
      .orderBy(sql`${organizers.averageRating} DESC NULLS LAST`)
      .limit(limit);

    return results;
  },
};
