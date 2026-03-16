'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import type { PortfolioChartPoint } from '@/types/match';

interface PortfolioChartProps {
  data: PortfolioChartPoint[];
  currentPnL: string;
  isProfitable: boolean;
}

export function PortfolioChart({ data, currentPnL, isProfitable }: PortfolioChartProps) {
  if (data.length === 0) {
    return (
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Portfolio Growth</h2>
        <div className="flex items-center justify-center h-72 text-foreground-muted">
          Place more bets to see your portfolio growth.
        </div>
      </Card>
    );
  }

  const strokeColor = isProfitable ? '#34d399' : '#f87171';
  const gradientColor = isProfitable ? '#10b981' : '#ef4444';

  return (
    <Card className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Portfolio Growth</h2>
        <span
          className={`text-xl font-bold font-mono ${isProfitable ? 'text-green-400' : 'text-red-400'}`}
        >
          {currentPnL}
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 15 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #334155)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--foreground-subtle, #94a3b8)', fontSize: 12, dy: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--foreground-subtle, #94a3b8)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v} Ξ`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card-bg, #1e293b)',
                border: '1px solid var(--card-border, #334155)',
                borderRadius: 12,
                padding: '8px 12px',
              }}
              labelStyle={{ color: 'var(--foreground-subtle, #94a3b8)', fontSize: 12 }}
              formatter={(value: number) => [`${value.toFixed(4)} ETH`, 'Cumulative P&L']}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="cumulativePnL"
              stroke={strokeColor}
              strokeWidth={2.5}
              fill="url(#pnlGradient)"
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
