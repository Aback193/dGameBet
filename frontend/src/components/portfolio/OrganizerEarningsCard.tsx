'use client';

import { Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatEth } from '@/lib/utils';
import type { OrganizerEarnings } from '@/types/match';

interface OrganizerEarningsCardProps {
  earnings: OrganizerEarnings;
}

export function OrganizerEarningsCard({ earnings }: OrganizerEarningsCardProps) {
  if (earnings.matchCount === 0) return null;

  return (
    <Card className="mb-8 gradient-border">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-full bg-accent-500/10">
          <Wallet className="w-6 h-6 text-accent-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Organizer Earnings</h2>
          <p className="text-sm text-foreground-subtle">5% fee from organized matches</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Total Earned</p>
          <p className="text-2xl font-bold font-mono text-accent-400">
            {formatEth(earnings.totalFees)}
          </p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Completed Matches</p>
          <p className="text-2xl font-bold">{earnings.matchCount}</p>
        </div>
      </div>
    </Card>
  );
}
