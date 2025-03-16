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
    staleTime: 300000, // Consider data fresh for 5 minutes
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

// Define TimePeriod type for TypeScript typechecking
export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";

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

export function useLeaderboard(timePeriod: TimePeriod, page: number = 1) {
  const queryClient = useQueryClient();
  
  // Cast to any type to avoid TypeScript errors with accessing nested properties
  // while still preserving the core functionality
  const { data, isLoading, error, refetch } = useQuery<any, Error>({
    // Unique key for React Query cache - changes when time period or page changes
    queryKey: [AFFILIATE_STATS_KEY, timePeriod, page],
    queryFn: async () => {
      // Always fetch fresh data to ensure we have current information
      // This avoids stale data issues when switching between periods
      try {
        const response = await fetch(`${AFFILIATE_STATS_KEY}?page=${page}&limit=10`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn(`Stats API returned status: ${response.status}`);
          
          // Try to use cached data as fallback
          const existingData = queryClient.getQueryData<any>([AFFILIATE_STATS_KEY]);
          if (existingData) {
            console.log("Using cached data as fallback");
            return existingData;
          }
          
          // If we don't have cached data either, throw the error
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const freshData = await response.json();
        return freshData;
      } catch (err) {
        console.error("Error fetching leaderboard data:", err);
        // Return an empty valid structure that the UI can handle
        return {
          status: "error",
          metadata: { totalUsers: 0, lastUpdated: "" },
          data: {
            today: { data: [] },
            weekly: { data: [] },
            monthly: { data: [] },
            all_time: { data: [] }
          }
        };
      }
    },
    refetchInterval: 60000,  // Reduce to 1 minute to ensure we get fresh data
    staleTime: 30000,        // Consider data stale after 30 seconds
    gcTime: 2 * 60 * 1000,   // Keep cached data for 2 minutes
    retry: 2,                // Reduce retry attempts
  });

  // Function to prefetch data for different time periods
  const prefetchOtherPeriods = async () => {
    if (!data) return;
    
    const periods: TimePeriod[] = ["today", "weekly", "monthly", "all_time"];
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

  // Log what we received from the API and what we're returning
  console.log("useLeaderboard hook:", { 
    timePeriod,
    rawData: data,
    dataForPeriod: data?.data?.[timePeriod]?.data,
    isLoading,
    error
  });
  
  // Handle different potential data structures to ensure we always return valid data
  let leaderboardData = [];
  let totalUsersCount = 0;
  let lastUpdatedInfo = "";
  
  try {
    // Check for the standard nested structure
    if (data?.data?.[timePeriod]?.data && Array.isArray(data.data[timePeriod].data)) {
      leaderboardData = data.data[timePeriod].data;
    }
    // Alternative: check if data is directly in the response as an array
    else if (data?.data && Array.isArray(data.data)) {
      leaderboardData = data.data;
    }
    // Check for data directly under the time period key
    else if (data?.[timePeriod] && Array.isArray(data[timePeriod])) {
      leaderboardData = data[timePeriod];
    }
    
    // Get metadata if available
    totalUsersCount = data?.metadata?.totalUsers || 0;
    lastUpdatedInfo = data?.metadata?.lastUpdated || "";
  } catch (err) {
    console.error("Error processing leaderboard data:", err);
  }
  
  // Always return a valid data structure, even if parts are empty
  return {
    data: leaderboardData,
    isLoading: isLoading && !error,  // If we have an error, we're not loading
    error,
    refetch,
    totalUsers: totalUsersCount,
    lastUpdated: lastUpdatedInfo,
  };
}

// This space intentionally left empty to remove the duplicate hook