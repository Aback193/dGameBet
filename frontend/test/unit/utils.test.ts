import { describe, it, expect } from 'vitest';
import { formatAddress, formatDate, getResultLabel, getResultColor } from '@/lib/utils';

describe('formatAddress', () => {
  it('should truncate address', () => {
    const address = '0x1234567890123456789012345678901234567890';
    expect(formatAddress(address)).toBe('0x1234...7890');
  });
});

describe('formatDate', () => {
  it('should format a timestamp', () => {
    const result = formatDate(1708790400);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format a Date object', () => {
    const result = formatDate(new Date('2026-02-25T15:00:00Z'));
    expect(typeof result).toBe('string');
  });
});

describe('getResultLabel', () => {
  it('should return Pending for 0', () => {
    expect(getResultLabel(0)).toBe('Pending');
  });

  it('should return Team A Wins for 1', () => {
    expect(getResultLabel(1)).toBe('Team A Wins');
  });

  it('should return Team B Wins for 2', () => {
    expect(getResultLabel(2)).toBe('Team B Wins');
  });

  it('should return Draw for 3', () => {
    expect(getResultLabel(3)).toBe('Draw');
  });

  it('should handle string values', () => {
    expect(getResultLabel('pending')).toBe('Pending');
    expect(getResultLabel('teamA')).toBe('Team A Wins');
    expect(getResultLabel('draw')).toBe('Draw');
  });
});

describe('getResultColor', () => {
  it('should return correct colors', () => {
    expect(getResultColor(0)).toBe('text-yellow-500');
    expect(getResultColor(1)).toBe('text-green-500');
    expect(getResultColor(2)).toBe('text-blue-500');
    expect(getResultColor(3)).toBe('text-gray-500');
  });
});
