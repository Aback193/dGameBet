import { describe, it, expect } from 'vitest';

describe('Config', () => {
  it('should have default values', async () => {
    const { config } = await import('../../src/config/index.js');
    expect(config.PORT).toBe(3001);
    expect(typeof config.NODE_ENV).toBe('string');
    expect(['development', 'test', 'production']).toContain(config.NODE_ENV);
  });
});
