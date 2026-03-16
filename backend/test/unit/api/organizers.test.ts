import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/services/organizer-service.js', () => ({
  organizerService: {
    getProfile: vi.fn().mockResolvedValue(null),
    getMatches: vi.fn().mockResolvedValue([]),
    getRatings: vi.fn().mockResolvedValue([]),
    getTopOrganizers: vi.fn().mockResolvedValue([]),
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

describe('organizerRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('../../../src/api/routes/organizers.js');
    expect(mod.organizerRoutes).toBeInstanceOf(Function);
  });

  it('should register route handlers on the app', async () => {
    const { organizerRoutes } = await import('../../../src/api/routes/organizers.js');
    const registeredRoutes: string[] = [];
    const mockApp = {
      get: vi.fn().mockImplementation((path: string) => {
        registeredRoutes.push(path);
      }),
    };
    await organizerRoutes(mockApp as any);
    expect(mockApp.get).toHaveBeenCalledTimes(4);
    expect(registeredRoutes).toContain('/organizers/top');
    expect(registeredRoutes).toContain('/organizers/:address');
    expect(registeredRoutes).toContain('/organizers/:address/matches');
    expect(registeredRoutes).toContain('/organizers/:address/ratings');
  });
});
