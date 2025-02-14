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
  status?: 'active' | 'completed' | 'transition';
  metadata?: {
    transitionEnds?: string;
    totalParticipants?: number;
    lastUpdated?: string;
  };
};

type APIResponse = {
  status: "success";
  data: {
    today: LeaderboardPeriodData;
    weekly: LeaderboardPeriodData;
    monthly: LeaderboardPeriodData;
    all_time: LeaderboardPeriodData;
  };
  metadata?: {
    totalUsers: number;
    lastUpdated: string;
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

  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ["external-leaderboard", timePeriod, page],
    queryFn: async () => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const apiToken = import.meta.env.VITE_API_TOKEN;

      if (!apiBaseUrl || !apiToken) {
        throw new Error('API configuration missing');
      }

      const response = await fetch(
        'https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard/2RW440E',
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const freshData = await response.json() as APIResponse;

      // Cache the data in session storage for faster initial loads
      sessionStorage.setItem(`leaderboard-${timePeriod}-${page}`, JSON.stringify({
        data: freshData,
        timestamp: Date.now()
      }));

      return freshData;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    retry: 3,
    refetchOnWindowFocus: true
  });

  const periodKey =
    timePeriod === "weekly"
      ? "weekly"
      : timePeriod === "monthly"
        ? "monthly"
        : timePeriod === "today"
          ? "today"
          : "all_time";

  const sortedData = React.useMemo(() => {
    return data?.data?.[periodKey]?.data.map((entry: LeaderboardEntry) => {
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
    }) || [];
  }, [data, periodKey, previousData, timePeriod]);

  useEffect(() => {
    if (data?.data?.[periodKey]?.data) {
      setPreviousData(data.data[periodKey].data);
    }
  }, [data, periodKey]);

  return {
    data: sortedData,
    status: data?.data?.[periodKey]?.status,
    metadata: {
      ...data?.metadata,
      ...data?.data?.[periodKey]?.metadata
    },
    isLoading,
    error,
    refetch,
  };
}