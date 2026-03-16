import { describe, it, expect } from 'vitest';
import { FACTORY_ADDRESS, BET_FACTORY_ABI, BET_MATCH_ABI } from '@/lib/contracts';

describe('Contract Configuration', () => {
  it('FACTORY_ADDRESS should be a string (hex when configured)', () => {
    expect(typeof FACTORY_ADDRESS).toBe('string');
    if (FACTORY_ADDRESS.length > 0) {
      expect(FACTORY_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('BET_FACTORY_ABI should contain createMatch', () => {
    const createMatch = BET_FACTORY_ABI.find(
      (item) => 'name' in item && item.name === 'createMatch'
    );
    expect(createMatch).toBeDefined();
    expect(createMatch).toHaveProperty('type', 'function');
  });

  it('BET_FACTORY_ABI should contain getActiveMatches', () => {
    const fn = BET_FACTORY_ABI.find(
      (item) => 'name' in item && item.name === 'getActiveMatches'
    );
    expect(fn).toBeDefined();
  });

  it('BET_FACTORY_ABI should contain getMatchCount', () => {
    const fn = BET_FACTORY_ABI.find(
      (item) => 'name' in item && item.name === 'getMatchCount'
    );
    expect(fn).toBeDefined();
  });

  it('BET_FACTORY_ABI should contain MatchCreated event', () => {
    const event = BET_FACTORY_ABI.find(
      (item) => 'name' in item && item.name === 'MatchCreated' && item.type === 'event'
    );
    expect(event).toBeDefined();
  });

  it('BET_FACTORY_ABI should contain deployBlock', () => {
    const fn = BET_FACTORY_ABI.find(
      (item) => 'name' in item && item.name === 'deployBlock'
    );
    expect(fn).toBeDefined();
    expect(fn).toHaveProperty('stateMutability', 'view');
  });

  it('BET_MATCH_ABI should contain placeBet', () => {
    const fn = BET_MATCH_ABI.find(
      (item) => 'name' in item && item.name === 'placeBet'
    );
    expect(fn).toBeDefined();
    expect(fn).toHaveProperty('stateMutability', 'payable');
  });

  it('BET_MATCH_ABI should contain getMatchInfo', () => {
    const fn = BET_MATCH_ABI.find(
      (item) => 'name' in item && item.name === 'getMatchInfo'
    );
    expect(fn).toBeDefined();
  });

  it('BET_MATCH_ABI should contain claimPrize and claimRefund', () => {
    const claimPrize = BET_MATCH_ABI.find(
      (item) => 'name' in item && item.name === 'claimPrize'
    );
    const claimRefund = BET_MATCH_ABI.find(
      (item) => 'name' in item && item.name === 'claimRefund'
    );
    expect(claimPrize).toBeDefined();
    expect(claimRefund).toBeDefined();
  });
});
