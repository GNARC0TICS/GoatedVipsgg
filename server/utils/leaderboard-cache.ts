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
      
      // Construct full API URL with the baseUrl and endpoint
      const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;
      log(`Making API request to: ${apiUrl}`);
      
      // Use the headers from the config
      const response = await fetch(apiUrl, {
        headers: API_CONFIG.headers,
        method: 'GET'
      });

      if (!response.ok) {
        log(`API request failed with status: ${response.status}.`);
        
        // Try to get data from local database instead of failing
        try {
          log("Attempting to retrieve leaderboard data from local database...");
          // Query the database for the latest affiliate stats
          const { pgPool } = await import("../../db/connection");
          const result = await pgPool.query(`
            SELECT uid, name, wagered, period 
            FROM affiliate_stats 
            WHERE updated_at > NOW() - INTERVAL '7 days'
            ORDER BY updated_at DESC
          `);
          
          if (result.rows.length > 0) {
            log(`Retrieved ${result.rows.length} records from local database`);
            
            // Transform database results into the expected format
            const transformedData = {
              status: "success",
              metadata: {
                totalUsers: result.rows.length,
                lastUpdated: new Date().toISOString(),
                source: "database" // Mark this as coming from database
              },
              data: {
                today: { data: [] },
                weekly: { data: [] },
                monthly: { data: [] },
                all_time: { data: [] }
              }
            };
            
            // Process the rows and organize by period
            for (const row of result.rows) {
              const entry = {
                uid: row.uid,
                name: row.name,
                wagered: {
                  today: 0,
                  this_week: 0,
                  this_month: 0,
                  all_time: 0
                }
              };
              
              // Copy the wagered value to the appropriate period
              if (row.period === 'today') {
                entry.wagered.today = parseFloat(row.wagered);
              } else if (row.period === 'this_week') {
                entry.wagered.this_week = parseFloat(row.wagered);
              } else if (row.period === 'this_month') {
                entry.wagered.this_month = parseFloat(row.wagered);
              } else if (row.period === 'all_time') {
                entry.wagered.all_time = parseFloat(row.wagered);
              }
              
              // Add to the appropriate period's data array
              if (row.period === 'today') {
                transformedData.data.today.data.push(entry);
              } else if (row.period === 'this_week') {
                transformedData.data.weekly.data.push(entry);
              } else if (row.period === 'this_month') {
                transformedData.data.monthly.data.push(entry);
              } else if (row.period === 'all_time') {
                transformedData.data.all_time.data.push(entry);
              }
            }
            
            // Sort the data arrays
            transformedData.data.today.data = sortByWagered(transformedData.data.today.data, "today");
            transformedData.data.weekly.data = sortByWagered(transformedData.data.weekly.data, "this_week");
            transformedData.data.monthly.data = sortByWagered(transformedData.data.monthly.data, "this_month");
            transformedData.data.all_time.data = sortByWagered(transformedData.data.all_time.data, "all_time");
            
            return transformedData;
          } else {
            log("No records found in local database");
            // Return empty dataset
            return {
              status: "success",
              metadata: {
                totalUsers: 0,
                lastUpdated: new Date().toISOString(),
                source: "empty"
              },
              data: {
                today: { data: [] },
                weekly: { data: [] },
                monthly: { data: [] },
                all_time: { data: [] }
              }
            };
          }
        } catch (dbError) {
          log(`Error retrieving from database: ${dbError}`);
          // Return empty dataset as last resort
          return {
            status: "success",
            metadata: {
              totalUsers: 0,
              lastUpdated: new Date().toISOString(),
              source: "empty"
            },
            data: {
              today: { data: [] },
              weekly: { data: [] },
              monthly: { data: [] },
              all_time: { data: [] }
            }
          };
        }
      }

      const rawData = await response.json();
      log("Successfully fetched leaderboard data from API");
      // Transform the data
      return transformLeaderboardData(rawData);
    } catch (error) {
      log(`Error fetching leaderboard data: ${error}.`);
      
      // Return empty but valid data structure instead of throwing
      return {
        status: "success",
        metadata: {
          totalUsers: 0,
          lastUpdated: new Date().toISOString(),
          source: "error"
        },
        data: {
          today: { data: [] },
          weekly: { data: [] },
          monthly: { data: [] },
          all_time: { data: [] }
        }
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
