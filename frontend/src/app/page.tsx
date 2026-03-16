'use client';

import { useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { motion, useMotionValue, useTransform, useMotionTemplate, animate, useInView } from 'framer-motion';
import { Wallet, Search, CircleDollarSign, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BET_FACTORY_ABI, FACTORY_ADDRESS } from '@/lib/contracts';

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (isInView) {
      animate(count, value, { duration: 1.5, ease: 'easeOut' });
    }
  }, [isInView, value, count]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

const steps = [
  { icon: Wallet, title: 'Connect Wallet', desc: 'Connect your MetaMask wallet to the Sepolia testnet' },
  { icon: Search, title: 'Choose a Match', desc: 'Browse active matches or create your own betting market' },
  { icon: CircleDollarSign, title: 'Place Your Bet', desc: 'Select your team and place your bet with the fixed amount' },
  { icon: Trophy, title: 'Claim Winnings', desc: 'If your team wins, claim your proportional share of the prize pool' },
];

export default function HomePage() {
  const { data: matchCount } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: BET_FACTORY_ABI,
    functionName: 'getMatchCount',
    query: { refetchInterval: 12_000 },
  });

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      mouseX.set((e.clientX - left) / width);
      mouseY.set((e.clientY - top) / height);
    },
    [mouseX, mouseY],
  );

  const spotlightX = useTransform(mouseX, [0, 1], ['20%', '80%']);
  const spotlightY = useTransform(mouseY, [0, 1], ['20%', '80%']);
  const spotlightBg = useMotionTemplate`radial-gradient(600px circle at ${spotlightX} ${spotlightY}, rgba(59,130,246,0.15), rgba(139,92,246,0.08) 40%, transparent 70%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32" onMouseMove={handleMouseMove}>
        <div className="absolute inset-0 hero-gradient" />
        <div className="hero-orb-3" />
        <motion.div className="absolute inset-0 hero-spotlight pointer-events-none" style={{ background: spotlightBg }} />
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute inset-0 hero-noise" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 text-balance">
            <span className="gradient-text">Decentralized</span>
            <br />
            Football Betting
          </h1>
          <p className="text-xl text-foreground-muted max-w-2xl mx-auto mb-10 text-balance">
            Transparent, trustless betting on football matches powered by Ethereum smart contracts.
            No middleman, no hidden fees, just pure blockchain-powered fairness.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/matches">
              <Button size="lg">Browse Matches</Button>
            </Link>
            <Link href="/create">
              <Button size="lg" variant="secondary">Create Match</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-[color:var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="elevated" className="text-center">
              <p className="text-4xl font-bold gradient-text">
                <AnimatedNumber value={matchCount ? Number(matchCount) : 0} />
              </p>
              <p className="text-foreground-muted mt-2">Total Matches</p>
            </Card>
            <Card variant="elevated" className="text-center">
              <p className="text-4xl font-bold gradient-text">5%</p>
              <p className="text-foreground-muted mt-2">Organizer Fee</p>
            </Card>
            <Card variant="elevated" className="text-center">
              <p className="text-4xl font-bold gradient-text">95%</p>
              <p className="text-foreground-muted mt-2">To Winners</p>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-[color:var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-balance">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <Card className="text-center">
                    <div className="w-12 h-12 rounded-full gradient-border bg-surface-2 flex items-center justify-center mx-auto mb-4">
                      <Icon size={22} className="text-primary-400" />
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-foreground-muted">{item.desc}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
