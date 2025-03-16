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

// Custom hook to access just the totals from the affiliate stats
export function useWagerTotals() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['wager-total'],
    queryFn: async () => {
      // Try to use existing data first
      const existingData = queryClient.getQueryData<APIResponse>([AFFILIATE_STATS_KEY]);

      if (existingData) {
        const total = existingData?.data?.all_time?.data?.reduce((sum, entry) => {
          return sum + (entry?.wagered?.all_time || 0);
        }, 0);
        return total || 2147483;
      }

      // If no existing data, fetch new data
      const response = await fetch(AFFILIATE_STATS_KEY);
      const data = await response.json();

      // Store the full response in the query cache
      queryClient.setQueryData([AFFILIATE_STATS_KEY], data);

      const total = data?.data?.all_time?.data?.reduce((sum, entry) => {
        return sum + (entry?.wagered?.all_time || 0);
      }, 0);

      return total || 2147483;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
}