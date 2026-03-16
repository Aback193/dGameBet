import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/services/bet-service.js', () => ({
  betService: {
    getUserBets: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getUnclaimedPrizes: vi.fn().mockResolvedValue([]),
  },
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

describe('userRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('../../../src/api/routes/users.js');
    expect(mod.userRoutes).toBeInstanceOf(Function);
  });

  it('should register route handlers on the app', async () => {
    const { userRoutes } = await import('../../../src/api/routes/users.js');
    const registeredRoutes: string[] = [];
    const mockApp = {
      get: vi.fn().mockImplementation((path: string) => {
        registeredRoutes.push(path);
      }),
    };
    await userRoutes(mockApp as any);
    expect(mockApp.get).toHaveBeenCalledTimes(2);
    expect(registeredRoutes).toContain('/users/:address/bets');
    expect(registeredRoutes).toContain('/users/:address/unclaimed');
  });
});
