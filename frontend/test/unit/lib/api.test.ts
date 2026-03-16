import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: [] }),
    });
  });

  it('should export api object', async () => {
    const mod = await import('@/lib/api');
    expect(mod.api).toBeDefined();
    expect(mod.api.getMatches).toBeInstanceOf(Function);
    expect(mod.api.getActiveMatches).toBeInstanceOf(Function);
    expect(mod.api.getCompletedMatches).toBeInstanceOf(Function);
    expect(mod.api.getMatch).toBeInstanceOf(Function);
    expect(mod.api.getMatchBets).toBeInstanceOf(Function);
    expect(mod.api.getMatchStats).toBeInstanceOf(Function);
    expect(mod.api.getUserBets).toBeInstanceOf(Function);
    expect(mod.api.getUnclaimedPrizes).toBeInstanceOf(Function);
    expect(mod.api.getOrganizer).toBeInstanceOf(Function);
    expect(mod.api.getOrganizerMatches).toBeInstanceOf(Function);
    expect(mod.api.getTopOrganizers).toBeInstanceOf(Function);
  });

  it('getMatches should call fetch with correct URL', async () => {
    const { api } = await import('@/lib/api');
    await api.getMatches('active');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/matches?status=active'),
      expect.any(Object)
    );
  });

  it('getMatch should call fetch with address', async () => {
    const { api } = await import('@/lib/api');
    await api.getMatch('0x1234');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/matches/0x1234'),
      expect.any(Object)
    );
  });

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });
    const { api } = await import('@/lib/api');
    await expect(api.getMatch('0x0000')).rejects.toThrow('API error: 404');
  });
});
