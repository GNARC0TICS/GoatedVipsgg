import { CacheManager } from "./cache";
import { log } from "../vite";
import { apiService } from "./api-service";

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
// Increase cache time to 5 minutes to reduce API load
const leaderboardCache = new CacheManager<LeaderboardData>("leaderboard", 300000); // 5 minute cache

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
      log(`Fetching fresh leaderboard data from API...`);
      
      // Use our ApiService to fetch data (handles tokens and retries)
      const rawData = await apiService.getLeaderboardData();
      log(`Successfully fetched leaderboard data. Transforming...`);
      
      // Transform the data
      return transformLeaderboardData(rawData);
    } catch (error) {
      log(`Error fetching leaderboard data: ${error}`);
      
      // If we have cached data, use it even if it's stale
      const cachedData = leaderboardCache.getCachedData();
      if (cachedData) {
        log(`Using stale cached data due to API error`);
        return cachedData;
      }
      
      // Create a basic empty data structure if everything fails
      return {
        status: "error",
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
  }, forceRefresh);
}

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
