import { CacheManager } from "./cache";
import { log } from "../vite";
import { apiService } from "./api-service";
import { 
  LeaderboardData, 
  LeaderboardEntry, 
  MVPData, 
  Period, 
  WagerStats 
} from "../../client/src/types/api";

// Create a singleton instance of the cache manager for leaderboard data
// Increase cache time to 15 minutes to reduce API load while maintaining data freshness
const leaderboardCache = new CacheManager<LeaderboardData>("leaderboard", 900000); // 15 minute cache

/**
 * Transforms MVP data into a standardized format
 * @param mvpData Raw MVP data from the API
 * @returns Transformed MVP data
 */
export function transformMVPData(mvpData: Record<string, LeaderboardEntry>): Record<Period, MVPData> {
  return Object.entries(mvpData).reduce(
    (acc: Record<Period, MVPData>, [period, data]: [string, LeaderboardEntry]) => {
      if (data && data.wagered) {
        // Get the appropriate wager value based on period
        const currentWager = getPeriodWager(data.wagered, period as Period);
        const previousWager = data.wagered.previous ?? 0;
        const hasIncrease = currentWager > previousWager;

        acc[period as Period] = {
          username: data.name,
          wagerAmount: currentWager,
          rank: 1, // Default rank, should be calculated based on position
          lastWagerChange: hasIncrease ? Date.now() : null,
          stats: {
            winRate: data.stats?.winRate ?? 0,
            favoriteGame: data.stats?.favoriteGame ?? "Unknown",
            totalGames: data.stats?.totalGames ?? 0,
          },
        };
      }
      return acc;
    },
    {} as Record<Period, MVPData>
  );
}

/**
 * Helper function to get wager amount for a specific period
 */
function getPeriodWager(wagered: WagerStats, period: Period): number {
  switch (period) {
    case 'today':
      return wagered.today;
    case 'weekly':
      return wagered.this_week;
    case 'monthly':
      return wagered.this_month;
    case 'all_time':
      return wagered.all_time;
    default:
      return 0;
  }
}

/**
 * Helper function to sort leaderboard entries by wagered amount
 * @param data Array of leaderboard entries
 * @param period Time period to sort by
 * @returns Sorted array of leaderboard entries
 */
export function sortByWagered(data: LeaderboardEntry[], period: keyof WagerStats): LeaderboardEntry[] {
  return [...data].sort(
    (a, b) => (b.wagered?.[period] ?? 0) - (a.wagered?.[period] ?? 0),
  );
}

/**
 * Transforms raw API data into our standardized leaderboard format
 * @param apiData Raw API data from the API response
 * @returns Transformed leaderboard data
 */
export function transformLeaderboardData(apiData: unknown): LeaderboardData {
  // Extract users array from various possible API response formats
  let users: unknown[] = [];
  
  if (typeof apiData === 'object' && apiData !== null) {
    const data = apiData as Record<string, unknown>;
    
    if (Array.isArray(data.data)) {
      users = data.data;
    } else if (Array.isArray(data.results)) {
      users = data.results;
    } else if (Array.isArray(apiData)) {
      users = apiData;
    }
  }

  if (users.length === 0) {
    // Return empty data structure for invalid/empty response
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
