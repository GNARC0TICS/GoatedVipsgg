import { useQuery, useQueryClient, QueryObserverResult } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useLoading } from "@/contexts/LoadingContext";
import { 
  TimePeriod, 
  LeaderboardData, 
  LeaderboardEntry, 
  APIResponse 
} from "@/types/api";

// Create a constant key for the affiliate stats endpoint to avoid string duplication
export const AFFILIATE_STATS_KEY = "/api/affiliate/stats";

interface LeaderboardAPIError extends Error {
  status: number;
  details: string;
  code?: string;
}

function isLeaderboardAPIError(error: unknown): error is LeaderboardAPIError {
  return error instanceof Error && 
    'status' in error && 
    'details' in error;
}

interface UseLeaderboardResult {
  data: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult<LeaderboardData, Error>>;
  errorDetails?: string;
  totalUsers: number;
  lastUpdated: string;
  fetchAttempts: number;
}

// Helper function to create structured response from raw data
function createStructuredResponse(rawData: unknown): LeaderboardData {
  const now = new Date().toISOString();
  
  // Check if we have the expected structure format
  if (rawData && typeof rawData === 'object' && 'data' in rawData && Array.isArray((rawData as any).data)) {
    // Convert the flat array structure into the expected period-based structure
    const entries = (rawData as any).data as LeaderboardEntry[];
    
    return {
      status: "success",
      metadata: {
        totalUsers: entries.length,
        lastUpdated: now,
      },
      data: {
        today: { data: entries },
        weekly: { data: entries },
        monthly: { data: entries },
        all_time: { data: entries },
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

export function useLeaderboard(timePeriod: TimePeriod, page: number = 1): UseLeaderboardResult {
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

  const { data, isLoading, error, refetch } = useQuery<LeaderboardData>({
    queryKey: [AFFILIATE_STATS_KEY, timePeriod, page],
    queryFn: async () => {
      try {
        console.log(`Fetching leaderboard data for period: ${timePeriod}, page: ${page}`);
        fetchAttemptsRef.current += 1;
        
        if (!isLoadingFor(loadingKey)) {
          startLoadingFor(loadingKey, "spinner", 500);
        }
        
        const existingData = queryClient.getQueryData<LeaderboardData>([AFFILIATE_STATS_KEY]);
        
        if (existingData && !isInitialLoadRef.current) {
          console.log('Using cached leaderboard data');
          return existingData;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(
            `${AFFILIATE_STATS_KEY}?page=${page}&limit=100`,
            {
              headers: {
                Accept: "application/json",
              },
              cache: "no-cache",
              signal: controller.signal
            },
          );
          
          clearTimeout(timeoutId);

          if (response.status === 429) {
            console.warn('API rate limit exceeded. Using cached data or fallback.');
            setErrorDetails('API rate limit exceeded. Please try again later.');
            
            if (existingData) {
              console.log('Using stale cached data due to rate limiting');
              return existingData;
            }
            
            return createStructuredResponse({});
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error (${response.status}): ${errorText}`);
            setErrorDetails(`Status: ${response.status}, Details: ${errorText}`);
            
            if (existingData) {
              console.log('Using stale cached data due to API error');
              return existingData;
            }
            
            const error = new Error(`HTTP error! status: ${response.status}`) as LeaderboardAPIError;
            error.status = response.status;
            error.details = errorText;
            throw error;
          }

          const jsonData = await response.json();
          console.log('Received fresh leaderboard data:', jsonData);
          
          if (!jsonData || typeof jsonData !== 'object') {
            console.error('Invalid response format: not an object');
            setErrorDetails('Invalid data format received from server');
            
            if (existingData) {
              console.log('Using cached data due to invalid response format');
              return existingData;
            }
            
            const error = new Error('Invalid response format') as LeaderboardAPIError;
            error.status = 500;
            error.details = 'Response is not a valid JSON object';
            throw error;
          }
          
          let freshData: LeaderboardData;
          
          if ('data' in jsonData && Array.isArray(jsonData.data)) {
            console.log('Converting flat data array to structured format');
            freshData = createStructuredResponse(jsonData);
          } else if ('data' in jsonData && typeof jsonData.data === 'object' && (
            'today' in jsonData.data || 
            'weekly' in jsonData.data || 
            'monthly' in jsonData.data || 
            'all_time' in jsonData.data
          )) {
            freshData = jsonData as LeaderboardData;
          } else {
            console.warn('Unknown API response format, attempting to normalize');
            freshData = createStructuredResponse(jsonData);
          }
          
          // Ensure all periods exist with proper data
          const validPeriods: TimePeriod[] = ['today', 'weekly', 'monthly', 'all_time'];
          validPeriods.forEach(period => {
            if (!freshData.data[period]) {
              freshData.data[period] = { data: [] };
            }
            
            if (Array.isArray(freshData.data[period].data)) {
              freshData.data[period].data = freshData.data[period].data.map(entry => ({
                uid: entry.uid || `unknown-${Math.random().toString(36).substring(2, 9)}`,
                name: entry.name || 'Unknown Player',
                wagered: {
                  today: entry.wagered?.today ?? 0,
                  this_week: entry.wagered?.this_week ?? 0,
                  this_month: entry.wagered?.this_month ?? 0,
                  all_time: entry.wagered?.all_time ?? 0,
                },
              }));
            } else {
              freshData.data[period].data = [];
            }
          });
          
          queryClient.setQueryData([AFFILIATE_STATS_KEY], freshData);
          isInitialLoadRef.current = false;
          
          return freshData;
          
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            console.error('Request timed out after 10 seconds');
            setErrorDetails('Request timed out. Please try again later.');
            
            if (existingData) {
              console.log('Using stale cached data due to timeout');
              return existingData;
            }
            
            return createStructuredResponse({});
          }
          
          throw fetchError;
        }
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        
        if (isLeaderboardAPIError(err)) {
          setErrorDetails(`API Error (${err.status}): ${err.details}`);
        } else {
          setErrorDetails(err instanceof Error ? err.message : String(err));
        }
        
        throw err;
      } finally {
        if (isLoadingFor(loadingKey)) {
          stopLoadingFor(loadingKey);
        }
      }
    },
    refetchInterval: 60000,
    staleTime: 55000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const periodKey = timePeriod;
  
  useEffect(() => {
    if (data) {
      console.log(`Leaderboard data updated for period: ${timePeriod}`);
    }
    if (error) {
      console.error(`Error loading leaderboard data for ${timePeriod}:`, error);
    }
  }, [data, error, timePeriod]);

  const fallbackData: LeaderboardEntry[] = [];
  
  const periodData = (() => {
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
    totalUsers: data?.metadata?.totalUsers ?? 0,
    lastUpdated: data?.metadata?.lastUpdated ?? "",
    fetchAttempts: fetchAttemptsRef.current
  };
}

// Custom hook to access just the totals from the affiliate stats
export function useWagerTotals() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["wager-total"],
    queryFn: async () => {
      const existingData = queryClient.getQueryData<LeaderboardData>([AFFILIATE_STATS_KEY]);

      if (existingData) {
        const total = existingData.data.all_time.data.reduce(
          (sum, entry) => sum + (entry.wagered.all_time ?? 0),
          0,
        );
        return total;
      }

      const response = await fetch(AFFILIATE_STATS_KEY);
      const jsonData = await response.json();
      
      const data = 'data' in jsonData && Array.isArray(jsonData.data)
        ? createStructuredResponse(jsonData) 
        : jsonData as LeaderboardData;

      queryClient.setQueryData([AFFILIATE_STATS_KEY], data);

      const total = data.data.all_time.data.reduce(
        (sum, entry) => sum + (entry.wagered.all_time ?? 0),
        0,
      );

      return total;
    },
    staleTime: 60000,
    refetchInterval: 300000,
  });
}
