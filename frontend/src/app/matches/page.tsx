'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, Coins } from 'lucide-react';
import { MatchList } from '@/components/matches/MatchList';
import { MyBetsList } from '@/components/matches/MyBetsList';
import { Tabs } from '@/components/ui/Tabs';

type TabFilter = 'active' | 'completed' | 'mybets';

const tabs = [
  { id: 'active', label: 'Active', icon: <Trophy size={14} /> },
  { id: 'completed', label: 'Completed', icon: <CheckCircle size={14} /> },
  { id: 'mybets', label: 'My Bets', icon: <Coins size={14} /> },
];

export default function MatchesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');

  const filter: TabFilter =
    tab === 'completed' ? 'completed' :
    tab === 'mybets' ? 'mybets' : 'active';

  const setFilter = useCallback((value: TabFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'active') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const qs = params.toString();
    router.replace(qs ? `/matches?${qs}` : '/matches');
  }, [searchParams, router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Matches</h1>
        <Tabs
          layoutId="matches-tabs"
          tabs={tabs}
          activeTab={filter}
          onChange={(id) => setFilter(id as TabFilter)}
        />
      </div>
      {filter === 'mybets' ? (
        <MyBetsList />
      ) : (
        <MatchList filter={filter} />
      )}
    </motion.div>
  );
}
