import { useQuery } from '@tanstack/react-query';

type WageredData = {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  wagered: WageredData;
};

type APIResponse = {
  success: boolean;
  data: {
    today: { data: LeaderboardEntry[] };
    all_time: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
  };
  metadata?: {
    totalUsers: number;
    lastUpdated: string;
  };
};

export type TimePeriod = 'today' | 'weekly' | 'monthly' | 'all_time';

export function useLeaderboard(timePeriod: TimePeriod = 'today', page: number = 0) {
  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ['/api/affiliate/stats', timePeriod, page],
    queryFn: async () => {
      const response = await fetch(`/api/affiliate/stats?period=${timePeriod}&page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
    select: (data) => {
      if (!data?.data) {
        throw new Error('Invalid data format received from API');
      }
      return {
        ...data,
        data: {
          ...data.data,
          [timePeriod]: {
            data: data.data[timePeriod].data.map((entry) => ({
              uid: entry.uid,
              name: entry.name,
              wagered: {
                today: entry.wagered.today || 0,
                this_week: entry.wagered.this_week || 0,
                this_month: entry.wagered.this_month || 0,
                all_time: entry.wagered.all_time || 0
              }
            }))
          }
        }
      };
    }
  });

  return {
    data: data?.data[timePeriod].data || [],
    metadata: data?.metadata,
    isLoading,
    error: error as Error | null,
    refetch
  };
}