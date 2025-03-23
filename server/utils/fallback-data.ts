import { LeaderboardData } from "./leaderboard-cache";
import { log } from "../vite";

/**
 * Check if fallback data should be allowed in the current environment
 * @returns true if fallback data is allowed, false otherwise
 */
export function isFallbackDataAllowed(): boolean {
  // Always allow fallback data in development and test environments
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // In production, only use fallback if explicitly enabled
  return process.env.ENABLE_FALLBACK_DATA === 'true';
}

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

/**
 * Creates enhanced fallback data with some simulated entries
 * Used for development and testing purposes
 * @returns Enhanced leaderboard data with simulated entries
 */
export function createEnhancedFallbackData(): LeaderboardData {
  const base = getEmptyLeaderboardData();
  
  // Only create enhanced data if allowed in this environment
  if (!isFallbackDataAllowed()) {
    return base;
  }
  
  // Add some simulated entries for testing
  const simulatedData = {
    ...base,
    status: "success",
    metadata: {
      ...base.metadata,
      totalUsers: 5,
      lastUpdated: new Date().toISOString(),
      isFallback: true,
    },
    data: {
      today: {
        data: Array(5).fill(null).map((_, i) => ({
          position: i + 1,
          username: `TestUser${i + 1}`,
          amount: (5000 - i * 1000) / 100,
          userId: `test-${i + 1}`,
        })),
      },
      weekly: {
        data: Array(5).fill(null).map((_, i) => ({
          position: i + 1,
          username: `TestUser${i + 1}`,
          amount: (25000 - i * 5000) / 100,
          userId: `test-${i + 1}`,
        })),
      },
      monthly: {
        data: Array(5).fill(null).map((_, i) => ({
          position: i + 1,
          username: `TestUser${i + 1}`,
          amount: (100000 - i * 20000) / 100,
          userId: `test-${i + 1}`,
        })),
      },
      all_time: {
        data: Array(5).fill(null).map((_, i) => ({
          position: i + 1,
          username: `TestUser${i + 1}`,
          amount: (500000 - i * 100000) / 100,
          userId: `test-${i + 1}`,
        })),
      },
    }
  };
  
  return simulatedData;
}

/**
 * Creates fallback wager race position data for a specific user
 * @param userId User ID for the position data
 * @param username Optional username
 * @returns Wager race position data or null if fallback is not allowed
 */
export function createFallbackWagerRacePosition(userId: string | number, username?: string) {
  // Only create fallback data if allowed in this environment
  if (!isFallbackDataAllowed()) {
    return null;
  }
  
  // Create simulated race position data
  return {
    position: Math.floor(Math.random() * 10) + 1,
    totalParticipants: 50,
    wagerAmount: Math.floor(Math.random() * 5000) / 100,
    previousPosition: Math.floor(Math.random() * 10) + 1,
    raceType: "weekly",
    raceTitle: "Weekly Wager Race (Fallback)",
    endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    userId,
    username: username || `User${userId}`,
    isFallback: true
  };
}
