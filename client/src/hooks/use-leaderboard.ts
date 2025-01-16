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

export function useLeaderboard(timePeriod: TimePeriod = 'all_time') {
  const { data, isLoading, error } = useQuery<APIResponse>({
    queryKey: ['/api/affiliate/stats', timePeriod],
    queryFn: async () => {
      const response = await fetch('/api/affiliate/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 10000, // Polling every 10 seconds
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