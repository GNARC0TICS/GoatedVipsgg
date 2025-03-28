import { LeaderboardTable } from '@/components/LeaderboardTable';
import { LeaderboardEntry } from '@/components/types';
import { TimePeriod } from '@/hooks/use-leaderboard';

// Simple wrapper component for the daily leaderboard
export function DailyLeaderboardWrapper({ data }: { data: LeaderboardEntry[] }) {
  // Explicitly type the period as TimePeriod
  const period: TimePeriod = "today";
  
  return (
    <LeaderboardTable 
      data={data} 
      period={period}
    />
  );
}