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

  // Setup WebSocket connection with improved error handling and fallback
  React.useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let wsInstance: WebSocket | null = null;
    let isConnecting = false;
    let retryCount = 0;
    let pingTimer: NodeJS.Timeout;
    const MAX_RETRIES = 5; // Increased retries
    const INITIAL_RETRY_DELAY = 1000; // 1 second
    const MAX_RETRY_DELAY = 10000; // 10 seconds
    const PING_INTERVAL = 20000; // 20 seconds

    // Function to send ping to keep connection alive
    const sendPing = () => {
      if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
        try {
          // Send a ping message to keep connection alive
          wsInstance.send(JSON.stringify({ type: "PING", timestamp: Date.now() }));
        } catch (err) {
          console.log("Error sending ping, will reconnect");
          if (wsInstance) wsInstance.close();
        }
      }
    };

    const connect = () => {
      if (isConnecting) return;
      isConnecting = true;

      try {
        // Clear existing ping timer if any
        if (pingTimer) clearInterval(pingTimer);
        
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/leaderboard`;
        
        if (retryCount >= MAX_RETRIES) {
          console.log('WebSocket max retries reached, falling back to polling only');
          isConnecting = false;
          // After max retries, we still refetch data regularly via the React Query's refetchInterval
          return;
        }
        
        wsInstance = new WebSocket(wsUrl);

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (wsInstance && wsInstance.readyState !== WebSocket.OPEN) {
            console.log('WebSocket connection timed out, retrying...');
            if (wsInstance) wsInstance.close();
          }
        }, 5000);

        wsInstance.onopen = () => {
          console.log('WebSocket connected successfully');
          clearTimeout(connectionTimeout);
          retryCount = 0;
          isConnecting = false;
          setWs(wsInstance);
          
          // Start regular pings to keep the connection alive
          pingTimer = setInterval(sendPing, PING_INTERVAL);
        };

        wsInstance.onmessage = (event: MessageEvent) => {
          try {
            const update = JSON.parse(event.data);
            if (update.type === "LEADERBOARD_UPDATE") {
              // Use the ref to avoid dependency issues
              refetchRef.current();
            } else if (update.type === "CONNECTED") {
              console.log(`Connected to WebSocket server with client ID: ${update.clientId}`);
            } else if (update.type === "PONG") {
              // Server responded to our ping
              console.log("Received pong from server");
            }
          } catch (err) {
            console.error('WebSocket message parsing error:', err);
          }
        };

        wsInstance.onclose = (event) => {
          clearTimeout(connectionTimeout);
          clearInterval(pingTimer);
          isConnecting = false;
          
          console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
          
          // If the connection was closed cleanly or we've reached max retries, don't reconnect
          if (event.wasClean) {
            console.log('WebSocket closed cleanly');
            return;
          }
          
          retryCount++;
          // Exponential backoff with jitter for reconnection
          const baseDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(1.5, retryCount), MAX_RETRY_DELAY);
          const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
          const reconnectDelay = baseDelay + jitter;
          
          console.log(`Attempting to reconnect in ${Math.round(reconnectDelay/1000)}s (retry ${retryCount}/${MAX_RETRIES})`);
          reconnectTimer = setTimeout(connect, reconnectDelay);
        };

        wsInstance.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          // Don't close the connection here, let the onclose handler deal with reconnection
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        isConnecting = false;
        
        // Try to reconnect even after an error in connection creation
        retryCount++;
        const reconnectDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(1.5, retryCount), MAX_RETRY_DELAY);
        reconnectTimer = setTimeout(connect, reconnectDelay);
      }
    };

    // Start connection
    connect();

    // Cleanup function
    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      if (wsInstance) {
        wsInstance.onclose = null; // Prevent reconnect on intentional close
        try {
          wsInstance.close(1000, "Component unmounting");
        } catch (err) {
          console.log("Error during websocket cleanup", err);
        }
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