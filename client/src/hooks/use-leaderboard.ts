import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

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
  status: "success" | "error" | "transition";
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
  message?: string;
};

export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";

const defaultData: APIResponse = {
  status: "success",
  metadata: {
    totalUsers: 0,
    lastUpdated: new Date().toISOString()
  },
  data: {
    today: { data: [] },
    weekly: { data: [] },
    monthly: { data: [] },
    all_time: { data: [] }
  }
};

export function useLeaderboard(timePeriod: TimePeriod = "today", page: number = 0) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [ws, setWs] = React.useState<WebSocket | null>(null);
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout>();
  const wsReconnectAttempts = React.useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // WebSocket connection management
  React.useEffect(() => {
    if (!user) {
      console.log('No user authenticated, skipping WebSocket connection');
      return;
    }

    const connect = () => {
      if (wsReconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max WebSocket reconnection attempts reached');
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      console.log(`Connecting to WebSocket at ${protocol}//${host}/ws`);
      const ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onmessage = (event: MessageEvent) => {
        try {
          const update = JSON.parse(event.data);
          console.log('WebSocket message received:', update);
          if (update.type === "LEADERBOARD_UPDATE") {
            console.log('Received leaderboard update:', update);
            refetch();
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      ws.onclose = () => {
        wsReconnectAttempts.current += 1;
        console.log('WebSocket connection closed, attempting to reconnect...');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

      ws.onopen = () => {
        wsReconnectAttempts.current = 0;
        console.log('WebSocket connection established');
      };

      setWs(ws);
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [user]);

  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ["/api/affiliate/stats", timePeriod, page],
    queryFn: async () => {
      try {
        if (!user) {
          console.log('No authenticated user, skipping leaderboard fetch');
          return defaultData;
        }

        console.log('Fetching leaderboard data...');
        const response = await fetch(`/api/affiliate/stats?page=${page}&limit=10`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Leaderboard fetch failed:', response.status, errorData);
          if (response.status === 401) {
            return defaultData;
          }
          throw new Error(errorData.message || `Failed to load leaderboard data`);
        }

        const responseData = await response.json();
        console.log('Received leaderboard data:', responseData);

        // Validate and normalize data structure
        if (!responseData?.data || !responseData.data[timePeriod]?.data) {
          console.error('Invalid data structure received:', responseData);
          return defaultData;
        }

        return responseData;
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        toast({
          title: "Error loading leaderboard",
          description: error instanceof Error ? error.message : "Failed to load leaderboard data",
          variant: "destructive",
        });
        return defaultData;
      }
    },
    enabled: !!user,
    refetchInterval: 60000,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const periodKey = timePeriod;
  const periodWagerKey =
    timePeriod === "weekly"
      ? "this_week"
      : timePeriod === "monthly"
        ? "this_month"
        : timePeriod === "today"
          ? "today"
          : "all_time";

  const sortedData = React.useMemo(() => {
    if (!data?.data?.[periodKey]?.data) return [];

    return data.data[periodKey].data.map((entry: LeaderboardEntry) => {
      const prevEntry = previousData.find((p) => p.uid === entry.uid);
      const currentWager = entry.wagered?.[periodWagerKey] || 0;
      const previousWager = prevEntry?.wagered?.[periodWagerKey] || 0;

      return {
        ...entry,
        isWagering: currentWager > previousWager,
        wagerChange: currentWager - previousWager,
        wagered: {
          ...entry.wagered,
          [periodWagerKey]: currentWager
        },
        lastUpdate: entry.lastUpdate
      };
    });
  }, [data, periodKey, periodWagerKey, previousData]);

  useEffect(() => {
    if (data?.data?.[periodKey]?.data) {
      setPreviousData(data.data[periodKey].data);
    }
  }, [data, periodKey]);

  return {
    data: sortedData,
    metadata: data?.metadata,
    status: data?.status,
    isLoading,
    error,
    refetch,
  };
}