
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";

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
  lastUpdate?: string;
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
  const [ws, setWs] = React.useState<WebSocket | null>(null);
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);

  React.useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let ws: WebSocket;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/leaderboard`);

      ws.onmessage = (event: MessageEvent) => {
        try {
          const update = JSON.parse(event.data);
          if (update.type === "LEADERBOARD_UPDATE") {
            refetch();
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

      setWs(ws);
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leaderboard", timePeriod, page],
    queryFn: async () => {
      try {
        const response = await fetch('/api/affiliate/stats');
        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard data: ${response.statusText}`);
        }

        const jsonData = await response.json();
        
        // Transform the API response into our expected format
        const transformedData = jsonData.data.map((entry: any) => ({
          uid: entry.uid || '',
          name: entry.name || 'Anonymous',
          wagered: {
            today: Number(entry.wagered?.today || 0),
            this_week: Number(entry.wagered?.this_week || 0),
            this_month: Number(entry.wagered?.this_month || 0),
            all_time: Number(entry.wagered?.all_time || 0)
          },
          lastUpdate: entry.lastUpdate || new Date().toISOString()
        }));

        return transformedData;
      } catch (error: any) {
        console.error('Leaderboard fetch error:', error);
        throw new Error(error.message || 'Failed to fetch leaderboard data');
      }
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true
  });

  const sortedData = React.useMemo(() => {
    if (!data) return [];

    return data.map((entry: LeaderboardEntry) => {
      const prevEntry = previousData.find((p) => p.uid === entry.uid);
      const currentWager = entry.wagered[
        timePeriod === "weekly"
          ? "this_week"
          : timePeriod === "monthly"
            ? "this_month"
            : timePeriod === "today"
              ? "today"
              : "all_time"
      ];
      const previousWager = prevEntry
        ? prevEntry.wagered[
            timePeriod === "weekly"
              ? "this_week"
              : timePeriod === "monthly"
                ? "this_month"
                : timePeriod === "today"
                  ? "today"
                  : "all_time"
          ]
        : 0;

      return {
        ...entry,
        isWagering: currentWager > previousWager,
        wagerChange: currentWager - previousWager,
      };
    });
  }, [data, previousData, timePeriod]);

  useEffect(() => {
    if (data) {
      setPreviousData(data);
    }
  }, [data]);

  return {
    data: sortedData,
    isLoading,
    error,
    refetch,
  };
}
