import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config/redis.js', () => ({
  redis: { ping: vi.fn().mockResolvedValue('PONG') },
  redisSub: { subscribe: vi.fn(), on: vi.fn() },
  redisPub: { publish: vi.fn() },
}));

vi.mock('../../../src/config/database.js', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([]),
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

describe('healthRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('../../../src/api/routes/health.js');
    expect(mod.healthRoutes).toBeInstanceOf(Function);
  });

  it('health route function should accept a fastify instance', async () => {
    const { healthRoutes } = await import('../../../src/api/routes/health.js');
    const mockApp = {
      get: vi.fn(),
    };
    await healthRoutes(mockApp as any);
    expect(mockApp.get).toHaveBeenCalledTimes(2);
    expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(mockApp.get).toHaveBeenCalledWith('/health/detailed', expect.any(Function));
  });
});
