import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BetHistoryList } from '@/components/portfolio/BetHistoryList';
import type { PortfolioEntry, MoneyFlowEntry, MoneyFlowSummary } from '@/types/match';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

function makeEntry(overrides: Partial<PortfolioEntry> = {}): PortfolioEntry {
  return {
    contractAddress: '0xabc',
    teamA: 'Barcelona',
    teamB: 'Real Madrid',
    matchStartTime: 1700000000,
    wagered: 100000000000000000n,
    returned: 190000000000000000n,
    unclaimed: 0n,
    netPnL: 90000000000000000n,
    outcome: 'won',
    hasClaimed: true,
    organizerFeeOffset: 0n,
    gasCost: 0n,
    ...overrides,
  };
}

function makeMoneyFlowEntry(overrides: Partial<MoneyFlowEntry> = {}): MoneyFlowEntry {
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

describe('BetHistoryList', () => {
  it('renders empty state when no entries and no timeline', () => {
    render(<BetHistoryList entries={[]} timeline={[]} />);
    expect(screen.getByText('No activity yet.')).toBeDefined();
  });

  it('renders loading skeleton when isLoading is true and no data', () => {
    render(<BetHistoryList entries={[]} timeline={[]} isLoading={true} />);
    expect(screen.queryByText('No activity yet.')).toBeNull();
    expect(screen.getByText('Bet History')).toBeDefined();
  });

  it('renders loading skeleton when isLoading is true even with partial data', () => {
    render(<BetHistoryList entries={[makeEntry()]} timeline={[]} isLoading={true} />);
    expect(screen.queryByText('Barcelona vs Real Madrid')).toBeNull();
    expect(screen.getByText('Bet History')).toBeDefined();
  });

  it('renders bet history header', () => {
    render(<BetHistoryList entries={[makeEntry()]} />);
    expect(screen.getByText('Bet History')).toBeDefined();
  });

  it('shows summary as fallback when timeline is empty', () => {
    render(<BetHistoryList entries={[makeEntry()]} timeline={[]} />);
    expect(screen.getByText('Barcelona vs Real Madrid')).toBeDefined();
  });

  it('renders won entry with positive P&L in summary fallback', () => {
    render(
      <BetHistoryList
        entries={[
          makeEntry({
            outcome: 'won',
            netPnL: 90000000000000000n,
          }),
        ]}
        timeline={[]}
      />
    );
    expect(screen.getByText('Won')).toBeDefined();
    expect(screen.getByText('+0.0900 ETH')).toBeDefined();
  });

  it('renders lost entry with negative P&L in summary fallback', () => {
    render(
      <BetHistoryList
        entries={[
          makeEntry({
            outcome: 'lost',
            returned: 0n,
            netPnL: -100000000000000000n,
          }),
        ]}
        timeline={[]}
      />
    );
    expect(screen.getByText('Lost')).toBeDefined();
    expect(screen.getByText('-0.1000 ETH')).toBeDefined();
  });

  it('renders draw entry with zero P&L in summary fallback', () => {
    render(
      <BetHistoryList
        entries={[
          makeEntry({
            outcome: 'draw',
            returned: 100000000000000000n,
            netPnL: 0n,
          }),
        ]}
        timeline={[]}
      />
    );
    expect(screen.getByText('Draw')).toBeDefined();
    expect(screen.getByText('0.0000 ETH')).toBeDefined();
  });

  it('shows entries in reverse chronological order (newest first) in summary fallback', () => {
    const entries = [
      makeEntry({ contractAddress: '0xa', matchStartTime: 1700000000, teamA: 'Older' }),
      makeEntry({ contractAddress: '0xb', matchStartTime: 1700100000, teamA: 'Newer' }),
    ];
    render(<BetHistoryList entries={entries} timeline={[]} />);
    const matchNames = screen.getAllByText(/vs Real Madrid/);
    expect(matchNames[0].textContent).toContain('Newer');
    expect(matchNames[1].textContent).toContain('Older');
  });

  it('paginates at 20 entries and shows page controls in summary fallback', () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ contractAddress: `0x${i.toString(16).padStart(4, '0')}`, matchStartTime: 1700000000 + i })
    );
    render(<BetHistoryList entries={entries} timeline={[]} />);
    expect(screen.getByText(/Showing 1–20 of 25/)).toBeDefined();
    expect(screen.getByLabelText('Next page')).toBeDefined();
  });

  it('navigates to next page when next button is clicked in summary fallback', () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ contractAddress: `0x${i.toString(16).padStart(4, '0')}`, matchStartTime: 1700000000 + i })
    );
    render(<BetHistoryList entries={entries} timeline={[]} />);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText(/Showing 21–25 of 25/)).toBeDefined();
  });

  it('does not show pagination when entries <= 20 in summary fallback', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({ contractAddress: `0x${i.toString(16).padStart(4, '0')}`, matchStartTime: 1700000000 + i })
    );
    render(<BetHistoryList entries={entries} timeline={[]} />);
    expect(screen.queryByText(/Show all/)).toBeNull();
  });

  it('shows organizer fee annotation when organizerFeeOffset is non-zero in summary fallback', () => {
    render(
      <BetHistoryList
        entries={[
          makeEntry({
            netPnL: -5000000000000000n,
            organizerFeeOffset: 5000000000000000n,
          }),
        ]}
        timeline={[]}
      />
    );
    expect(screen.getByText(/org fee/)).toBeDefined();
    expect(screen.getByText('0.0000 ETH')).toBeDefined();
  });

  it('shows gas cost when gasCost is non-zero in summary fallback', () => {
    render(
      <BetHistoryList
        entries={[makeEntry({ gasCost: 300000000000000n })]}
        timeline={[]}
      />
    );
    expect(screen.getByText(/gas:/)).toBeDefined();
  });

  it('does not show gas cost when gasCost is zero in summary fallback', () => {
    render(
      <BetHistoryList
        entries={[makeEntry({ gasCost: 0n })]}
        timeline={[]}
      />
    );
    expect(screen.queryByText(/gas:/)).toBeNull();
  });

  it('does not show organizer fee annotation when organizerFeeOffset is zero in summary fallback', () => {
    render(
      <BetHistoryList
        entries={[makeEntry({ organizerFeeOffset: 0n })]}
        timeline={[]}
      />
    );
    expect(screen.queryByText(/org fee/)).toBeNull();
  });

  it('shows timeline as primary view when timeline data is provided', () => {
    const timeline = [makeMoneyFlowEntry({ type: 'place_bet', detail: 'Real Madrid' })];
    render(<BetHistoryList entries={[makeEntry()]} timeline={timeline} />);
    expect(screen.getByText('Place Bet — Real Madrid')).toBeDefined();
  });

  it('does not show summary entries when timeline has data', () => {
    const timeline = [makeMoneyFlowEntry({ type: 'place_bet', detail: 'Real Madrid' })];
    render(<BetHistoryList entries={[makeEntry()]} timeline={timeline} />);
    expect(screen.queryByText('Won')).toBeNull();
  });

  it('renders timeline entries in chronological order', () => {
    const timeline = [
      makeMoneyFlowEntry({ id: '0x1-1', type: 'create_match', timestamp: 1700000000 }),
      makeMoneyFlowEntry({ id: '0x2-1', type: 'place_bet', timestamp: 1700100000 }),
      makeMoneyFlowEntry({ id: '0x3-1', type: 'claim_prize', timestamp: 1700200000 }),
    ];
    render(<BetHistoryList entries={[]} timeline={timeline} />);

    expect(screen.getByText('Create Match')).toBeDefined();
    expect(screen.getByText(/Place Bet/)).toBeDefined();
    expect(screen.getByText('Claim Prize')).toBeDefined();
  });

  it('filters timeline by bets', () => {
    const timeline = [
      makeMoneyFlowEntry({ id: '0x1-1', type: 'place_bet' }),
      makeMoneyFlowEntry({ id: '0x2-1', type: 'claim_prize' }),
      makeMoneyFlowEntry({ id: '0x3-1', type: 'create_match' }),
    ];
    render(<BetHistoryList entries={[]} timeline={timeline} />);

    fireEvent.click(screen.getByText(/Bets \(1\)/));
    expect(screen.getByText(/Place Bet/)).toBeDefined();
    expect(screen.queryByText('Claim Prize')).toBeNull();
    expect(screen.queryByText('Create Match')).toBeNull();
  });

  it('filters timeline by claims', () => {
    const timeline = [
      makeMoneyFlowEntry({ id: '0x1-1', type: 'place_bet' }),
      makeMoneyFlowEntry({ id: '0x2-1', type: 'claim_prize' }),
      makeMoneyFlowEntry({ id: '0x3-1', type: 'claim_refund' }),
    ];
    render(<BetHistoryList entries={[]} timeline={timeline} />);

    fireEvent.click(screen.getByText(/Claims \(2\)/));
    expect(screen.queryByText(/Place Bet/)).toBeNull();
    expect(screen.getByText('Claim Prize')).toBeDefined();
    expect(screen.getByText('Claim Refund')).toBeDefined();
  });

  it('filters timeline by organizer actions', () => {
    const timeline = [
      makeMoneyFlowEntry({ id: '0x1-1', type: 'create_match' }),
      makeMoneyFlowEntry({ id: '0x2-1', type: 'set_result' }),
      makeMoneyFlowEntry({ id: '0x3-1', type: 'organizer_fee' }),
      makeMoneyFlowEntry({ id: '0x4-1', type: 'place_bet' }),
    ];
    render(<BetHistoryList entries={[]} timeline={timeline} />);

    fireEvent.click(screen.getByText(/Organizer \(3\)/));
    expect(screen.getByText('Create Match')).toBeDefined();
    expect(screen.getByText('Set Result')).toBeDefined();
    expect(screen.getByText('Organizer Fee')).toBeDefined();
    expect(screen.queryByText(/Place Bet/)).toBeNull();
  });

  it('toggles sort order between newest and oldest first', () => {
    const timeline = [
      makeMoneyFlowEntry({ id: '0x1-1', blockNumber: 1000n, timestamp: 1700000000 }),
      makeMoneyFlowEntry({ id: '0x2-1', blockNumber: 1001n, timestamp: 1700100000 }),
    ];
    render(<BetHistoryList entries={[]} timeline={timeline} />);

    fireEvent.click(screen.getByText('Newest First'));
    expect(screen.getByText('Oldest First')).toBeDefined();
  });

  it('displays timeline summary footer with all totals', () => {
    const timeline = [makeMoneyFlowEntry()];
    const summary: MoneyFlowSummary = {
      totalGasSpent: 600000000000000n,
      totalValueIn: 190000000000000000n,
      totalValueOut: 100000000000000000n,
      netPosition: 89400000000000000n,
      entryCount: 2,
    };
    render(<BetHistoryList entries={[]} timeline={timeline} timelineSummary={summary} />);

    expect(screen.getByText('Gas Spent')).toBeDefined();
    expect(screen.getByText('Value In')).toBeDefined();
    expect(screen.getByText('Value Out')).toBeDefined();
    expect(screen.getByText('Net Position')).toBeDefined();
  });

  it('paginates timeline at 20 entries with page controls', () => {
    const timeline = Array.from({ length: 25 }, (_, i) =>
      makeMoneyFlowEntry({ id: `0x${i}-1`, timestamp: 1700000000 + i })
    );
    render(<BetHistoryList entries={[]} timeline={timeline} />);

    expect(screen.getByText(/Showing 1–20 of 25/)).toBeDefined();
    expect(screen.getByLabelText('Next page')).toBeDefined();
    expect(screen.getByLabelText('Previous page')).toBeDefined();
  });

  it('shows timeline content when only timeline has data (pure organizer)', () => {
    const timeline = [
      makeMoneyFlowEntry({ id: '0x1-1', type: 'create_match' }),
      makeMoneyFlowEntry({ id: '0x2-1', type: 'set_result' }),
    ];
    render(<BetHistoryList entries={[]} timeline={timeline} />);

    expect(screen.getByText('Create Match')).toBeDefined();
    expect(screen.getByText('Set Result')).toBeDefined();
  });

  it('shows summary fallback when only summary has data', () => {
    render(<BetHistoryList entries={[makeEntry()]} timeline={[]} />);

    expect(screen.getByText('Barcelona vs Real Madrid')).toBeDefined();
  });

  it('shows skeleton instead of partial data when isLoading is true', () => {
    render(
      <BetHistoryList
        entries={[makeEntry()]}
        timeline={[]}
        isLoading={true}
      />
    );
    expect(screen.queryByText('Barcelona vs Real Madrid')).toBeNull();
    expect(screen.getByText('Bet History')).toBeDefined();
  });

  it('shows timeline error when timelineError is set and no timeline data', () => {
    render(
      <BetHistoryList
        entries={[makeEntry()]}
        timeline={[]}
        timelineError={new Error('RPC block range exceeded')}
      />
    );
    expect(screen.getByText(/Could not load transaction details/)).toBeDefined();
    expect(screen.getByText(/RPC block range exceeded/)).toBeDefined();
  });

  it('does not show error when timeline data loaded successfully', () => {
    const timeline = [makeMoneyFlowEntry()];
    render(
      <BetHistoryList
        entries={[makeEntry()]}
        timeline={timeline}
        timelineError={null}
      />
    );
    expect(screen.queryByText(/Could not load/)).toBeNull();
  });

  it('shows retry button on timeline error', () => {
    render(
      <BetHistoryList
        entries={[]}
        timeline={[]}
        timelineError={new Error('Network error')}
      />
    );
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('suppresses all data display while isLoading is true', () => {
    render(
      <BetHistoryList
        entries={[makeEntry()]}
        timeline={[makeMoneyFlowEntry()]}
        isLoading={true}
      />
    );
    expect(screen.queryByText('Barcelona vs Real Madrid')).toBeNull();
    expect(screen.queryByText(/Place Bet/)).toBeNull();
    expect(screen.getByText('Bet History')).toBeDefined();
  });

  it('shows unclaimed badge and amount when entry has unclaimed funds', () => {
    render(
      <BetHistoryList
        entries={[
          makeEntry({
            hasClaimed: false,
            returned: 0n,
            unclaimed: 190000000000000000n,
            netPnL: -100000000000000000n,
          }),
        ]}
        timeline={[]}
      />
    );
    expect(screen.getByText('Unclaimed')).toBeDefined();
    expect(screen.getByText(/unclaimed/i)).toBeDefined();
  });

  it('does not show unclaimed badge when entry has been claimed', () => {
    render(
      <BetHistoryList
        entries={[makeEntry({ hasClaimed: true, unclaimed: 0n })]}
        timeline={[]}
      />
    );
    expect(screen.queryByText('Unclaimed')).toBeNull();
  });
});
