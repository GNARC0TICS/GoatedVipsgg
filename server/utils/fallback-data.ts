import { LeaderboardData } from "./leaderboard-cache";
import { log } from "../vite";

/**
 * Creates an empty leaderboard data structure
 * Used when there's no cached data available
 * @returns Empty but correctly structured leaderboard data
 */
export function getEmptyLeaderboardData(): LeaderboardData {
  log("Creating empty leaderboard data structure");
  
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

/**
 * Returns either the cached data or an empty structure if no cache exists
 * This ensures the application can still function even when external services are down
 * @param cachedData Optional cached data to return if available
 * @returns Cached leaderboard data or empty structure
 */
export function getFallbackLeaderboardData(cachedData?: LeaderboardData | null): LeaderboardData {
  if (cachedData) {
    log("Using cached leaderboard data as fallback");
    // Add a timestamp to indicate this is cached data
    return {
      ...cachedData,
      metadata: {
        ...cachedData.metadata,
        isCached: true,
        cachedAt: cachedData.metadata.lastUpdated,
        servedAt: new Date().toISOString(),
      }
    };
  }
  
  // If no cached data is available, return an empty structure
  log("No cached data available, returning empty leaderboard structure");
  return getEmptyLeaderboardData();
}

/**
 * Creates an empty wager race position data structure
 * Used when there's no cached data available
 * @param userId User ID
 * @param username Username
 * @returns Empty but correctly structured wager race position data
 */
export function getEmptyWagerRacePosition(userId: string | number, username?: string) {
  return {
    position: 0,
    totalParticipants: 0,
    wagerAmount: 0,
    previousPosition: 0,
    raceType: "unknown",
    raceTitle: "Data Unavailable",
    endDate: null,
    userId,
    username: username || `User${userId}`,
    error: "Data currently unavailable",
    isCached: false
  };
}
