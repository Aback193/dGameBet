import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioChart } from '@/components/portfolio/PortfolioChart';
import type { PortfolioChartPoint } from '@/types/match';

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  );
  const MockAreaChart = ({ children, data }: any) => (
    <div data-testid="area-chart" data-points={data?.length}>{children}</div>
  );
  const MockArea = () => <div data-testid="area" />;
  const MockXAxis = () => <div data-testid="x-axis" />;
  const MockYAxis = () => <div data-testid="y-axis" />;
  const MockTooltip = () => <div data-testid="tooltip" />;
  const MockCartesianGrid = () => <div data-testid="cartesian-grid" />;
  const MockReferenceLine = () => <div data-testid="reference-line" />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    AreaChart: MockAreaChart,
    Area: MockArea,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip,
    CartesianGrid: MockCartesianGrid,
    ReferenceLine: MockReferenceLine,
  };
});

describe('PortfolioChart', () => {
  const mockData: PortfolioChartPoint[] = [
    { date: 1699913600, label: 'Start', cumulativePnL: 0 },
    { date: 1700000000, label: 'Nov 14', cumulativePnL: 0.09 },
    { date: 1700100000, label: 'Nov 15', cumulativePnL: -0.01 },
  ];

  it('renders empty state when data is empty', () => {
    render(<PortfolioChart data={[]} currentPnL="+0.0000 ETH" isProfitable={true} />);
    expect(screen.getByText('Place more bets to see your portfolio growth.')).toBeDefined();
  });

  it('renders chart when data is provided', () => {
    render(<PortfolioChart data={mockData} currentPnL="+0.0900 ETH" isProfitable={true} />);
    expect(screen.getByTestId('responsive-container')).toBeDefined();
    expect(screen.getByTestId('area-chart')).toBeDefined();
  });

  it('displays title and current P&L', () => {
    render(<PortfolioChart data={mockData} currentPnL="+0.0900 ETH" isProfitable={true} />);
    expect(screen.getByText('Portfolio Growth')).toBeDefined();
    expect(screen.getByText('+0.0900 ETH')).toBeDefined();
  });

  it('applies green color when profitable', () => {
    const { container } = render(
      <PortfolioChart data={mockData} currentPnL="+0.0900 ETH" isProfitable={true} />
    );
    const pnlEl = container.querySelector('.text-green-400');
    expect(pnlEl).toBeDefined();
    expect(pnlEl?.textContent).toBe('+0.0900 ETH');
  });

  it('applies red color when not profitable', () => {
    const { container } = render(
      <PortfolioChart data={mockData} currentPnL="-0.0100 ETH" isProfitable={false} />
    );
    const pnlEl = container.querySelector('.text-red-400');
    expect(pnlEl).toBeDefined();
    expect(pnlEl?.textContent).toBe('-0.0100 ETH');
  });

  it('renders reference line for zero baseline', () => {
    render(<PortfolioChart data={mockData} currentPnL="+0.0900 ETH" isProfitable={true} />);
    expect(screen.getByTestId('reference-line')).toBeDefined();
  });
});
