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

export type Entry = {
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

// Helper function to create structured response from raw data
function createStructuredResponse(rawData: any): APIResponse {
  const now = new Date().toISOString();
  
  // Check if we have the expected structure format
  if (rawData && rawData.data && Array.isArray(rawData.data)) {
    // Convert the flat array structure into the expected period-based structure
    const entries = rawData.data;
    
    return {
      status: "success",
      metadata: {
        totalUsers: entries.length,
        lastUpdated: now,
      },
      data: {
        today: { 
          data: entries 
        },
        weekly: { 
          data: entries 
        },
        monthly: { 
          data: entries 
        },
        all_time: { 
          data: entries 
        },
      },
    };
  }
  
  // Return an empty structured response
  return {
    status: "success",
    metadata: {
      totalUsers: 0,
      lastUpdated: now,
    },
    data: {
      today: { data: [] },
      weekly: { data: [] },
      monthly: { data: [] },
      all_time: { data: [] },
    },
  };
}

export function useLeaderboard(timePeriod: TimePeriod, page: number = 1): {
  data: Entry[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  errorDetails?: string;
  totalUsers: number;
  lastUpdated: string;
  fetchAttempts: number;
} {
  const queryClient = useQueryClient();
  const { startLoadingFor, stopLoadingFor, isLoadingFor } = useLoading();
  const loadingKey = `leaderboard-${timePeriod}`;
  
  // Create a state for detailed error information
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);
  
  // Track fetch attempts for better error handling
  const fetchAttemptsRef = useRef(0);
  
  useEffect(() => {
    // Reset error details when time period changes
    setErrorDetails('');
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
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        let freshData: APIResponse;
        
        try {
          // Only make one API call with no time period parameter, and get all data at once
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
              return existingData;
            }
            
            // Create structured response with empty data
            return createStructuredResponse({});
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error (${response.status}): ${errorText}`);
            setErrorDetails(`Status: ${response.status}, Details: ${errorText}`);
            
            // If we have cached data, use it even if it's stale
            if (existingData) {
              console.log('Using stale cached data due to API error');
              return existingData;
            }
            
            throw new LeaderboardAPIError(
              `HTTP error! status: ${response.status}`,
              response.status,
              errorText
            );
          }

          const jsonData = await response.json();
          console.log('Received fresh leaderboard data:', jsonData);
          
          // Validate the data structure and convert to expected format
          if (!jsonData || typeof jsonData !== 'object') {
            console.error('Invalid response format: not an object');
            setErrorDetails('Invalid data format received from server');
            
            // If we have cached data, use it
            if (existingData) {
              console.log('Using cached data due to invalid response format');
              return existingData;
            }
            
            throw new LeaderboardAPIError(
              'Invalid response format',
              500,
              'Response is not a valid JSON object'
            );
          }
          
          // Check if we have a flat data array (current API format) and convert to structured format
          if (jsonData.data && Array.isArray(jsonData.data)) {
            console.log('Converting flat data array to structured format');
            freshData = createStructuredResponse(jsonData);
          }
          // Check for standard period-based structure
          else if (jsonData.data && (
            jsonData.data.today || 
            jsonData.data.weekly || 
            jsonData.data.monthly || 
            jsonData.data.all_time
          )) {
            freshData = jsonData as APIResponse;
          } 
          // Fallback to creating a structured response from whatever we have
          else {
            console.warn('Unknown API response format, attempting to normalize');
            freshData = createStructuredResponse(jsonData);
          }
          
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
              return existingData;
            }
            
            // Create structured response with empty data
            return createStructuredResponse({});
          }
          
          // Re-throw other fetch errors
          throw fetchError;
        }
        
        // Validate the data structure
        if (!freshData || !freshData.data) {
          console.error('Invalid API response structure:', freshData);
          setErrorDetails('Invalid API response structure');
          
          // If we have cached data, use it even if it's stale
          if (existingData) {
            console.log('Using stale cached data due to invalid response');
            return existingData;
          }
          
          // Create structured response with empty data
          return createStructuredResponse({});
        }
        
        // Ensure period data exists for all periods
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
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        
        if (err instanceof LeaderboardAPIError) {
          setErrorDetails(`API Error (${err.status}): ${err.details}`);
        } else {
          setErrorDetails(err instanceof Error ? err.message : String(err));
        }
        
        throw err;
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
    }
    if (error) {
      console.error(`Error loading leaderboard data for ${timePeriod}:`, error);
    }
  }, [data, error, timePeriod]);

  // Create a fallback empty data structure if data is missing
  const fallbackData: Entry[] = [];
  
  // Extract the data for the requested time period, with fallback
  const periodData = (() => {
    // For debugging purposes
    if (!data) {
      console.warn('No data available for leaderboard');
      return fallbackData;
    }
    
    if (!data.data) {
      console.warn('Leaderboard data missing "data" property:', data);
      return fallbackData;
    }
    
    if (!data.data[periodKey]) {
      console.warn(`Leaderboard data missing "${periodKey}" period:`, data.data);
      return fallbackData;
    }
    
    if (!Array.isArray(data.data[periodKey].data)) {
      console.warn(`Leaderboard "${periodKey}" period has invalid data (not an array):`, data.data[periodKey]);
      return fallbackData;
    }
    
    return data.data[periodKey].data;
  })();
  
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
      const jsonData = await response.json();
      
      // Convert to structured format if needed
      const data = jsonData.data && Array.isArray(jsonData.data) 
        ? createStructuredResponse(jsonData) 
        : jsonData as APIResponse;

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