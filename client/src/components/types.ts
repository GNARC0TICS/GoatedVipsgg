import { TimePeriod } from "@/hooks/use-leaderboard";

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
  data: LeaderboardEntry[];
  period: TimePeriod;
}