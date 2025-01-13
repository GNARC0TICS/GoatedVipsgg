
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

type APIResponse = {
  success: boolean;
  data: Array<{
    uid: string;
    name: string;
    wagered: {
      today: number;
      this_week: number;
      this_month: number;
      all_time: number;
    };
  }>;
};

type LeaderboardEntry = {
  username: string;
  totalWager: number;
  rank: number;
};

export type TimePeriod = 'weekly' | 'monthly' | 'all_time';

export function useLeaderboard(timePeriod: TimePeriod = 'all_time') {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [realTimeData, setRealTimeData] = useState<LeaderboardEntry[]>([]);

  const transformData = (data: APIResponse['data']) => {
    return data
      .map((entry, index) => ({
        username: entry.name,
        totalWager: timePeriod === 'weekly' ? entry.wagered.this_week :
                   timePeriod === 'monthly' ? entry.wagered.this_month :
                   entry.wagered.all_time,
        rank: index + 1
      }))
      .sort((a, b) => b.totalWager - a.totalWager)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  };

  const { data: initialData, isLoading, error } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/affiliate/stats', timePeriod],
    queryFn: async () => {
      const response = await fetch('/api/affiliate/stats', {
        credentials: 'include'
      });
      const json: APIResponse = await response.json();
      console.log('Initial API response:', json);

      if (!json.success || !Array.isArray(json.data)) {
        throw new Error('Invalid data format');
      }

      return transformData(json.data);
    },
    staleTime: 30000,
  });

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/affiliate-stats`);

    socket.onmessage = (event) => {
      try {
        const json: APIResponse = JSON.parse(event.data);

        if (json.success && Array.isArray(json.data)) {
          const transformed = transformData(json.data);
          setRealTimeData(transformed);
        }
      } catch (e) {
        console.error('Failed to parse websocket data:', e);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setTimeout(() => setWs(null), 1000);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [timePeriod]);

  return {
    data: realTimeData.length > 0 ? realTimeData : initialData,
    isLoading,
    error,
  };
}
