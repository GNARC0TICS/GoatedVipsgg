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
      all_time: number;
    };
  }>;
};

type LeaderboardEntry = {
  username: string;
  totalWager: number;
  rank: number;
};

export function useLeaderboard() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [realTimeData, setRealTimeData] = useState<LeaderboardEntry[]>([]);

  const { data: initialData, isLoading, error } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/affiliate/stats'],
    queryFn: async () => {
      const response = await fetch('/api/affiliate/stats', {
        credentials: 'include'
      });
      const json: APIResponse = await response.json();
      console.log('Initial API response:', json);

      if (!json.success || !Array.isArray(json.data)) {
        throw new Error('Invalid data format');
      }

      return json.data.map((entry, index) => ({
        username: entry.name,
        totalWager: entry.wagered.all_time,
        rank: index + 1
      }));
    },
    staleTime: 30000,
  });

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/affiliate-stats`);

    socket.onmessage = (event) => {
      try {
        console.log('WebSocket message received:', event.data);
        const json: APIResponse = JSON.parse(event.data);

        if (json.success && Array.isArray(json.data)) {
          const transformed = json.data.map((entry, index) => ({
            username: entry.name,
            totalWager: entry.wagered.all_time,
            rank: index + 1
          }));
          console.log('Transformed data:', transformed);
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
  }, []);

  return {
    data: realTimeData.length > 0 ? realTimeData : initialData,
    isLoading,
    error,
  };
}