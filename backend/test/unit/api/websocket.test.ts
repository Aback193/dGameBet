import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config/redis.js', () => ({
  redis: { ping: vi.fn().mockResolvedValue('PONG') },
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

describe('websocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('setupWebSocket should be importable', async () => {
    const mod = await import('../../../src/api/websocket.js');
    expect(mod.setupWebSocket).toBeInstanceOf(Function);
  });

  it('module should not export broadcastEvent (removed dead code)', async () => {
    const mod = await import('../../../src/api/websocket.js');
    expect(mod.broadcastEvent).toBeUndefined();
  });
});
