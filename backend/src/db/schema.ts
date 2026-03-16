import { pgTable, text, uuid, timestamp, boolean, integer, numeric } from 'drizzle-orm/pg-core';

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractAddress: text('contract_address').unique().notNull(),
  factoryId: integer('factory_id').notNull(),
  organizer: text('organizer').notNull(),
  teamA: text('team_a').notNull(),
  teamB: text('team_b').notNull(),
  betAmount: numeric('bet_amount', { precision: 78, scale: 0 }).notNull(),
  matchStartTime: timestamp('match_start_time').notNull(),
  result: text('result').default('pending').notNull(),
  totalPoolA: numeric('total_pool_a', { precision: 78, scale: 0 }).default('0').notNull(),
  totalPoolB: numeric('total_pool_b', { precision: 78, scale: 0 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bets = pgTable('bets', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').references(() => matches.id).notNull(),
  bettor: text('bettor').notNull(),
  team: text('team').notNull(),
  amount: numeric('amount', { precision: 78, scale: 0 }).notNull(),
  txHash: text('tx_hash').unique().notNull(),
  blockNumber: integer('block_number').notNull(),
  claimed: boolean('claimed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizers = pgTable('organizers', {
  address: text('address').primaryKey(),
  totalMatches: integer('total_matches').default(0).notNull(),
  totalRatings: integer('total_ratings').default(0).notNull(),
  ratingSum: integer('rating_sum').default(0).notNull(),
  averageRating: numeric('average_rating', { precision: 3, scale: 2 }),
  totalVolume: numeric('total_volume', { precision: 78, scale: 0 }).default('0').notNull(),
  totalEarnings: numeric('total_earnings', { precision: 78, scale: 0 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ratings = pgTable('ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizer: text('organizer').references(() => organizers.address).notNull(),
  rater: text('rater').notNull(),
  matchId: uuid('match_id').references(() => matches.id).notNull(),
  rating: integer('rating').notNull(),
  txHash: text('tx_hash').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const syncState = pgTable('sync_state', {
  id: text('id').primaryKey().default('indexer'),
  lastBlockNumber: integer('last_block_number').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
