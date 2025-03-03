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
};

type LeaderboardPeriodData = {
  data: LeaderboardEntry[];
};

type APIResponse = {
  status: string;
  metadata?: {
    totalUsers: number;
    lastUpdated?: string;
  };
  data: {
    today: LeaderboardPeriodData;
    weekly: LeaderboardPeriodData;
    monthly: LeaderboardPeriodData;
    all_time: LeaderboardPeriodData;
  };
  message?: string;
};

export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";

export function useLeaderboard(
  timePeriod: TimePeriod = "today",
  page: number = 0,
) {
  const [ws, setWs] = React.useState<WebSocket | null>(null);
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);
  // Use a ref to store the refetch function to avoid circular dependencies
  const refetchRef = React.useRef<() => void>(() => {});
  
  // Primary data fetch hook using React Query
  // This is the main entry point for leaderboard data in the frontend
  const queryResult = useQuery<APIResponse, Error>({
    // Unique key for React Query cache - changes when time period or page changes
    queryKey: ["/api/affiliate/stats", timePeriod, page],
    queryFn: async () => {
      try {
        // Skip cache for now to simplify
        const response = await fetch(`/api/affiliate/stats?page=${page}&limit=10`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json() as APIResponse;
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        // Return empty data structure to prevent UI errors
        return {
          status: "error",
          message: "Failed to fetch data",
          data: {
            today: { data: [] },
            weekly: { data: [] },
            monthly: { data: [] },
            all_time: { data: [] }
          },
          metadata: {
            totalUsers: 0
          }
        } as APIResponse;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 3,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;
  
  // Update the ref whenever refetch changes
  React.useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Setup WebSocket connection
  React.useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let wsInstance: WebSocket | null = null;
    let isConnecting = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const connect = () => {
      if (isConnecting) return;
      isConnecting = true;

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/leaderboard`;
        
        if (retryCount >= MAX_RETRIES) {
          console.log('WebSocket max retries reached, falling back to polling');
          isConnecting = false;
          return;
        }
        
        wsInstance = new WebSocket(wsUrl);

        wsInstance.onopen = () => {
          console.log('WebSocket connected successfully');
          retryCount = 0;
          isConnecting = false;
          setWs(wsInstance);
        };

        wsInstance.onmessage = (event: MessageEvent) => {
          try {
            const update = JSON.parse(event.data);
            if (update.type === "LEADERBOARD_UPDATE") {
              // Use the ref to avoid dependency issues
              refetchRef.current();
            }
          } catch (err) {
            console.error('WebSocket message parsing error:', err);
          }
        };

        wsInstance.onclose = () => {
          isConnecting = false;
          retryCount++;
          const reconnectDelay = Math.min(3000 * Math.pow(1.5, retryCount), 15000);
          reconnectTimer = setTimeout(connect, reconnectDelay);
        };

        wsInstance.onerror = () => {
          console.error('WebSocket connection error');
          isConnecting = false;
          if (wsInstance) wsInstance.close();
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        isConnecting = false;
      }
    };

    // Start connection
    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsInstance) {
        wsInstance.onclose = null; // Prevent reconnect on intentional close
        wsInstance.close();
      }
    };
  }, []);

  const periodKey =
    timePeriod === "weekly"
      ? "weekly"
      : timePeriod === "monthly"
        ? "monthly"
        : timePeriod === "today"
          ? "today"
          : "all_time";

  const sortedData = data?.data?.[periodKey]?.data?.map((entry: LeaderboardEntry) => {
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
  };
}