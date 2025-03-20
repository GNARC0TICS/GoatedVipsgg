import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export type TimePeriod = "today" | "weekly" | "monthly" | "all_time";

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

export function useLeaderboard(timePeriod: TimePeriod, page: number = 1) {
  const queryClient = useQueryClient();
  
  // Create a state for detailed error information
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    // Unique key for React Query cache - changes when time period or page changes
    queryKey: [AFFILIATE_STATS_KEY, timePeriod, page],
    queryFn: async () => {
      try {
        console.log(`Fetching leaderboard data for period: ${timePeriod}, page: ${page}`);
        
        // Check if we already have the data in the query cache
        const existingData = queryClient.getQueryData<APIResponse>([
          AFFILIATE_STATS_KEY,
        ]);
        
        if (existingData) {
          console.log('Using cached leaderboard data');
          return existingData;
        }

        // Only make one API call with no time period parameter, and get all data at once
        console.log(`Making API call to ${AFFILIATE_STATS_KEY}?page=${page}&limit=100`);
        const response = await fetch(
          `${AFFILIATE_STATS_KEY}?page=${page}&limit=100`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error (${response.status}): ${errorText}`);
          setErrorDetails(`Status: ${response.status}, Details: ${errorText}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const freshData = (await response.json()) as APIResponse;
        console.log('Received fresh leaderboard data:', freshData);
        
        // Validate the data structure
        if (!freshData || !freshData.data) {
          console.error('Invalid API response structure:', freshData);
          setErrorDetails('Invalid API response structure');
          throw new Error('Invalid API response structure');
        }
        
        // Cache the full response
        queryClient.setQueryData([AFFILIATE_STATS_KEY], freshData);
        
        return freshData;
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setErrorDetails(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 55000, // Just under the refetch interval
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Add retry logic
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const periodKey = timePeriod;
  
  // Log when data changes
  useEffect(() => {
    if (data) {
      console.log(`Leaderboard data updated for period: ${timePeriod}`);
    }
  }, [data, timePeriod]);

  // Create a fallback empty data structure if data is missing
  const fallbackData: Entry[] = [];
  
  // Extract the data for the requested time period, with fallback
  const periodData = data?.data?.[periodKey]?.data || fallbackData;

  return {
    data: periodData,
    isLoading,
    error,
    errorDetails,
    refetch,
    totalUsers: data?.metadata?.totalUsers || 0,
    lastUpdated: data?.metadata?.lastUpdated || "",
  };
}

// Custom hook to access just the totals from the affiliate stats
export function useWagerTotals() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["wager-total"],
    queryFn: async () => {
      // Try to use existing data first
      const existingData = queryClient.getQueryData<APIResponse>([
        AFFILIATE_STATS_KEY,
      ]);

      if (existingData) {
        const total = existingData?.data?.all_time?.data?.reduce(
          (sum: number, entry: Entry) => {
            return sum + (entry?.wagered?.all_time || 0);
          },
          0,
        );
        return total || 0;
      }

      // If no existing data, fetch new data
      const response = await fetch(AFFILIATE_STATS_KEY);
      const data = await response.json() as APIResponse;

      // Store the full response in the query cache
      queryClient.setQueryData([AFFILIATE_STATS_KEY], data);

      const total = data?.data?.all_time?.data?.reduce((sum: number, entry: Entry) => {
        return sum + (entry?.wagered?.all_time || 0);
      }, 0);

      return total || 0;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
}
