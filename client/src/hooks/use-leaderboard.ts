import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

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
  isWagering?: boolean;
};

type LeaderboardPeriodData = {
  data: LeaderboardEntry[];
};

type APIResponse = {
  status: "success";
  metadata?: {
    totalUsers: number;
    lastUpdated: string;
  };
  data: {
    today: LeaderboardPeriodData;
    weekly: LeaderboardPeriodData;
    monthly: LeaderboardPeriodData;
    all_time: LeaderboardPeriodData;
  };
};

export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";

export function useLeaderboard(
  timePeriod: TimePeriod = "today",
  page: number = 0,
) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const maxRetries = 5;
  const [retryCount, setRetryCount] = useState(0);

  const connect = useCallback(() => {
    if (isConnecting || retryCount >= maxRetries) return;

    setIsConnecting(true);
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/leaderboard`;

    try {
      const newWs = new WebSocket(wsUrl);

      newWs.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnecting(false);
        setRetryCount(0);
        setWs(newWs);
      };

      newWs.onmessage = (event: MessageEvent) => {
        try {
          const update = JSON.parse(event.data);
          if (update.type === "LEADERBOARD_UPDATE") {
            refetch();
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      newWs.onclose = () => {
        console.log('WebSocket connection closed');
        setWs(null);
        setIsConnecting(false);

        if (retryCount < maxRetries) {
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Attempting to reconnect in ${timeout}ms (attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, timeout);
        } else {
          toast({
            title: "Connection Error",
            description: "Failed to connect to leaderboard updates. Please refresh the page.",
            variant: "destructive",
          });
        }
      };

      newWs.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        newWs.close();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnecting(false);
    }
  }, [retryCount, isConnecting, toast]);

  useEffect(() => {
    connect();
    return () => {
      if (ws) {
        ws.close();
        setWs(null);
      }
    };
  }, [connect]);

  const { data, isLoading, error, refetch } = useQuery<APIResponse, Error>({
    queryKey: ["/api/affiliate/stats", timePeriod, page],
    queryFn: async () => {
      const response = await fetch(`/api/affiliate/stats?page=${page}&limit=10`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const periodKey =
    timePeriod === "weekly"
      ? "weekly"
      : timePeriod === "monthly"
        ? "monthly"
        : timePeriod === "today"
          ? "today"
          : "all_time";

  const periodWagerKey =
    timePeriod === "weekly"
      ? "this_week"
      : timePeriod === "monthly"
        ? "this_month"
        : timePeriod === "today"
          ? "today"
          : "all_time";

  const sortedData = data?.data[periodKey]?.data.map((entry: LeaderboardEntry) => {
    const prevEntry = previousData.find((p) => p.uid === entry.uid);
    const currentWager = entry.wagered[periodWagerKey];
    const previousWager = prevEntry ? prevEntry.wagered[periodWagerKey] : 0;

    return {
      ...entry,
      isWagering: currentWager > previousWager,
      wagerChange: currentWager - previousWager,
    };
  }) || [];

  useEffect(() => {
    if (data?.data[periodKey]?.data) {
      setPreviousData(data.data[periodKey].data);
    }
  }, [data, periodKey]);

  return {
    data: sortedData,
    metadata: data?.metadata,
    isLoading,
    error,
    refetch,
    wsConnected: ws?.readyState === WebSocket.OPEN,
  };
}