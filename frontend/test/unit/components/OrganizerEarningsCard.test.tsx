import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrganizerEarningsCard } from '@/components/portfolio/OrganizerEarningsCard';
import type { OrganizerEarnings } from '@/types/match';

describe('OrganizerEarningsCard', () => {
  it('renders nothing when matchCount is 0', () => {
    const earnings: OrganizerEarnings = {
      totalFees: 0n,
      matchCount: 0,
      feePerMatch: [],
    };
    const { container } = render(<OrganizerEarningsCard earnings={earnings} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders card when matchCount > 0', () => {
    const earnings: OrganizerEarnings = {
      totalFees: 150000000000000000n,
      matchCount: 3,
      feePerMatch: [
        {
          contractAddress: '0xabc',
          teamA: 'Team A',
          teamB: 'Team B',
          totalPool: 1000000000000000000n,
          fee: 50000000000000000n,
        },
      ],
    };
    render(<OrganizerEarningsCard earnings={earnings} />);
    expect(screen.getByText('Organizer Earnings')).toBeDefined();
    expect(screen.getByText('5% fee from organized matches')).toBeDefined();
  });

  it('displays total fees in ETH format', () => {
    const earnings: OrganizerEarnings = {
      totalFees: 150000000000000000n,
      matchCount: 3,
      feePerMatch: [],
    };
    render(<OrganizerEarningsCard earnings={earnings} />);
    expect(screen.getByText('0.1500 ETH')).toBeDefined();
  });

  it('displays match count', () => {
    const earnings: OrganizerEarnings = {
      totalFees: 50000000000000000n,
      matchCount: 5,
      feePerMatch: [],
    };
    render(<OrganizerEarningsCard earnings={earnings} />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('displays correct labels', () => {
    const earnings: OrganizerEarnings = {
      totalFees: 50000000000000000n,
      matchCount: 1,
      feePerMatch: [],
    };
    render(<OrganizerEarningsCard earnings={earnings} />);
    expect(screen.getByText('Total Earned')).toBeDefined();
    expect(screen.getByText('Completed Matches')).toBeDefined();
  });
});
