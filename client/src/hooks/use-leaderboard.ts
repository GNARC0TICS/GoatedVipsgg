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

  React.useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws/leaderboard`);

    websocket.onopen = () => {
      console.log('WebSocket connection opened');
    };

    websocket.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.type === "LEADERBOARD_UPDATE") {
          refetch();
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log('WebSocket connection closed');
      // Optionally, try to reconnect
    };

    setWs(websocket);

    return () => websocket.close();
  }, []);

  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ["/api/affiliate/stats", timePeriod, page],
    queryFn: async () => {
      const response = await fetch(`/api/affiliate/stats?page=${page}&limit=10`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Leaderboard data not found");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
  });

  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);

  const periodKey = timePeriod; //Simplified period key selection

  const sortedData = data?.data[periodKey]?.data?.map((entry) => {
    const prevEntry = previousData.find((p) => p.uid === entry.uid);
    const currentWager = entry.wagered[periodKey];
    const previousWager = prevEntry ? prevEntry.wagered[periodKey] : 0;

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
    error: error as Error | null,
    refetch,
  };
}