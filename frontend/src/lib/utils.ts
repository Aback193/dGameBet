import { formatEther, parseEther } from 'viem';
import { type BetOutcome } from '@/types/match';

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(weiValue: bigint | string): string {
  const value = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
  return `${parseFloat(formatEther(value)).toFixed(4)} ETH`;
}

export function formatDate(timestamp: number | Date | string): string {
  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getResultLabel(result: number | string): string {
  const resultMap: Record<string | number, string> = {
    0: 'Pending',
    1: 'Team A Wins',
    2: 'Team B Wins',
    3: 'Draw',
    pending: 'Pending',
    teamA: 'Team A Wins',
    teamB: 'Team B Wins',
    draw: 'Draw',
  };
  return resultMap[result] ?? 'Unknown';
}

export function getResultColor(result: number | string): string {
  const colorMap: Record<string | number, string> = {
    0: 'text-yellow-500',
    1: 'text-green-500',
    2: 'text-blue-500',
    3: 'text-gray-500',
    pending: 'text-yellow-500',
    teamA: 'text-green-500',
    teamB: 'text-blue-500',
    draw: 'text-gray-500',
  };
  return colorMap[result] ?? 'text-gray-400';
}

export function getOutcomeLabel(outcome: BetOutcome): string {
  const labels: Record<BetOutcome, string> = {
    won: 'Won',
    lost: 'Lost',
    draw: 'Draw',
    pending: 'Pending',
  };
  return labels[outcome];
}

export function getOutcomeBadgeVariant(outcome: BetOutcome): 'success' | 'danger' | 'default' | 'warning' {
  const variants: Record<BetOutcome, 'success' | 'danger' | 'default' | 'warning'> = {
    won: 'success',
    lost: 'danger',
    draw: 'default',
    pending: 'warning',
  };
  return variants[outcome];
}

export function formatPnL(weiValue: bigint): string {
  const ethStr = parseFloat(formatEther(weiValue)).toFixed(4);
  const prefix = weiValue > 0n ? '+' : '';
  return `${prefix}${ethStr} ETH`;
}

export function formatGas(weiValue: bigint): string {
  const ethValue = parseFloat(formatEther(weiValue));
  if (ethValue < 0.0001) {
    // Convert from ETH to Gwei: 1 ETH = 1e9 Gwei
    // weiValue is in wei, 1 Gwei = 1e9 wei
    const gwei = Number(weiValue) / 1e9;
    return `${gwei.toFixed(2)} Gwei`;
  }
  return `${ethValue.toFixed(4)} ETH`;
}

export { formatEther, parseEther };
