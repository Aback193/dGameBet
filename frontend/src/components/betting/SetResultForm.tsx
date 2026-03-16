'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BET_MATCH_ABI } from '@/lib/contracts';
import { MatchResult } from '@/types/match';

interface SetResultFormProps {
  matchAddress: `0x${string}`;
  teamA: string;
  teamB: string;
}

export function SetResultForm({ matchAddress, teamA, teamB }: SetResultFormProps) {
  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);
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

  function handleSubmit() {
    if (selectedResult === null) return;
    writeContract({
      address: matchAddress,
      abi: BET_MATCH_ABI,
      functionName: 'setResult',
      args: [selectedResult],
    });
    setShowConfirm(false);
  }

  const resultLabel = selectedResult === MatchResult.TeamAWins
    ? `${teamA} Wins`
    : selectedResult === MatchResult.TeamBWins
      ? `${teamB} Wins`
      : 'Draw';

  if (isSuccess) {
    return (
      <div className="text-center py-6">
        <div className="text-green-400 text-lg font-semibold mb-2">Result Set Successfully!</div>
        <p className="text-sm text-foreground-muted">The match result has been recorded on the blockchain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Set Match Result</h3>
      <p className="text-sm text-foreground-muted">Select the final result of the match. This action is irreversible.</p>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedResult(MatchResult.TeamAWins)}
          className={`p-4 rounded-lg border-2 transition-all text-center
            ${selectedResult === MatchResult.TeamAWins
              ? 'border-primary-500 bg-primary-500/20'
              : 'border-[color:var(--border-strong)] hover:border-[color:var(--foreground-subtle)]'
            }`}
        >
          <p className="font-semibold text-sm">{teamA}</p>
          <p className="text-xs text-foreground-muted mt-1">Wins</p>
        </button>

        <button
          onClick={() => setSelectedResult(MatchResult.Draw)}
          className={`p-4 rounded-lg border-2 transition-all text-center
            ${selectedResult === MatchResult.Draw
              ? 'border-yellow-500 bg-yellow-500/20'
              : 'border-[color:var(--border-strong)] hover:border-[color:var(--foreground-subtle)]'
            }`}
        >
          <p className="font-semibold text-sm">Draw</p>
          <p className="text-xs text-foreground-muted mt-1">Refund All</p>
        </button>

        <button
          onClick={() => setSelectedResult(MatchResult.TeamBWins)}
          className={`p-4 rounded-lg border-2 transition-all text-center
            ${selectedResult === MatchResult.TeamBWins
              ? 'border-accent-500 bg-accent-500/20'
              : 'border-[color:var(--border-strong)] hover:border-[color:var(--foreground-subtle)]'
            }`}
        >
          <p className="font-semibold text-sm">{teamB}</p>
          <p className="text-xs text-foreground-muted mt-1">Wins</p>
        </button>
      </div>

      <Button
        onClick={() => setShowConfirm(true)}
        disabled={selectedResult === null}
        loading={isPending || isConfirming}
        className="w-full"
        size="lg"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Submit Result'}
      </Button>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Result">
        <div className="space-y-4">
          <p className="text-yellow-400 text-sm font-medium">
            This action is irreversible. Please confirm the result is correct.
          </p>
          <p>
            Result: <strong>{resultLabel}</strong>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isPending} className="flex-1">
              Confirm Result
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
