import { describe, it, expect } from 'vitest';
import { formatPnL, formatGas } from '@/lib/utils';

describe('formatPnL', () => {
  it('formats positive bigint with + prefix', () => {
    const result = formatPnL(50000000000000000n); // 0.05 ETH
    expect(result).toBe('+0.0500 ETH');
  });

  it('formats negative bigint without + prefix', () => {
    const result = formatPnL(-30000000000000000n); // -0.03 ETH
    expect(result).toBe('-0.0300 ETH');
  });

  it('formats zero bigint without prefix', () => {
    const result = formatPnL(0n);
    expect(result).toBe('0.0000 ETH');
  });

  it('formats large positive value', () => {
    const result = formatPnL(1000000000000000000n); // 1 ETH
    expect(result).toBe('+1.0000 ETH');
  });

  it('formats large negative value', () => {
    const result = formatPnL(-2500000000000000000n); // -2.5 ETH
    expect(result).toBe('-2.5000 ETH');
  });

  it('formats small fractional value', () => {
    const result = formatPnL(1000000000000000n); // 0.001 ETH
    expect(result).toBe('+0.0010 ETH');
  });
});

describe('formatGas', () => {
  it('formats very small gas values in Gwei', () => {
    const result = formatGas(50000000000n); // 50 Gwei
    expect(result).toBe('50.00 Gwei');
  });

  it('formats tiny gas values in Gwei', () => {
    const result = formatGas(1000000000n); // 1 Gwei
    expect(result).toBe('1.00 Gwei');
  });

  it('formats gas values at threshold in ETH', () => {
    const result = formatGas(100000000000000n); // 0.0001 ETH
    expect(result).toBe('0.0001 ETH');
  });

  it('formats larger gas values in ETH', () => {
    const result = formatGas(300000000000000n); // 0.0003 ETH
    expect(result).toBe('0.0003 ETH');
  });

  it('formats zero gas', () => {
    const result = formatGas(0n);
    expect(result).toBe('0.00 Gwei');
  });

  it('formats large gas values in ETH', () => {
    const result = formatGas(1000000000000000n); // 0.001 ETH
    expect(result).toBe('0.0010 ETH');
  });
});
