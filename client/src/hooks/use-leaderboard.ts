import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Wager = {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
};

type Entry = {
  uid: string;
  name: string;
  wagered: Wager;
};

type PeriodData = {
  data: Entry[];
};

type PlatformStats = {
  totalWagered: number;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  playerCount: number;
  timestamp: string;
};

export const useHistoricalStats = () => {
  return useQuery<PlatformStats>({
    queryKey: ['platformStats'],
    queryFn: async () => {
      const response = await fetch('/api/stats/historical');
      if (!response.ok) throw new Error('Failed to fetch historical stats');
      return response.json();
    },
    staleTime: 60000, // Consider data fresh for 1 minute
  });
};

// Consolidated useWagerTotals hook
export const useWagerTotals = () => {
  const { data: historicalStats } = useHistoricalStats();
  const { data: currentStats } = useQuery<PlatformStats>({
    queryKey: ['platformStats', 'current'],
    queryFn: async () => {
      const response = await fetch('/api/stats/current');
      if (!response.ok) throw new Error('Failed to fetch current stats');
      return response.json();
    },
  });

  return {
    data: currentStats?.totalWagered || historicalStats?.totalWagered || 0,
    isLoading: !historicalStats && !currentStats,
  };
};

type APIResponse = {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
  };
  data: {
    today: PeriodData;
    weekly: PeriodData;
    monthly: PeriodData;
    all_time: PeriodData;
  };
};

// Create a constant key for the affiliate stats endpoint to avoid string duplication
export const AFFILIATE_STATS_KEY = "/api/affiliate/stats";

export function useLeaderboard(timePeriod: string, page: number = 1) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<APIResponse, Error>({
    // Unique key for React Query cache - changes when time period or page changes
    queryKey: [AFFILIATE_STATS_KEY, timePeriod, page],
    queryFn: async () => {
      // Check if we already have the data in the query cache
      const existingData = queryClient.getQueryData<APIResponse>([AFFILIATE_STATS_KEY]);
      if (existingData) {
        return existingData;
      }

      const response = await fetch(`${AFFILIATE_STATS_KEY}?page=${page}&limit=10`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const freshData = await response.json() as APIResponse;
      return freshData;
    },
    refetchInterval: 60000, // Increased to 1 minute
    staleTime: 55000,       // Just under the refetch interval
    cacheTime: 300000,      // 5 minutes
    retry: 3,
    gcTime: 5 * 60 * 1000,
  });

  const periodKey =
    timePeriod === "weekly"
      ? "weekly"
      : timePeriod === "monthly"
        ? "monthly"
        : timePeriod === "today"
          ? "today"
          : "all_time";

  // Function to prefetch data for different time periods
  const prefetchOtherPeriods = async () => {
    const periods = ["today", "weekly", "monthly", "all_time"];
    for (const period of periods) {
      if (period !== timePeriod) {
        await queryClient.prefetchQuery({
          queryKey: [AFFILIATE_STATS_KEY, period, page],
          queryFn: () => Promise.resolve(data), // Use existing data
          staleTime: 55000,
        });
      }
    }
  };

  // If we have data, prefetch for other periods
  if (data && !isLoading) {
    prefetchOtherPeriods();
  }

  return {
    data: data?.data[periodKey]?.data || [],
    isLoading,
    error,
    refetch,
    totalUsers: data?.metadata.totalUsers || 0,
    lastUpdated: data?.metadata.lastUpdated || "",
  };
}

// This space intentionally left empty to remove the duplicate hook