import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/blockchain.js', () => ({
  publicClient: {
    watchEvent: vi.fn(),
  },
}));

vi.mock('../../src/config/redis.js', () => ({
  redis: { ping: vi.fn().mockResolvedValue('PONG') },
  redisSub: { subscribe: vi.fn(), on: vi.fn() },
  redisPub: { publish: vi.fn().mockResolvedValue(1) },
}));

vi.mock('../../src/config/database.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../src/config/index.js', () => ({
  config: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    RPC_URL: 'https://test.rpc',
    FACTORY_ADDRESS: '0x0000000000000000000000000000000000000000',
    PORT: 3001,
    NODE_ENV: 'test',
  },
}));

vi.mock('../../src/services/match-service.js', () => ({
  matchService: {
    upsertMatch: vi.fn().mockResolvedValue({ id: 'test-uuid' }),
    getByAddress: vi.fn().mockResolvedValue(null),
    updatePools: vi.fn().mockResolvedValue(undefined),
    setResult: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/services/bet-service.js', () => ({
  betService: {
    recordBet: vi.fn().mockResolvedValue({ id: 'test-uuid' }),
  },
}));

vi.mock('../../src/services/organizer-service.js', () => ({
  organizerService: {
    recordRating: vi.fn().mockResolvedValue({ id: 'test-uuid' }),
  },
}));

describe('Blockchain Indexer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export startIndexer function', async () => {
    const mod = await import('../../src/blockchain/indexer.js');
    expect(mod.startIndexer).toBeInstanceOf(Function);
  });

  it('should skip when no factory address configured', async () => {
    const { startIndexer } = await import('../../src/blockchain/indexer.js');
    await startIndexer();
    const { publicClient } = await import('../../src/config/blockchain.js');
    expect(publicClient.watchEvent).not.toHaveBeenCalled();
  });
});
