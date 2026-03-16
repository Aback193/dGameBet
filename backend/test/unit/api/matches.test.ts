import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/services/match-service.js', () => ({
  matchService: {
    getAll: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getByAddress: vi.fn().mockResolvedValue(null),
    getMatchBets: vi.fn().mockResolvedValue(null),
    getMatchStats: vi.fn().mockResolvedValue(null),
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

describe('matchRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('../../../src/api/routes/matches.js');
    expect(mod.matchRoutes).toBeInstanceOf(Function);
  });

  it('should register route handlers on the app', async () => {
    const { matchRoutes } = await import('../../../src/api/routes/matches.js');
    const mockApp = {
      get: vi.fn(),
    };
    await matchRoutes(mockApp as any);
    expect(mockApp.get).toHaveBeenCalledTimes(6);
  });

  it('should register GET /matches endpoint', async () => {
    const { matchRoutes } = await import('../../../src/api/routes/matches.js');
    const registeredRoutes: string[] = [];
    const mockApp = {
      get: vi.fn().mockImplementation((path: string) => {
        registeredRoutes.push(path);
      }),
    };
    await matchRoutes(mockApp as any);
    expect(registeredRoutes).toContain('/matches');
    expect(registeredRoutes).toContain('/matches/active');
    expect(registeredRoutes).toContain('/matches/completed');
    expect(registeredRoutes).toContain('/matches/:address');
    expect(registeredRoutes).toContain('/matches/:address/bets');
    expect(registeredRoutes).toContain('/matches/:address/stats');
  });
});
