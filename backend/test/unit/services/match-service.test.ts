import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChainMock(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'offset', 'innerJoin', 'insert', 'values', 'returning', 'onConflictDoUpdate', 'update', 'set'];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve(resolveValue);
  return chain;
}

vi.mock('../../../src/config/database.js', () => ({
  db: createChainMock([]),
}));

vi.mock('../../../src/config/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(0),
  },
  redisSub: { subscribe: vi.fn(), on: vi.fn() },
  redisPub: { publish: vi.fn() },
}));

vi.mock('../../../src/config/index.js', () => ({
  config: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    RPC_URL: 'https://test.rpc',
    FACTORY_ADDRESS: '0x0000000000000000000000000000000000000000',
    PORT: 3001,
    NODE_ENV: 'test',
  },
}));

describe('matchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('../../../src/services/match-service.js');
    expect(mod.matchService).toBeDefined();
    expect(mod.matchService.getAll).toBeInstanceOf(Function);
    expect(mod.matchService.getByAddress).toBeInstanceOf(Function);
    expect(mod.matchService.getMatchBets).toBeInstanceOf(Function);
    expect(mod.matchService.getMatchStats).toBeInstanceOf(Function);
    expect(mod.matchService.upsertMatch).toBeInstanceOf(Function);
    expect(mod.matchService.updatePools).toBeInstanceOf(Function);
    expect(mod.matchService.setResult).toBeInstanceOf(Function);
  });

  it('getAll should accept filter parameters', async () => {
    const { matchService } = await import('../../../src/services/match-service.js');
    const result = await matchService.getAll({ status: 'all', page: 1, limit: 20 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
  });

  it('getAll with active filter should work', async () => {
    const { matchService } = await import('../../../src/services/match-service.js');
    const result = await matchService.getAll({ status: 'active' });
    expect(result).toBeDefined();
    expect(result.pagination.page).toBe(1);
  });

  it('getAll with completed filter should work', async () => {
    const { matchService } = await import('../../../src/services/match-service.js');
    const result = await matchService.getAll({ status: 'completed' });
    expect(result).toBeDefined();
  });

  it('getByAddress should return null for non-existent match', async () => {
    const { matchService } = await import('../../../src/services/match-service.js');
    const result = await matchService.getByAddress('0x1234567890abcdef1234567890abcdef12345678');
    expect(result).toBeNull();
  });

  it('getMatchBets should return null when match not found', async () => {
    const { matchService } = await import('../../../src/services/match-service.js');
    const result = await matchService.getMatchBets('0x0000000000000000000000000000000000000000');
    expect(result).toBeNull();
  });

  it('getMatchStats should return null when match not found', async () => {
    const { matchService } = await import('../../../src/services/match-service.js');
    const result = await matchService.getMatchStats('0x0000000000000000000000000000000000000000');
    expect(result).toBeNull();
  });
});
