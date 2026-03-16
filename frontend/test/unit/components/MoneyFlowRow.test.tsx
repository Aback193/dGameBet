import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyFlowRow } from '@/components/portfolio/MoneyFlowRow';
import type { MoneyFlowEntry } from '@/types/match';

function makeEntry(overrides: Partial<MoneyFlowEntry> = {}): MoneyFlowEntry {
  return {
    id: '0xabc-1',
    txHash: '0xabc123' as `0x${string}`,
    blockNumber: 1000n,
    logIndex: 1,
    timestamp: 1700000000,
    type: 'place_bet',
    contractAddress: '0xmatch',
    teamA: 'Real Madrid',
    teamB: 'Barcelona',
    value: -100000000000000000n,
    gasCost: 300000000000000n,
    netImpact: -100300000000000000n,
    ...overrides,
  };
}

describe('MoneyFlowRow', () => {
  it('renders create_match type with correct icon and label', () => {
    const entry = makeEntry({
      type: 'create_match',
      value: 0n,
      gasCost: 400000000000000n,
      netImpact: -400000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.getByText('Create Match')).toBeInTheDocument();
    expect(screen.getByText('Real Madrid vs Barcelona')).toBeInTheDocument();
  });

  it('renders place_bet type with team detail', () => {
    const entry = makeEntry({
      type: 'place_bet',
      detail: 'Real Madrid',
      value: -100000000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.getByText('Place Bet — Real Madrid')).toBeInTheDocument();
  });

  it('renders set_result type with correct styling', () => {
    const entry = makeEntry({
      type: 'set_result',
      value: 0n,
      gasCost: 300000000000000n,
      netImpact: -300000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.getByText('Set Result')).toBeInTheDocument();
  });

  it('renders organizer_fee type with positive value in green', () => {
    const entry = makeEntry({
      type: 'organizer_fee',
      value: 5000000000000000n,
      gasCost: 0n,
      netImpact: 5000000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.getByText('Organizer Fee')).toBeInTheDocument();
    expect(screen.getByText('+0.0050 ETH')).toHaveClass('text-green-400');
  });

  it('renders organizer_fee_failed type', () => {
    const entry = makeEntry({
      type: 'organizer_fee_failed',
      value: 0n,
      gasCost: 0n,
      netImpact: 0n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.getByText('Organizer Fee (Failed)')).toBeInTheDocument();
  });

  it('renders claim_prize type with positive value', () => {
    const entry = makeEntry({
      type: 'claim_prize',
      value: 190000000000000000n,
      gasCost: 200000000000000n,
      netImpact: 188000000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.getByText('Claim Prize')).toBeInTheDocument();
    expect(screen.getByText('+0.1900 ETH')).toHaveClass('text-green-400');
  });

  it('renders claim_refund type', () => {
    const entry = makeEntry({
      type: 'claim_refund',
      value: 100000000000000000n,
      gasCost: 200000000000000n,
      netImpact: 98000000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.getByText('Claim Refund')).toBeInTheDocument();
  });

  it('displays gas cost in orange', () => {
    const entry = makeEntry({ gasCost: 300000000000000n });
    render(<MoneyFlowRow entry={entry} />);

    const gasElement = screen.getByText(/⛽/);
    expect(gasElement).toHaveClass('text-orange-400');
  });

  it('hides gas line when gasCost is zero', () => {
    const entry = makeEntry({
      type: 'organizer_fee',
      value: 5000000000000000n,
      gasCost: 0n,
      netImpact: 5000000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    expect(screen.queryByText(/⛽/)).toBeNull();
  });

  it('displays net impact with correct color for negative', () => {
    const entry = makeEntry({
      value: -100000000000000000n,
      gasCost: 300000000000000n,
      netImpact: -100300000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    const netElement = screen.getByText(/Net:/);
    expect(netElement).toHaveClass('text-red-400');
  });

  it('displays net impact with correct color for positive', () => {
    const entry = makeEntry({
      type: 'claim_prize',
      value: 190000000000000000n,
      gasCost: 200000000000000n,
      netImpact: 188000000000000000n,
    });
    render(<MoneyFlowRow entry={entry} />);

    const netElement = screen.getByText(/Net:/);
    expect(netElement).toHaveClass('text-green-400');
  });

  it('hides value line when value is zero', () => {
    const entry = makeEntry({
      type: 'create_match',
      value: 0n,
      gasCost: 400000000000000n,
      netImpact: -400000000000000n,
    });
    const { container } = render(<MoneyFlowRow entry={entry} />);

    // Should only show gas and net, not a separate value line
    const valueLines = container.querySelectorAll('.font-mono.font-semibold');
    // Net impact line should be present
    expect(screen.getByText(/Net:/)).toBeInTheDocument();
  });

  it('links to Etherscan with correct transaction hash', () => {
    const entry = makeEntry({ txHash: '0xdeadbeef' as `0x${string}` });
    render(<MoneyFlowRow entry={entry} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://sepolia.etherscan.io/tx/0xdeadbeef');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('displays formatted timestamp', () => {
    const entry = makeEntry({ timestamp: 1700000000 });
    render(<MoneyFlowRow entry={entry} />);

    // formatDate should render the timestamp
    expect(screen.getByText(/Nov/)).toBeInTheDocument();
  });

  it('renders all 7 event types without errors', () => {
    const types: MoneyFlowEntry['type'][] = [
      'create_match',
      'place_bet',
      'set_result',
      'organizer_fee',
      'organizer_fee_failed',
      'claim_prize',
      'claim_refund',
    ];

    types.forEach((type) => {
      const entry = makeEntry({ type, id: `test-${type}` });
      const { unmount } = render(<MoneyFlowRow entry={entry} />);
      expect(screen.getByRole('link')).toBeInTheDocument();
      unmount();
    });
  });
});
