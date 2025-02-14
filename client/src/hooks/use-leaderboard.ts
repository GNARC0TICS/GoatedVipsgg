import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";

export type WageredData = {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
};

export type LeaderboardEntry = {
  uid: string;
  name: string;
  wagered: WageredData;
  wagerChange?: number;
  isWagering?: boolean;
  lastUpdate?: string;
};

export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";

const defaultWageredData: WageredData = {
  today: 0,
  this_week: 0,
  this_month: 0,
  all_time: 0
};

export function useLeaderboard(
  timePeriod: TimePeriod = "today",
  page: number = 0,
) {
  const [ws, setWs] = React.useState<WebSocket | null>(null);
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);

  // WebSocket connection management
  React.useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let wsInstance: WebSocket | null = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsInstance = new WebSocket(`${protocol}//${window.location.host}/ws/leaderboard`);

        wsInstance.onmessage = (event: MessageEvent) => {
          try {
            const update = JSON.parse(event.data);
            if (update.type === "LEADERBOARD_UPDATE") {
              refetch();
            }
          } catch (err) {
            console.error('WebSocket message parsing error:', err);
          }
        };

        wsInstance.onclose = () => {
          console.log('WebSocket closed, attempting reconnect...');
          reconnectTimer = setTimeout(connect, 3000);
        };

        wsInstance.onerror = (error: Event) => {
          console.error('WebSocket error:', error);
          if (wsInstance) {
            wsInstance.close();
          }
        };

        setWs(wsInstance);
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsInstance) {
        wsInstance.close();
      }
    };
  }, []);

  // Primary data fetch hook using React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/affiliate/stats", timePeriod, page],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/affiliate/stats?period=${timePeriod}&page=${page}&limit=10`,
          {
            headers: {
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const freshData = await response.json();

        // Ensure the data has the expected structure
        if (!freshData?.data || typeof freshData.data !== 'object') {
          throw new Error('Invalid data structure received from API');
        }

        // Cache the data in sessionStorage
        sessionStorage.setItem(`leaderboard-${timePeriod}-${page}`, JSON.stringify({
          data: freshData,
          timestamp: Date.now()
        }));

        return freshData;
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        throw error;
      }
    },
    refetchInterval: 60000, // Poll every minute
    staleTime: 45000, // Consider data fresh for 45 seconds
    retry: 3,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const periodKey = timePeriod === "weekly" 
    ? "weekly" 
    : timePeriod === "monthly"
      ? "monthly"
      : timePeriod === "today"
        ? "today"
        : "all_time";

  // Transform and enhance the data with wager changes
  const sortedData = React.useMemo(() => {
    if (!data?.data?.[periodKey]?.data) {
      console.warn('No data available for period:', periodKey);
      return [];
    }

    return data.data[periodKey].data.map((entry: LeaderboardEntry) => {
      const prevEntry = previousData.find((p) => p.uid === entry.uid);

      // Ensure wagered data has all required fields
      const wagered = {
        ...defaultWageredData,
        ...(entry.wagered || {})
      };

      const currentWager = wagered[
        timePeriod === "weekly"
          ? "this_week"
          : timePeriod === "monthly"
            ? "this_month"
            : timePeriod === "today"
              ? "today"
              : "all_time"
      ] || 0;

      const previousWager = prevEntry
        ? (prevEntry.wagered?.[
            timePeriod === "weekly"
              ? "this_week"
              : timePeriod === "monthly"
                ? "this_month"
                : timePeriod === "today"
                  ? "today"
                  : "all_time"
          ] || 0)
        : 0;

      return {
        ...entry,
        wagered,
        isWagering: currentWager > previousWager,
        wagerChange: currentWager - previousWager,
        lastUpdate: new Date().toISOString()
      };
    });
  }, [data, periodKey, previousData, timePeriod]);

  // Update previous data for change tracking
  useEffect(() => {
    if (data?.data?.[periodKey]?.data) {
      setPreviousData(data.data[periodKey].data);
    }
  }, [data, periodKey]);

  return {
    data: sortedData,
    metadata: data?.metadata,
    isLoading,
    error,
    refetch,
  };
}