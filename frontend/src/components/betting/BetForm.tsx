'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BET_MATCH_ABI } from '@/lib/contracts';
import { formatEth } from '@/lib/utils';
import { Team } from '@/types/match';

interface BetFormProps {
  matchAddress: `0x${string}`;
  teamA: string;
  teamB: string;
  betAmount: bigint;
  disabled?: boolean;
}

export function BetForm({ matchAddress, teamA, teamB, betAmount, disabled }: BetFormProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (error) {
      toast.error(
        error.message.includes('User rejected')
          ? 'Transaction rejected by user.'
          : 'Transaction failed. Please try again.'
      );
      reset();
    }
  }, [error, reset]);

  function handleBet() {
    if (selectedTeam === null) return;
    writeContract({
      address: matchAddress,
      abi: BET_MATCH_ABI,
      functionName: 'placeBet',
      args: [selectedTeam],
      value: betAmount,
    });
    setShowConfirm(false);
  }

  if (isSuccess) {
    return (
      <div className="text-center py-6">
        <div className="text-green-400 text-lg font-semibold mb-2">Bet Placed Successfully!</div>
        <p className="text-sm text-foreground-muted">Your bet has been recorded on the blockchain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Place Your Bet</h3>
      <p className="text-sm text-foreground-muted">Bet amount: {formatEth(betAmount)}</p>

      <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Team selection">
        <button
          onClick={() => setSelectedTeam(Team.TeamA)}
          disabled={disabled}
          role="radio"
          aria-checked={selectedTeam === Team.TeamA}
          className={`p-4 rounded-lg border-2 transition-all text-center
            ${selectedTeam === Team.TeamA
              ? 'border-primary-500 bg-primary-500/20'
              : 'border-[color:var(--border-strong)] hover:border-[color:var(--foreground-subtle)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <p className="font-semibold">{teamA}</p>
          <p className="text-xs text-foreground-muted mt-1">Team A</p>
        </button>

        <button
          onClick={() => setSelectedTeam(Team.TeamB)}
          disabled={disabled}
          role="radio"
          aria-checked={selectedTeam === Team.TeamB}
          className={`p-4 rounded-lg border-2 transition-all text-center
            ${selectedTeam === Team.TeamB
              ? 'border-accent-500 bg-accent-500/20'
              : 'border-[color:var(--border-strong)] hover:border-[color:var(--foreground-subtle)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <p className="font-semibold">{teamB}</p>
          <p className="text-xs text-foreground-muted mt-1">Team B</p>
        </button>
      </div>

      <Button
        onClick={() => setShowConfirm(true)}
        disabled={selectedTeam === null || disabled}
        loading={isPending || isConfirming}
        className="w-full"
        size="lg"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Place Bet'}
      </Button>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Bet">
        <div className="space-y-4">
          <p>
            You are betting <strong>{formatEth(betAmount)}</strong> on{' '}
            <strong>{selectedTeam === Team.TeamA ? teamA : teamB}</strong>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleBet} loading={isPending} className="flex-1">
              Confirm Bet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
