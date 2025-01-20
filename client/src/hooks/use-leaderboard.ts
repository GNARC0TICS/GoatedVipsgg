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

      // Map the time period to the correct data array
      const periodKey = timePeriod === 'weekly' ? 'weekly' :
                       timePeriod === 'monthly' ? 'monthly' :
                       timePeriod === 'today' ? 'today' : 'all_time';

      const periodData = data.data[periodKey].data;

      return {
        ...data,
        data: {
          ...data.data,
          [periodKey]: {
            data: periodData.map((entry) => ({
              uid: entry.uid,
              name: entry.name,
              wagered: {
                today: entry.wagered?.today || 0,
                this_week: entry.wagered?.this_week || 0,
                this_month: entry.wagered?.this_month || 0,
                all_time: entry.wagered?.all_time || 0
              }
            }))
          }
        }
      };
    }
  });

  // Get the correct data array based on the time period
  const periodKey = timePeriod === 'weekly' ? 'weekly' :
                   timePeriod === 'monthly' ? 'monthly' :
                   timePeriod === 'today' ? 'today' : 'all_time';

  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);
  
  // Compare current and previous wager amounts
  const sortedData = data?.data[periodKey]?.data?.map(entry => {
    const prevEntry = previousData.find(p => p.uid === entry.uid);
    const currentWager = entry.wagered[timePeriod === 'weekly' ? 'this_week' : 
                                    timePeriod === 'monthly' ? 'this_month' : 
                                    timePeriod === 'today' ? 'today' : 'all_time'] || 0;
    const previousWager = prevEntry ? 
                         prevEntry.wagered[timePeriod === 'weekly' ? 'this_week' : 
                                         timePeriod === 'monthly' ? 'this_month' : 
                                         timePeriod === 'today' ? 'today' : 'all_time'] || 0 : 0;
    
    return {
      ...entry,
      isWagering: currentWager > previousWager
    };
  }).sort((a, b) => {
    const getWagerValue = (entry: LeaderboardEntry) => {
      if (!entry?.wagered) return 0;
      switch (periodKey) {
        case 'weekly': return entry.wagered.this_week;
        case 'monthly': return entry.wagered.this_month;
        case 'today': return entry.wagered.today;
        default: return entry.wagered.all_time;
      }
    };
    return (getWagerValue(b) || 0) - (getWagerValue(a) || 0);
  }) || [];

  // Update previous data after successful fetch
  useEffect(() => {
    if (data?.data[periodKey]?.data) {
      setPreviousData(data.data[periodKey].data);
    }
  }, [data]);

  return {
    data: sortedData,
    metadata: data?.metadata,
    isLoading,
    error: error as Error | null,
    refetch
  };
}