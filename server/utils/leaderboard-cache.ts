import { CacheManager } from "./cache";
import { log } from "../vite";
import { apiService } from "./api-service";

// Define a type for the leaderboard data
// Define types for the leaderboard data structure
export interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
  stats?: {
    winRate: number;
    totalGames: number;
    favoriteGame: string;
  };
  lastWager?: string;
  isWagering?: boolean;
  wagerChange?: number;
}

export interface RaceMetadata {
  id: string;
  status: 'upcoming' | 'live' | 'completed';
  startDate: string;
  endDate: string;
  prizePool: number;
  totalWagered: number;
}

export interface LeaderboardData {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
    currentRace?: RaceMetadata;
  };
  data: {
    today: { data: LeaderboardEntry[] };
    weekly: { data: LeaderboardEntry[] };
    monthly: { data: LeaderboardEntry[] };
    all_time: { data: LeaderboardEntry[] };
  };
}

// Create a singleton instance of the cache manager for leaderboard data
// Increase cache time to 15 minutes to reduce API load while maintaining data freshness
const leaderboardCache = new CacheManager<LeaderboardData>("leaderboard", 900000); // 15 minute cache

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
  // Handle the current API response format which has a data array with all users
  let users = [];
  
  // Extract data from API response format
  if (apiData.data && Array.isArray(apiData.data)) {
    // Current format - the data property is an array of users
    users = apiData.data;
  } else if (Array.isArray(apiData)) {
    // Direct array format
    users = apiData;
  } else if (apiData.results && Array.isArray(apiData.results)) {
    // Possible alternative format
    users = apiData.results;
  } else {
    // Empty/invalid response
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
  
  // Normalize each user object
  const normalizedUsers = users.map((entry: any) => ({
    uid: entry.uid || "",
    name: entry.name || "",
    wagered: {
      today: entry.wagered?.today || 0,
      this_week: entry.wagered?.this_week || 0,
      this_month: entry.wagered?.this_month || 0,
      all_time: entry.wagered?.all_time || 0,
    },
  }));

  // Create our standardized structure - organizing users by time period
  return {
    status: "success",
    metadata: {
      totalUsers: normalizedUsers.length,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: sortByWagered(normalizedUsers, "today") },
      weekly: { data: sortByWagered(normalizedUsers, "this_week") },
      monthly: { data: sortByWagered(normalizedUsers, "this_month") },
      all_time: { data: sortByWagered(normalizedUsers, "all_time") },
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
