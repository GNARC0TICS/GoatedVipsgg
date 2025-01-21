
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
  wagerChange?: number;
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

export function useLeaderboard(timePeriod: TimePeriod = 'today') {
  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ['leaderboard', timePeriod],
    queryFn: async () => {
      const response = await fetch(`/api/affiliate/stats?period=${timePeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      const data = await response.json();
      if (!data?.success) {
        throw new Error('API returned unsuccessful response');
      }
      if (!data?.data || !data.data[periodKey]?.data) {
        throw new Error('Invalid data format received from API');
      }
      return data;
    },
    refetchInterval: 30000,
    retry: 3,
    staleTime: 10000,
  });

  const periodKey = timePeriod === 'weekly' ? 'weekly' :
                   timePeriod === 'monthly' ? 'monthly' :
                   timePeriod === 'today' ? 'today' : 'all_time';

  const sortedData = data?.data?.[periodKey]?.data || [];

  return {
    data: sortedData,
    metadata: data?.metadata,
    isLoading,
    error: error as Error | null,
    refetch
  };
}
