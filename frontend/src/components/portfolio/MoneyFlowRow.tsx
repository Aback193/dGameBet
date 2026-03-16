'use client';

import { memo } from 'react';
import {
  PlusCircle,
  ArrowDownLeft,
  CheckCircle,
  Wallet,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { formatDate, formatPnL, formatGas } from '@/lib/utils';
import type { MoneyFlowEntry } from '@/types/match';

interface MoneyFlowRowProps {
  entry: MoneyFlowEntry;
}

const iconMap = {
  create_match: PlusCircle,
  place_bet: ArrowDownLeft,
  set_result: CheckCircle,
  organizer_fee: Wallet,
  organizer_fee_failed: Wallet,
  claim_prize: Trophy,
  claim_refund: RotateCcw,
};

const labelMap = {
  create_match: 'Create Match',
  place_bet: 'Place Bet',
  set_result: 'Set Result',
  organizer_fee: 'Organizer Fee',
  organizer_fee_failed: 'Organizer Fee (Failed)',
  claim_prize: 'Claim Prize',
  claim_refund: 'Claim Refund',
};

const iconColorMap = {
  create_match: 'text-blue-400',
  place_bet: 'text-red-400',
  set_result: 'text-purple-400',
  organizer_fee: 'text-green-400',
  organizer_fee_failed: 'text-orange-400',
  claim_prize: 'text-green-400',
  claim_refund: 'text-yellow-400',
};

export const MoneyFlowRow = memo(function MoneyFlowRow({ entry }: MoneyFlowRowProps) {
  const Icon = iconMap[entry.type];
  const label = labelMap[entry.type];
  const iconColor = iconColorMap[entry.type];

  const valueColor = entry.value > 0n ? 'text-green-400' : entry.value < 0n ? 'text-red-400' : 'text-gray-400';
  const netColor = entry.netImpact > 0n ? 'text-green-400' : entry.netImpact < 0n ? 'text-red-400' : 'text-gray-400';

  const matchLabel = `${entry.teamA} vs ${entry.teamB}`;
  const fullLabel = entry.detail ? `${label} — ${entry.detail}` : label;

  return (
    <a
      href={`https://sepolia.etherscan.io/tx/${entry.txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between py-4 hover:bg-surface-2 -mx-4 px-4 rounded-lg transition group"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={`shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{fullLabel}</p>
          <p className="text-xs text-foreground-subtle truncate">{matchLabel}</p>
          <p className="text-xs text-foreground-muted">
            {formatDate(entry.timestamp)}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        {entry.value !== 0n && (
          <p className={`text-sm font-mono font-semibold ${valueColor}`}>
            {formatPnL(entry.value)}
          </p>
        )}
        {entry.gasCost > 0n && (
          <p className="text-xs text-orange-400 font-mono">
            ⛽ -{formatGas(entry.gasCost)}
          </p>
        )}
        <p className={`text-xs font-mono font-semibold ${netColor}`}>
          Net: {formatPnL(entry.netImpact)}
        </p>
      </div>
    </a>
  );
});
