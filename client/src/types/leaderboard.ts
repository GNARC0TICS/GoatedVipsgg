
export interface MVP {
  uid: string;
  name: string;
  username: string;
  wagerAmount: number;
  avatarUrl?: string;
  rank: number;
  wageredAllTime?: number;
  lastWagerChange?: number;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
}

export interface LeaderboardData {
  data: {
    today: { data: MVP[]; };
    weekly: { data: MVP[]; };
    monthly: { data: MVP[]; };
    all_time: { data: MVP[]; };
  };
  metadata: {
    totalUsers: number;
    lastUpdated: string;
  };
}
