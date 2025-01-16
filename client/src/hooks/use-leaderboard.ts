import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

type APIResponse = {
  success: boolean;
  data: {
    all_time: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
  };
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
};

export type TimePeriod = 'weekly' | 'monthly' | 'all_time';

export function useLeaderboard(timePeriod: TimePeriod = 'all_time') {
  const queryClient = useQueryClient();
  const [wsError, setWsError] = useState<string | null>(null);

  const transformData = useCallback((data: APIResponse['data'][TimePeriod]['data']) => {
    return data
      .map((entry) => ({
        uid: entry.uid,
        name: entry.name,
        wagered: entry.wagered ? 
          entry.wagered[timePeriod === 'weekly' ? 'this_week' : 
                       timePeriod === 'monthly' ? 'this_month' : 
                       'all_time'] || 0 : 0
      }))
      .sort((a, b) => (b.wagered || 0) - (a.wagered || 0))
      .slice(0, 100); // Limit to top 100 for better performance
  }, [timePeriod]);

  const { data: initialData, isLoading, error: queryError } = useQuery({
    queryKey: ['/api/affiliate/stats', timePeriod],
    queryFn: async () => {
      const response = await fetch('/api/affiliate/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json: APIResponse = await response.json();

      if (!json.success || !json.data?.[timePeriod]?.data) {
        throw new Error('Invalid data format');
      }

      return transformData(json.data[timePeriod].data);
    },
    staleTime: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 5000)
  });

  useEffect(() => {
    let isSubscribed = true;
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const connectWebSocket = () => {
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setWsError("Unable to establish real-time connection");
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/affiliate-stats`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        setWsError(null);
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;

        try {
          const json: APIResponse = JSON.parse(event.data);
          if (json.success && json.data?.[timePeriod]?.data) {
            const transformedData = transformData(json.data[timePeriod].data);
            queryClient.setQueryData(['/api/affiliate/stats', timePeriod], transformedData);
          }
        } catch (error) {
          console.error('WebSocket data parsing error:', error);
          setWsError("Error processing real-time data");
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsError("Connection error occurred");
      };

      ws.onclose = () => {
        if (!isSubscribed) return;

        console.log('WebSocket closed, attempting to reconnect...');
        reconnectAttempts++;
        setTimeout(connectWebSocket, Math.min(1000 * reconnectAttempts, 5000));
      };
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [timePeriod, transformData, queryClient]);

  return {
    data: initialData,
    isLoading,
    error: queryError || wsError
  };
}