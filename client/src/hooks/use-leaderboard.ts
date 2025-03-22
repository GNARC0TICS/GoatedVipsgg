import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useLoading } from "@/contexts/LoadingContext";

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
  lastUpdate?: string;
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
    [key: string]: PeriodData; // Add index signature to allow string indexing
  };
};

// Error class for API-specific errors
class LeaderboardAPIError extends Error {
  status: number;
  details: string;

  constructor(message: string, status: number, details: string) {
    super(message);
    this.name = "LeaderboardAPIError";
    this.status = status;
    this.details = details;
  }
}

// Create a constant key for the affiliate stats endpoint to avoid string duplication
export const AFFILIATE_STATS_KEY = "/api/affiliate/stats";

export function useLeaderboard(timePeriod: TimePeriod, page: number = 1) {
  const queryClient = useQueryClient();
  const { startLoadingFor, stopLoadingFor, isLoadingFor } = useLoading();
  const loadingKey = `leaderboard-${timePeriod}`;

  // Create a state for detailed error information
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);

  // Track fetch attempts for better error handling
  const fetchAttemptsRef = useRef(0);

  useEffect(() => {
    // Reset error details when time period changes
    setErrorDetails(null);
    fetchAttemptsRef.current = 0;

    // Start loading when period changes
    if (!isLoadingFor(loadingKey)) {
      startLoadingFor(loadingKey, "spinner", 500);
    }

    return () => {
      // Clean up loading state when component unmounts or period changes
      if (isLoadingFor(loadingKey)) {
        stopLoadingFor(loadingKey);
      }
    };
  }, [timePeriod, loadingKey, startLoadingFor, stopLoadingFor, isLoadingFor]);

  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    // Unique key for React Query cache - changes when time period or page changes
    queryKey: [AFFILIATE_STATS_KEY, timePeriod, page],
    queryFn: async () => {
      try {
        console.log(`Fetching leaderboard data for period: ${timePeriod}, page: ${page}`);
        fetchAttemptsRef.current += 1;

        // Start loading state if not already loading
        if (!isLoadingFor(loadingKey)) {
          startLoadingFor(loadingKey, "spinner", 500);
        }

        // Check if we already have the data in the query cache
        const existingData = queryClient.getQueryData<APIResponse>([
          AFFILIATE_STATS_KEY,
        ]);

        if (existingData && !isInitialLoadRef.current) {
          console.log('Using cached leaderboard data');
          return existingData;
        }

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('Request timeout reached, aborting');
          controller.abort();
        }, 15000); // Increased timeout to 15 seconds

        try {
          // Only make one API call with no time period parameter, and get all data at once
          const url = `${AFFILIATE_STATS_KEY}?page=${page}&limit=100&_t=${Date.now()}`;
          console.log(`Making API call to ${url}`);

          // Try multiple endpoints with fallbacks
          const endpoints = [
            url,
            // Add fallback endpoints if needed
            `/api/affiliate/stats/fallback?page=${page}&limit=100&_t=${Date.now()}`
          ];

          let response = null;
          let errorMessages = [];

          // Try each endpoint until one succeeds
          for (const endpoint of endpoints) {
            try {
              console.log(`Attempting to fetch from: ${endpoint}`);
              response = await fetch(endpoint, {
                headers: {
                  Accept: "application/json",
                },
                // Add cache control headers to prevent browser caching
                cache: "no-cache",
                signal: controller.signal,
              });

              if (response.ok) {
                console.log(`Successfully fetched from: ${endpoint}`);
                break; // Exit the loop if successful
              } else {
                const errorText = await response.text();
                errorMessages.push(`API error (${response.status}) from ${endpoint}: ${errorText}`);
                console.error(errorMessages[errorMessages.length - 1]);
                response = null; // Reset response to try next endpoint
              }
            } catch (endpointError) {
              errorMessages.push(`Failed to fetch from ${endpoint}: ${endpointError instanceof Error ? endpointError.message : String(endpointError)}`);
              console.error(errorMessages[errorMessages.length - 1]);
            }
          }

          clearTimeout(timeoutId);

          // If all endpoints failed
          if (!response || !response.ok) {
            console.error('All endpoints failed:', errorMessages.join('; '));
            setErrorDetails(errorMessages.join('; '));

            // Check if we have existing data we can use as fallback
            if (existingData) {
              console.log('Using existing data as fallback due to API error');
              return existingData;
            }

            // Create fallback data structure
            console.log('Creating fallback data structure');
            return createFallbackData();
          }

          const freshData = (await response.json()) as APIResponse;
          console.log('Received fresh leaderboard data');

          // Validate the data structure
          if (!freshData || !freshData.data) {
            console.error('Invalid API response structure');
            setErrorDetails('Invalid API response structure');

            // Check if we have existing data we can use as fallback
            if (existingData) {
              console.log('Using existing data as fallback due to invalid response');
              return existingData;
            }

            // Create fallback data structure
            console.log('Creating fallback data structure');
            return createFallbackData();
          }

          // Validate period data exists
          if (!freshData.data[timePeriod]) {
            console.error(`Missing data for period: ${timePeriod}`);
            setErrorDetails(`Missing data for period: ${timePeriod}`);

            // Create empty data structure for the missing period
            freshData.data[timePeriod] = { data: [] };
          }

          // Ensure each entry has the expected structure
          const validPeriods = ['today', 'weekly', 'monthly', 'all_time'];
          validPeriods.forEach(period => {
            if (!freshData.data[period]) {
              freshData.data[period] = { data: [] };
            }

            if (Array.isArray(freshData.data[period].data)) {
              freshData.data[period].data = freshData.data[period].data.map((entry: any) => {
                // Ensure entry has required fields
                if (!entry.uid) entry.uid = `unknown-${Math.random().toString(36).substring(2, 9)}`;
                if (!entry.name) entry.name = 'Unknown Player';
                if (!entry.wagered) {
                  entry.wagered = {
                    today: 0,
                    this_week: 0,
                    this_month: 0,
                    all_time: 0
                  };
                }
                return entry as Entry;
              });
            } else {
              // If data is not an array, initialize it as an empty array
              freshData.data[period].data = [];
            }
          });

          // Cache the full response
          queryClient.setQueryData([AFFILIATE_STATS_KEY], freshData);

          // Mark initial load as complete
          isInitialLoadRef.current = false;

          return freshData;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);

        if (err instanceof LeaderboardAPIError) {
          setErrorDetails(`API Error (${err.status}): ${err.details}`);
        } else if (err instanceof DOMException && err.name === 'AbortError') {
          setErrorDetails('Request timed out. Please try again later.');
        } else {
          setErrorDetails(err instanceof Error ? err.message : String(err));
        }

        // Check if we have existing data we can use as fallback
        const existingData = queryClient.getQueryData<APIResponse>([AFFILIATE_STATS_KEY]);
        if (existingData) {
          console.log('Using existing data as fallback due to error');
          return existingData;
        }

        // Create fallback data structure with sample data for better user experience
        console.log('Creating fallback data structure');
        return createFallbackData();
      } finally {
        // Stop loading regardless of success or failure
        if (isLoadingFor(loadingKey)) {
          stopLoadingFor(loadingKey);
        }
      }
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 55000, // Just under the refetch interval
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Add retry logic
    retry: 5, // Increased retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Helper function to create fallback data
  function createFallbackData(): APIResponse {
    return {
      status: "success",
      metadata: {
        totalUsers: 0,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { data: [] },
        weekly: { data: [] },
        monthly: { data: [] },
        all_time: { data: [] },
      },
    };
  }

  function createFallbackDataWithSamples(): APIResponse {
    return createFallbackData(); // Use empty data instead of fake samples
  }

  const periodKey = timePeriod;

  // Log when data changes
  useEffect(() => {
    if (data) {
      console.log(`Leaderboard data updated for period: ${timePeriod}`);
    }
    if (error) {
      console.error(`Error loading leaderboard data for ${timePeriod}:`, error);
    }
  }, [data, error, timePeriod]);

  // Create a fallback empty data structure if data is missing
  const fallbackData: Entry[] = [];

  // Extract the data for the requested time period, with fallback
  const periodData = data?.data?.[periodKey]?.data || fallbackData;

  // Stop loading when data is available or on error
  useEffect(() => {
    if ((!isLoading && data) || error) {
      if (isLoadingFor(loadingKey)) {
        stopLoadingFor(loadingKey);
      }
    }
  }, [isLoading, data, error, loadingKey, isLoadingFor, stopLoadingFor]);

  return {
    data: periodData,
    isLoading: isLoading || isLoadingFor(loadingKey),
    error,
    errorDetails,
    refetch,
    totalUsers: data?.metadata?.totalUsers || 0,
    lastUpdated: data?.metadata?.lastUpdated || "",
    fetchAttempts: fetchAttemptsRef.current
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