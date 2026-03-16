'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BET_FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts';

interface RateOrganizerProps {
  matchId: bigint;
  organizerAddress: string;
}

export function RateOrganizer({ matchId, organizerAddress }: RateOrganizerProps) {
  const { address: userAddress } = useAccount();
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: currentRating } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'getOrganizerRating',
    args: [organizerAddress as `0x${string}`],
  });

  const { data: alreadyRated } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'hasRated',
    args: userAddress ? [userAddress, matchId] : undefined,
    query: { enabled: !!userAddress },
  });

  useEffect(() => {
    if (error) {
      toast.error(
        error.message.includes('User rejected')
          ? 'Transaction rejected by user.'
          : error.message.includes('AlreadyRated')
            ? 'You have already rated this organizer for this match.'
            : 'Transaction failed. Please try again.'
      );
      reset();
    }
  }, [error, reset]);

  function handleRate() {
    if (selectedRating < 1 || selectedRating > 5) return;
    writeContract({
      address: FACTORY_ADDRESS,
      abi: BET_FACTORY_ABI,
      functionName: 'rateOrganizer',
      args: [matchId, selectedRating],
    });
  }

  if (alreadyRated || isSuccess) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Rate Organizer</h4>
        <div className="text-center py-4">
          <div className="text-green-400 font-semibold mb-2">
            {isSuccess ? 'Rating Submitted!' : 'You have already rated this match'}
          </div>
          {isSuccess && selectedRating > 0 && (
            <div className="flex gap-1 justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  className={selectedRating >= star ? 'text-yellow-400' : 'text-[color:var(--muted-icon)]'}
                  fill={selectedRating >= star ? 'currentColor' : 'none'}
                />
              ))}
            </div>
          )}
          {currentRating && Number(currentRating[1]) > 0 && (
            <p className="text-xs text-foreground-muted">
              Organizer rating: {(Number(currentRating[0]) / 100).toFixed(1)}/5 ({Number(currentRating[1])} reviews)
            </p>
          )}
          <p className="text-xs text-foreground-subtle mt-1">Thank you for your feedback.</p>
        </div>
      </div>
    );
  }

  const displayRating = hoveredRating || selectedRating;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Rate Organizer</h4>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setSelectedRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-colors"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              size={24}
              className={displayRating >= star ? 'text-yellow-400' : 'text-[color:var(--muted-icon)]'}
              fill={displayRating >= star ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      {currentRating && (
        <p className="text-xs text-foreground-subtle">
          Current rating: {Number(currentRating[0]) / 100}/5 ({Number(currentRating[1])} reviews)
        </p>
      )}
      <Button
        onClick={handleRate}
        disabled={selectedRating === 0}
        loading={isPending || isConfirming}
        size="sm"
        className="w-full"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : `Submit ${selectedRating}-Star Rating`}
      </Button>
    </div>
  );
}
