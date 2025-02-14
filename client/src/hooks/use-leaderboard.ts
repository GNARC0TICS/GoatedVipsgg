import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";

interface WagerData {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: number;
  isWagering?: boolean;
  wagerChange?: number;
}

export function useLeaderboard(timePeriod: TimePeriod = "today") {
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leaderboard", timePeriod],
    queryFn: async () => {
      const response = await fetch('/api/leaderboard?period=' + timePeriod);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard data: ${response.statusText}`);
      }
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 30000,
    refetchInterval: 60000
  });

  const processedData = data?.map((entry: LeaderboardEntry, index: number) => {
    const prevEntry = previousData.find(p => p.uid === entry.uid);
    return {
      ...entry,
      position: index + 1,
      isWagering: prevEntry ? entry.wagered > prevEntry.wagered : false,
      wagerChange: prevEntry ? entry.wagered - prevEntry.wagered : 0
    };
  }) || [];

  useEffect(() => {
    if (data) {
      setPreviousData(data);
    }
  }, [data]);

  return {
    data: processedData,
    isLoading,
    error,
    refetch
  };
}