import { CacheManager } from "./cache";
import { API_CONFIG } from "../config/api";
import { log } from "../vite";
import { createEnhancedFallbackData } from "./fallback-data";

// Define a type for the leaderboard data
export type LeaderboardData = {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
  };
  data: {
    today: { data: any[] };
    weekly: { data: any[] };
    monthly: { data: any[] };
    all_time: { data: any[] };
  };
};

// Create a singleton instance of the cache manager for leaderboard data
const leaderboardCache = new CacheManager<LeaderboardData>("leaderboard", 60000); // 1 minute cache

/**
 * Transforms MVP data into a standardized format
 * @param mvpData Raw MVP data
 * @returns Transformed MVP data
 */
export function transformMVPData(mvpData: any) {
  return Object.entries(mvpData).reduce(
    (acc: Record<string, any>, [period, data]: [string, any]) => {
      if (data) {
        // Calculate if there was a wager change
        const currentWager =
          data.wagered[
            period === "daily"
              ? "today"
              : period === "weekly"
                ? "this_week"
                : "this_month"
          ];
        const previousWager = data.wagered?.previous || 0;
        const hasIncrease = currentWager > previousWager;

        acc[period] = {
          username: data.name,
          wagerAmount: currentWager,
          rank: 1,
          lastWagerChange: hasIncrease ? Date.now() : undefined,
          stats: {
            winRate: data.stats?.winRate || 0,
            favoriteGame: data.stats?.favoriteGame || "Unknown",
            totalGames: data.stats?.totalGames || 0,
          },
        };
      }
      return acc;
    },
    {},
  );
}

/**
 * Helper function to sort leaderboard entries by wagered amount
 * @param data Array of leaderboard entries
 * @param period Time period to sort by
 * @returns Sorted array of leaderboard entries
 */
export function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0),
  );
}

/**
 * Transforms raw API data into our standardized leaderboard format
 * @param apiData Raw API data
 * @returns Transformed leaderboard data
 */
export function transformLeaderboardData(apiData: any): LeaderboardData {
  // Extract data from various possible API response formats
  const responseData = apiData.data || apiData.results || apiData;
  if (
    !responseData ||
    (Array.isArray(responseData) && responseData.length === 0)
  ) {
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

  const dataArray = Array.isArray(responseData) ? responseData : [responseData];
  const transformedData = dataArray.map((entry) => ({
    uid: entry.uid || "",
    name: entry.name || "",
    wagered: {
      today: entry.wagered?.today || 0,
      this_week: entry.wagered?.this_week || 0,
      this_month: entry.wagered?.this_month || 0,
      all_time: entry.wagered?.all_time || 0,
    },
  }));

  return {
    status: "success",
    metadata: {
      totalUsers: transformedData.length,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: sortByWagered(transformedData, "today") },
      weekly: { data: sortByWagered(transformedData, "this_week") },
      monthly: { data: sortByWagered(transformedData, "this_month") },
      all_time: { data: sortByWagered(transformedData, "all_time") },
    },
  };
}

/**
 * Centralized function to get leaderboard data with caching and race condition prevention
 * @param forceRefresh Whether to force a refresh regardless of cache freshness
 * @returns The leaderboard data
 */
export async function getLeaderboardData(forceRefresh = false): Promise<LeaderboardData> {
  return await leaderboardCache.getData(async () => {
    try {
      log("Fetching leaderboard data from API...");
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        log("Request timeout reached, aborting");
        controller.abort();
      }, 15000); // 15 second timeout
      
      try {
        // Try multiple endpoints with fallbacks
        const endpoints = [
          `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
          // Add fallback endpoints if needed
          `${API_CONFIG.baseUrl}/fallback${API_CONFIG.endpoints.leaderboard}`
        ];
        
        let response = null;
        let errorMessages = [];
        
        // Try each endpoint until one succeeds
        for (const endpoint of endpoints) {
          try {
            log(`Attempting to fetch from: ${endpoint}`);
            response = await fetch(endpoint, {
              headers: {
                Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
              },
              signal: controller.signal,
            });
            
            if (response.ok) {
              log(`Successfully fetched from: ${endpoint}`);
              break; // Exit the loop if successful
            } else {
              const errorText = await response.text();
              errorMessages.push(`API error (${response.status}) from ${endpoint}: ${errorText}`);
              log(errorMessages[errorMessages.length - 1]);
              response = null; // Reset response to try next endpoint
            }
          } catch (endpointError) {
            errorMessages.push(`Failed to fetch from ${endpoint}: ${endpointError instanceof Error ? endpointError.message : String(endpointError)}`);
            log(errorMessages[errorMessages.length - 1]);
          }
        }
        
        clearTimeout(timeoutId);
        
        // If all endpoints failed
        if (!response || !response.ok) {
          log(`All endpoints failed: ${errorMessages.join('; ')}`);
          
          // Check if we're in production mode
          if (process.env.NODE_ENV === 'production') {
            // In production, don't use fallback data
            log("In production mode - not using fallback data");
            throw new Error("Failed to fetch leaderboard data from API in production mode");
          } else {
            // In development, use fallback data
            log("Using fallback leaderboard data (development mode)");
            return createEnhancedFallbackData();
          }
        }
        
        const rawData = await response.json();
        log("Successfully fetched leaderboard data");
        
        // Validate the data structure
        if (!rawData || typeof rawData !== 'object') {
          log("Invalid API response structure");
          if (process.env.NODE_ENV === 'production') {
            log("In production mode - not using fallback data for invalid API response");
            throw new Error("Invalid API response structure in production mode");
          } else {
            log("Using fallback data for invalid API response (development mode)");
            return createEnhancedFallbackData();
          }
        }
        
        // Transform the data
        return transformLeaderboardData(rawData);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Log the error but don't let it crash the application
      log(`Error fetching leaderboard data: ${error instanceof Error ? error.message : String(error)}`);
      
      // Check if we're in production mode
      if (process.env.NODE_ENV === 'production') {
        log("In production mode - not using fallback data on error");
        throw new Error(`Failed to fetch leaderboard data in production mode: ${error instanceof Error ? error.message : String(error)}`);
      } else {
        log("Using enhanced fallback leaderboard data due to error (development mode)");
        // Return enhanced fallback data in case of any error
        return createEnhancedFallbackData();
      }
    }
  }, forceRefresh);
}

// The createEnhancedFallbackData function is now imported from fallback-data.ts

/**
 * Invalidates the leaderboard cache
 */
export function invalidateLeaderboardCache(): void {
  leaderboardCache.invalidateCache();
}

/**
 * Gets the current leaderboard cache version
 * @returns The current cache version
 */
export function getLeaderboardCacheVersion(): number {
  return leaderboardCache.getCacheVersion();
}

/**
 * Gets the time elapsed since the last leaderboard cache update
 * @returns Time in milliseconds since the last cache update
 */
export function getLeaderboardCacheAge(): number {
  return leaderboardCache.getCacheAge();
}

/**
 * Checks if the leaderboard cache is currently fresh
 * @returns True if the cache is fresh, false otherwise
 */
export function isLeaderboardCacheFresh(): boolean {
  return leaderboardCache.isCacheFresh();
}
