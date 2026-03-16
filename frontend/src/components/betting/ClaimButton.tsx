'use client';

import { useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { BET_MATCH_ABI } from '@/lib/contracts';
import { MatchResult } from '@/types/match';

interface ClaimButtonProps {
  matchAddress: `0x${string}`;
  result: number;
  hasClaimed: boolean;
  canClaim: boolean;
}

export function ClaimButton({ matchAddress, result, hasClaimed, canClaim }: ClaimButtonProps) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isDraw = result === MatchResult.Draw;

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

  function handleClaim() {
    writeContract({
      address: matchAddress,
      abi: BET_MATCH_ABI,
      functionName: isDraw ? 'claimRefund' : 'claimPrize',
    });
  }

  if (hasClaimed || isSuccess) {
    return (
      <div className="text-green-400 font-medium">
        {isDraw ? 'Refund Claimed' : 'Prize Claimed'}
      </div>
    );
  }

  if (!canClaim) return null;

  return (
    <Button
      onClick={handleClaim}
      loading={isPending || isConfirming}
      variant={isDraw ? 'secondary' : 'primary'}
      size="lg"
      className="w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : isDraw ? 'Claim Refund' : 'Claim Prize'}
    </Button>
  );
}
