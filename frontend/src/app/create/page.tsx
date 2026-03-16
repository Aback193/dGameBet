'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { motion } from 'framer-motion';
import { Check, Shield } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { TeamAutocomplete } from '@/components/ui/TeamAutocomplete';
import { BET_FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts';
import { useTeamBadgeUrl } from '@/lib/team-lookup';

export default function CreateMatchPage() {
  const { isConnected } = useAccount();
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [betAmount, setBetAmount] = useState('0.01');
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const teamABadge = useTeamBadgeUrl(teamA);
  const teamBBadge = useTeamBadgeUrl(teamB);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!teamA.trim()) errs.teamA = 'Team A name is required';
    if (!teamB.trim()) errs.teamB = 'Team B name is required';
    if (!startDate) errs.startDate = 'Start date is required';
    if (!startTime) errs.startTime = 'Start time is required';

    const dateTime = new Date(`${startDate}T${startTime}`);
    if (dateTime <= new Date()) errs.startDate = 'Start time must be in the future';

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) errs.betAmount = 'Bet amount must be greater than 0';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setShowConfirm(true);
  }

  function handleCreate() {
    const dateTime = new Date(`${startDate}T${startTime}`);
    const timestamp = BigInt(Math.floor(dateTime.getTime() / 1000));

    writeContract({
      address: FACTORY_ADDRESS,
      abi: BET_FACTORY_ABI,
      functionName: 'createMatch',
      args: [teamA, teamB, timestamp, parseEther(betAmount)],
    });
    setShowConfirm(false);
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl mx-auto px-4 py-16 text-center"
      >
        <Card>
          <div className="py-8">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Match Created!</h2>
            <p className="text-foreground-muted mb-6">Your match has been deployed to the blockchain.</p>
            <Button onClick={() => window.location.href = '/matches'}>View Matches</Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  const previewDate = startDate && startTime
    ? new Date(`${startDate}T${startTime}`).toLocaleString()
    : 'Not set';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <h1 className="text-4xl font-bold mb-10">Create Match</h1>

      {!isConnected ? (
        <Card className="text-center py-16">
          <p className="text-foreground-muted text-lg">Connect your wallet to create a match.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Card className="p-8">
            <div className="space-y-7">
              <div className="grid grid-cols-2 gap-4">
                <TeamAutocomplete
                  label="Team A"
                  placeholder="e.g. Barcelona"
                  value={teamA}
                  onChange={setTeamA}
                  error={errors.teamA}
                />
                <TeamAutocomplete
                  label="Team B"
                  placeholder="e.g. Real Madrid"
                  value={teamB}
                  onChange={setTeamB}
                  error={errors.teamB}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  error={errors.startDate}
                />
                <Input
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  error={errors.startTime}
                />
              </div>

              <Input
                label="Bet Amount (ETH)"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                error={errors.betAmount}
              />

              <Button
                onClick={handleSubmit}
                loading={isPending || isConfirming}
                size="lg"
                className="w-full text-lg py-6"
              >
                {isPending ? 'Confirming...' : isConfirming ? 'Deploying...' : 'Create Match'}
              </Button>
            </div>
          </Card>

          {/* Live Preview */}
          <div className="hidden lg:block">
            <p className="text-sm text-foreground-muted mb-4 font-medium">Live Preview</p>
            <Card variant="elevated" className="p-8">
              <div className="flex items-center justify-between mb-6">
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center flex-1">
                  {teamA && (
                    <div className="flex justify-center mb-3">
                      {teamABadge ? (
                        <Image
                          src={teamABadge}
                          alt={`${teamA} badge`}
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <Shield className="w-12 h-12 text-[color:var(--muted-icon)]" />
                      )}
                    </div>
                  )}
                  <p className="font-semibold text-xl">{teamA || 'Team A'}</p>
                </div>
                <div className="text-foreground-subtle font-bold text-2xl">VS</div>
                <div className="text-center flex-1">
                  {teamB && (
                    <div className="flex justify-center mb-3">
                      {teamBBadge ? (
                        <Image
                          src={teamBBadge}
                          alt={`${teamB} badge`}
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <Shield className="w-12 h-12 text-[color:var(--muted-icon)]" />
                      )}
                    </div>
                  )}
                  <p className="font-semibold text-xl">{teamB || 'Team B'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-sm border-t border-[color:var(--border)] pt-6">
                <div>
                  <p className="text-foreground-muted mb-1">Bet Amount</p>
                  <p className="font-medium font-mono text-base">{betAmount || '0'} ETH</p>
                </div>
                <div>
                  <p className="text-foreground-muted mb-1">Start Time</p>
                  <p className="font-medium text-sm">{previewDate}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Match Creation">
        <div className="space-y-4">
          <div className="space-y-2 text-sm">
            <p><strong>Teams:</strong> {teamA} vs {teamB}</p>
            <p><strong>Start:</strong> {startDate} {startTime}</p>
            <p><strong>Bet Amount:</strong> {betAmount} ETH</p>
          </div>
          <p className="text-xs text-foreground-muted">
            This will deploy a new smart contract. You will earn 5% of the total betting pool as the organizer.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={isPending} className="flex-1">
              Deploy Match
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
