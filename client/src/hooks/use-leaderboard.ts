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
  status: "success" | "error";
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

const POLLING_INTERVAL = 30000; // 30 seconds
const STALE_TIME = 15000; // 15 seconds
const CACHE_TIME = 60000; // 1 minute

export function useLeaderboard(
  timePeriod: TimePeriod = "today",
  page: number = 0,
) {
  const [ws, setWs] = React.useState<WebSocket | null>(null);
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // WebSocket connection management
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
            setLastUpdate(new Date());
            refetch();
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed. Reconnecting...');
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

  // Primary data fetch hook
  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ["/api/affiliate/stats", timePeriod, page, lastUpdate],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/affiliate/stats?period=${timePeriod}&page=${page}&limit=10`,
          {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const freshData = await response.json();

        if (freshData.status === "error") {
          throw new Error("Failed to fetch leaderboard data");
        }

        // Cache the response
        sessionStorage.setItem(`leaderboard-${timePeriod}-${page}`, JSON.stringify({
          data: freshData,
          timestamp: Date.now()
        }));

        return freshData;
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        // Try to get cached data
        const cached = sessionStorage.getItem(`leaderboard-${timePeriod}-${page}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 300000) { // 5 minutes
            return data;
          }
        }
        throw error;
      }
    },
    refetchInterval: POLLING_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 3,
    refetchOnWindowFocus: true
  });

  const periodKey = timePeriod;

  // Transform and process the data
  const sortedData = React.useMemo(() => {
    if (!data?.data?.[periodKey]?.data) return [];

    return data.data[periodKey].data.map((entry: LeaderboardEntry) => {
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
        lastUpdate: new Date().toISOString()
      };
    });
  }, [data, periodKey, previousData, timePeriod]);

  // Update previous data for comparison
  useEffect(() => {
    if (sortedData.length > 0) {
      setPreviousData(sortedData);
    }
  }, [sortedData]);

  return {
    data: sortedData,
    metadata: data?.metadata,
    isLoading,
    error,
    refetch,
    lastUpdate
  };
}