import { TimePeriod, Entry } from '@/hooks/use-leaderboard';

// Types for LeaderboardTable component
export interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
  lastUpdate?: string;
}

export interface LeaderboardTableProps {
  data: Array<LeaderboardEntry>;
  period: TimePeriod;
}

// Types for LoadingSpinner component
export interface LoadingSpinnerProps {
  size?: number;
  fullscreen?: boolean;
  label?: boolean;
}