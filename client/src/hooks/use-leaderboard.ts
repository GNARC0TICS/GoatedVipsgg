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
    all_time: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
  };
  metadata?: {
    totalUsers: number;
    lastUpdated: string;
  };
};

export type TimePeriod = 'weekly' | 'monthly' | 'all_time';

export function useLeaderboard(timePeriod: TimePeriod = 'all_time', page: number = 0) {
  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ['/api/affiliate/stats', timePeriod, page],
    queryFn: async () => {
      const response = await fetch(`/api/affiliate/stats?period=${timePeriod}&page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: null, // Disable automatic polling
    select: (data) => ({
      ...data,
      data: {
        ...data.data,
        [timePeriod]: {
          data: data.data[timePeriod].data.map((entry) => ({
            uid: entry.uid,
            name: entry.name,
            wagered: entry.wagered
          }))
        }
      }
    })
  });

  return {
    data: data?.data[timePeriod].data || [],
    metadata: data?.metadata,
    isLoading,
    error: error as Error | null
  };
}