import { describe, it, expect } from 'vitest';
import { MatchResult, Team } from '@/types/match';

describe('Match Types', () => {
  it('MatchResult enum has correct values', () => {
    expect(MatchResult.Pending).toBe(0);
    expect(MatchResult.TeamAWins).toBe(1);
    expect(MatchResult.TeamBWins).toBe(2);
    expect(MatchResult.Draw).toBe(3);
  });

  it('Team enum has correct values', () => {
    expect(Team.TeamA).toBe(0);
    expect(Team.TeamB).toBe(1);
  });

  it('MatchResult can be used as numeric index', () => {
    const results = [MatchResult.Pending, MatchResult.TeamAWins, MatchResult.TeamBWins, MatchResult.Draw];
    expect(results).toEqual([0, 1, 2, 3]);
  });
});
