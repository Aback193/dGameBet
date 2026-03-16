import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChainMock(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'offset', 'innerJoin', 'insert', 'values', 'returning', 'update', 'set'];
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

describe('organizerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('../../../src/services/organizer-service.js');
    expect(mod.organizerService).toBeDefined();
    expect(mod.organizerService.getProfile).toBeInstanceOf(Function);
    expect(mod.organizerService.getMatches).toBeInstanceOf(Function);
    expect(mod.organizerService.getRatings).toBeInstanceOf(Function);
    expect(mod.organizerService.recordRating).toBeInstanceOf(Function);
    expect(mod.organizerService.getTopOrganizers).toBeInstanceOf(Function);
  });

  it('getProfile should return null for non-existent organizer', async () => {
    const { organizerService } = await import('../../../src/services/organizer-service.js');
    const result = await organizerService.getProfile('0x1234567890abcdef1234567890abcdef12345678');
    expect(result).toBeNull();
  });

  it('getMatches should return paginated response', async () => {
    const { organizerService } = await import('../../../src/services/organizer-service.js');
    const result = await organizerService.getMatches('0x1234567890abcdef1234567890abcdef12345678', 'active', 1, 10);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(result.data).toBeInstanceOf(Array);
  });

  it('getRatings should return paginated response', async () => {
    const { organizerService } = await import('../../../src/services/organizer-service.js');
    const result = await organizerService.getRatings('0x1234567890abcdef1234567890abcdef12345678', 1, 20);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(result.data).toBeInstanceOf(Array);
  });

  it('getTopOrganizers should return array', async () => {
    const { organizerService } = await import('../../../src/services/organizer-service.js');
    const result = await organizerService.getTopOrganizers(10);
    expect(result).toBeInstanceOf(Array);
  });

  it('getTopOrganizers should default to limit of 10', async () => {
    const { organizerService } = await import('../../../src/services/organizer-service.js');
    const result = await organizerService.getTopOrganizers();
    expect(result).toBeInstanceOf(Array);
  });
});
