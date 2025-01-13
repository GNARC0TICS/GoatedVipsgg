import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

type AffiliateEntry = {
  username: string;
  totalWager: number;
  commission: number;
  rank: number;
};

export function useLeaderboard() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [realTimeData, setRealTimeData] = useState<AffiliateEntry[]>([]);

  const { data: initialData, isLoading, error } = useQuery<AffiliateEntry[]>({
    queryKey: ['/api/affiliate/stats'],
    staleTime: 30000,
  });

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/affiliate-stats`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setRealTimeData(data);
    };

    socket.onclose = () => {
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