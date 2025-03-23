import { CacheManager } from "./cache";
import { API_CONFIG } from "../config/api";
import { log } from "../vite";

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
      log("Fetching fresh leaderboard data...");
      
      // Use the provided token
      const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiJpQWtJRjhLWm1QaE4iLCJpYXQiOjE3NDI3MjY5NDksImV4cCI6MTc0MjgxMzM0OX0.uDuhDLZQukn39N7lRRzSZ0v-UTIMOLk9o90QHWhSwN8";
      
      // Fetch fresh data from the API
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        log(`API request failed with status: ${response.status}. Using sample data.`);
        return createSampleLeaderboardData();
      }

      const rawData = await response.json();
      log("Successfully fetched leaderboard data from API");
      // Transform the data
      return transformLeaderboardData(rawData);
    } catch (error) {
      log(`Error fetching leaderboard data: ${error}. Using sample data.`);
      return createSampleLeaderboardData();
    }
  }, forceRefresh);
}

/**
 * Creates sample leaderboard data for demonstration when API is unavailable
 * @returns Sample leaderboard data
 */
function createSampleLeaderboardData(): LeaderboardData {
  // Create sample users
  const users = [
    { id: "user1", name: "GamerPro99", wagered: { today: 9800, this_week: 45600, this_month: 158000, all_time: 350000 } },
    { id: "user2", name: "BetMaster", wagered: { today: 8500, this_week: 41200, this_month: 145000, all_time: 320000 } },
    { id: "user3", name: "LuckyStreak", wagered: { today: 7900, this_week: 38700, this_month: 132000, all_time: 290000 } },
    { id: "user4", name: "VIPGamer", wagered: { today: 7200, this_week: 35500, this_month: 125000, all_time: 275000 } },
    { id: "user5", name: "CasinoRoyal", wagered: { today: 6800, this_week: 33800, this_month: 118000, all_time: 260000 } },
    { id: "user6", name: "HighRoller", wagered: { today: 6300, this_week: 31200, this_month: 112000, all_time: 245000 } },
    { id: "user7", name: "FortuneHunter", wagered: { today: 5900, this_week: 29000, this_month: 105000, all_time: 230000 } },
    { id: "user8", name: "SlotSlayer", wagered: { today: 5500, this_week: 27500, this_month: 98000, all_time: 215000 } },
    { id: "user9", name: "BetChampion", wagered: { today: 5100, this_week: 25800, this_month: 92000, all_time: 200000 } },
    { id: "user10", name: "JackpotKing", wagered: { today: 4800, this_week: 24200, this_month: 86000, all_time: 190000 } },
  ];

  // Transform users into the expected format
  const transformedData = users.map(user => ({
    uid: user.id,
    name: user.name,
    wagered: user.wagered
  }));

  // Create the leaderboard data structure
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
