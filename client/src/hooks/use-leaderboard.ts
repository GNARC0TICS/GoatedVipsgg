import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useLoading } from "@/contexts/LoadingContext";
import { useToast } from "@/hooks/use-toast";

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

export type APIResponse = {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
    isCached?: boolean;
    cachedAt?: string;
    servedAt?: string;
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

// Helper function to create empty fallback response data
function createEmptyFallbackResponse(): APIResponse {
  return {
    status: "error",
    metadata: {
      totalUsers: 0,
      lastUpdated: new Date().toISOString(),
      isCached: false
    },
    data: {
      today: { data: [] },
      weekly: { data: [] },
      monthly: { data: [] },
      all_time: { data: [] },
    },
  };
}

export function useLeaderboard(timePeriod: TimePeriod, page: number = 1) {
  const queryClient = useQueryClient();
  const { startLoadingFor, stopLoadingFor, isLoadingFor } = useLoading();
  const { toast } = useToast();
  const loadingKey = `leaderboard-${timePeriod}`;

  // Create a state for detailed error information
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Track if cached data is being shown
  const [isShowingCachedData, setIsShowingCachedData] = useState(false);

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);

  // Track fetch attempts for better error handling
  const fetchAttemptsRef = useRef(0);
  
  // Track if a cached data toast has been shown
  const hasShownCachedToastRef = useRef(false);

  useEffect(() => {
    // Reset error details when time period changes
    setErrorDetails(null);
    fetchAttemptsRef.current = 0;
    hasShownCachedToastRef.current = false;
    setIsShowingCachedData(false);

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
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          // Make API call
          console.log(`Making API call to ${AFFILIATE_STATS_KEY}?page=${page}&limit=100`);
          const response = await fetch(
            `${AFFILIATE_STATS_KEY}?page=${page}&limit=100`,
            {
              headers: {
                Accept: "application/json",
              },
              // Add cache control headers to prevent browser caching
              cache: "no-cache",
              signal: controller.signal
            },
          );
          
          // Clear the timeout
          clearTimeout(timeoutId);

          // Check for rate limiting
          if (response.status === 429) {
            console.warn('API rate limit exceeded. Using cached data or fallback.');
            setErrorDetails('API rate limit exceeded. Please try again later.');
            
            // If we have cached data, use it
            if (existingData) {
              console.log('Using stale cached data due to rate limiting');
              setIsShowingCachedData(true);
              
              // Show toast notification only once per session
              if (!hasShownCachedToastRef.current) {
                toast({
                  title: "Using cached data",
                  description: "We're currently showing previously loaded data due to API limitations.",
                  variant: "default"
                });
                hasShownCachedToastRef.current = true;
              }
              
              return {
                ...existingData,
                metadata: {
                  ...existingData.metadata,
                  isCached: true,
                  cachedAt: existingData.metadata.lastUpdated,
                  servedAt: new Date().toISOString()
                }
              };
            }
            
            // Otherwise create empty fallback data
            return createEmptyFallbackResponse();
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error (${response.status}): ${errorText}`);
            setErrorDetails(`Status: ${response.status}, Details: ${errorText}`);
            
            // If we have cached data, use it even if it's stale
            if (existingData) {
              console.log('Using stale cached data due to API error');
              setIsShowingCachedData(true);
              
              // Show toast notification only once per session
              if (!hasShownCachedToastRef.current) {
                toast({
                  title: "Using cached data",
                  description: "We're currently showing previously loaded data due to API issues.",
                  variant: "default"
                });
                hasShownCachedToastRef.current = true;
              }
              
              return {
                ...existingData,
                metadata: {
                  ...existingData.metadata,
                  isCached: true,
                  cachedAt: existingData.metadata.lastUpdated,
                  servedAt: new Date().toISOString()
                }
              };
            }
            
            throw new LeaderboardAPIError(
              `HTTP error! status: ${response.status}`,
              response.status,
              errorText
            );
          }

          const freshData = await response.json() as APIResponse;
          console.log('Received fresh leaderboard data');
          
          // Mark data as not cached
          setIsShowingCachedData(false);
          
          // Validate the data structure
          if (!freshData || !freshData.data) {
            console.error('Invalid API response structure:', freshData);
            setErrorDetails('Invalid API response structure');
            
            // If we have cached data, use it even if it's stale
            if (existingData) {
              console.log('Using stale cached data due to invalid response');
              setIsShowingCachedData(true);
              
              // Show toast notification only once per session
              if (!hasShownCachedToastRef.current) {
                toast({
                  title: "Using cached data",
                  description: "We're currently showing previously loaded data due to API data issues.",
                  variant: "default"
                });
                hasShownCachedToastRef.current = true;
              }
              
              return {
                ...existingData,
                metadata: {
                  ...existingData.metadata,
                  isCached: true,
                  cachedAt: existingData.metadata.lastUpdated,
                  servedAt: new Date().toISOString()
                }
              };
            }
            
            // Otherwise create empty fallback data
            return createEmptyFallbackResponse();
          }
          
          // Validate period data exists
          if (!freshData.data[timePeriod]) {
            console.log(`Missing data for period: ${timePeriod}, creating empty array`);
            
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
          // Clear the timeout if there was an error
          clearTimeout(timeoutId);
          
          // Handle timeout errors
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            console.error('Request timed out after 10 seconds');
            setErrorDetails('Request timed out. Please try again later.');
            
            // If we have cached data, use it even if it's stale
            if (existingData) {
              console.log('Using stale cached data due to timeout');
              setIsShowingCachedData(true);
              
              // Show toast notification only once per session
              if (!hasShownCachedToastRef.current) {
                toast({
                  title: "Using cached data",
                  description: "We're currently showing previously loaded data due to connection issues.",
                  variant: "default"
                });
                hasShownCachedToastRef.current = true;
              }
              
              return {
                ...existingData,
                metadata: {
                  ...existingData.metadata,
                  isCached: true,
                  cachedAt: existingData.metadata.lastUpdated,
                  servedAt: new Date().toISOString()
                }
              };
            }
            
            // Otherwise create empty fallback data
            return createEmptyFallbackResponse();
          }
          
          // Re-throw other fetch errors
          throw fetchError;
        }
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);

        if (err instanceof LeaderboardAPIError) {
          setErrorDetails(`API Error (${err.status}): ${err.details}`);
        } else {
          setErrorDetails(err instanceof Error ? err.message : String(err));
        }
        
        // Check if we have existing data to use as fallback
        const existingData = queryClient.getQueryData<APIResponse>([AFFILIATE_STATS_KEY]);
        if (existingData) {
          console.log('Using existing data as fallback due to error');
          setIsShowingCachedData(true);
          
          // Show toast notification only once per session
          if (!hasShownCachedToastRef.current) {
            toast({
              title: "Using cached data",
              description: "We're currently showing previously loaded data due to connection issues.",
              variant: "default"
            });
            hasShownCachedToastRef.current = true;
          }
          
          return {
            ...existingData,
            metadata: {
              ...existingData.metadata,
              isCached: true,
              cachedAt: existingData.metadata.lastUpdated,
              servedAt: new Date().toISOString()
            }
          };
        }
        
        // If no cache exists, return empty structure
        return createEmptyFallbackResponse();
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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const periodKey = timePeriod;

  // Log when data changes
  useEffect(() => {
    if (data) {
      console.log(`Leaderboard data updated for period: ${timePeriod}`);
      
      // Show notification if we're using cached data
      if (data.metadata.isCached && !hasShownCachedToastRef.current) {
        toast({
          title: "Using cached data",
          description: "We're currently showing previously loaded data while trying to fetch the latest information.",
          variant: "default"
        });
        hasShownCachedToastRef.current = true;
      }
    }
    if (error) {
      console.error(`Error loading leaderboard data for ${timePeriod}:`, error);
    }
  }, [data, error, timePeriod, toast]);

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
    isCached: isShowingCachedData || data?.metadata?.isCached || false,
    cachedAt: data?.metadata?.cachedAt,
    servedAt: data?.metadata?.servedAt,
    fetchAttempts: fetchAttemptsRef.current
  };
}

// Custom hook to access just the totals from the affiliate stats
export function useWagerTotals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const hasShownCachedToastRef = useRef(false);

  const query = useQuery({
    queryKey: ["wager-total"],
    queryFn: async () => {
      // Try to use existing data first
      const existingData = queryClient.getQueryData<APIResponse>([
        AFFILIATE_STATS_KEY,
      ]);

      if (existingData) {
        // Show toast if using cached data
        if (existingData.metadata.isCached && !hasShownCachedToastRef.current) {
          toast({
            title: "Using cached data",
            description: "We're currently showing previously loaded wager data while trying to fetch the latest information.",
            variant: "default"
          });
          hasShownCachedToastRef.current = true;
        }
        
        const total = existingData?.data?.all_time?.data?.reduce(
          (sum: number, entry: Entry) => {
            return sum + (entry?.wagered?.all_time || 0);
          },
          0,
        );
        return total || 0;
      }

      // If no existing data, fetch new data
      try {
        const response = await fetch(AFFILIATE_STATS_KEY);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json() as APIResponse;

        // Store the full response in the query cache
        queryClient.setQueryData([AFFILIATE_STATS_KEY], data);

        const total = data?.data?.all_time?.data?.reduce((sum: number, entry: Entry) => {
          return sum + (entry?.wagered?.all_time || 0);
        }, 0);

        return total || 0;
      } catch (error) {
        console.error("Error fetching wager totals:", error);
        return 0;
      }
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });

  return query;
}
