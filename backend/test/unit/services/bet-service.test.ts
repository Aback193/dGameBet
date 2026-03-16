import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChainMock(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'offset', 'innerJoin', 'insert', 'values', 'returning'];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve(resolveValue);
  return chain;
}

vi.mock('../../../src/config/database.js', () => ({
  db: createChainMock([]),
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

describe('betService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('../../../src/services/bet-service.js');
    expect(mod.betService).toBeDefined();
    expect(mod.betService.getUserBets).toBeInstanceOf(Function);
    expect(mod.betService.getUnclaimedPrizes).toBeInstanceOf(Function);
    expect(mod.betService.recordBet).toBeInstanceOf(Function);
  });

  it('getUserBets should return paginated results', async () => {
    const { betService } = await import('../../../src/services/bet-service.js');
    const result = await betService.getUserBets('0x1234567890abcdef1234567890abcdef12345678');
    expect(result).toBeDefined();
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(result.pagination.page).toBe(1);
  });

  it('getUserBets should accept pagination params', async () => {
    const { betService } = await import('../../../src/services/bet-service.js');
    const result = await betService.getUserBets('0x1234567890abcdef1234567890abcdef12345678', 2, 10);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
  });

  it('getUnclaimedPrizes should return filtered results', async () => {
    const { betService } = await import('../../../src/services/bet-service.js');
    const result = await betService.getUnclaimedPrizes('0x1234567890abcdef1234567890abcdef12345678');
    expect(result).toBeInstanceOf(Array);
  });
});
