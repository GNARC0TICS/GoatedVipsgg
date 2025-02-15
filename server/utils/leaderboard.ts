import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  decimal,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";
import { db } from "@db";
import { users, transformationLogs } from "@db/schema";
import { broadcastTransformationLog } from "../routes";

type WageredData = {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  wagered: WageredData;
};

/**
 * Utility function to sort data by wagered amount
 */
function sortByWagered(data: LeaderboardEntry[], period: keyof WageredData): LeaderboardEntry[] {
  return [...data].sort((a, b) => {
    const bValue = Number(b.wagered[period]) || 0;
    const aValue = Number(a.wagered[period]) || 0;
    return bValue - aValue;
  });
}

/**
 * Transforms raw leaderboard data into standardized format
 */
export async function transformLeaderboardData(apiData: any) {
  const startTime = Date.now();

  try {
    console.log('Starting leaderboard transformation:', { 
      hasData: Boolean(apiData),
      keys: Object.keys(apiData),
      dataType: typeof apiData
    });

    // Extract data from API response
    const rawData = apiData?.data || apiData?.results || [];

    console.log('Raw data extracted:', {
      isArray: Array.isArray(rawData),
      length: Array.isArray(rawData) ? rawData.length : 'not an array',
      sampleEntry: Array.isArray(rawData) && rawData.length > 0 ? 
        JSON.stringify(rawData[0], null, 2) : 'no entries'
    });

    // Transform the data into a standardized format
    const transformedEntries = (Array.isArray(rawData) ? rawData : []).map((entry): LeaderboardEntry => ({
      uid: String(entry?.uid || ""),
      name: String(entry?.name || "Unknown"),
      wagered: {
        today: Number(entry?.wagered?.today || 0),
        this_week: Number(entry?.wagered?.this_week || 0),
        this_month: Number(entry?.wagered?.this_month || 0),
        all_time: Number(entry?.wagered?.all_time || 0),
      }
    }));

    // Log transformation stats
    const transformedStats = {
      totalEntries: transformedEntries.length,
      hasTodayWagers: transformedEntries.some(e => e.wagered.today > 0),
      hasWeeklyWagers: transformedEntries.some(e => e.wagered.this_week > 0),
      hasMonthlyWagers: transformedEntries.some(e => e.wagered.this_month > 0),
      hasAllTimeWagers: transformedEntries.some(e => e.wagered.all_time > 0)
    };

    console.log('Transformation stats:', transformedStats);

    // Sort data for each time period
    const todayData = sortByWagered(transformedEntries, 'today');
    const weeklyData = sortByWagered(transformedEntries, 'this_week');
    const monthlyData = sortByWagered(transformedEntries, 'this_month');
    const allTimeData = sortByWagered(transformedEntries, 'all_time');

    // Create the final response with all time periods
    const response = {
      status: "success",
      metadata: {
        totalUsers: transformedEntries.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { data: todayData.slice(0, 100) }, // Limit to top 100 for each period
        weekly: { data: weeklyData.slice(0, 100) },
        monthly: { data: monthlyData.slice(0, 100) },
        all_time: { data: allTimeData.slice(0, 100) }
      },
    };

    // Log transformation success
    await db.insert(transformationLogs).values({
      type: 'info' as const,
      message: 'Leaderboard transformation completed',
      payload: JSON.stringify({
        ...transformedStats,
        sortedStats: {
          todayLength: todayData.length,
          weeklyLength: weeklyData.length,
          monthlyLength: monthlyData.length,
          allTimeLength: allTimeData.length,
        }
      }),
      duration_ms: (Date.now() - startTime).toString(),
      created_at: new Date(),
      resolved: true,
      error_message: null
    });

    return response;
  } catch (error) {
    console.error('Error transforming leaderboard data:', error);

    // Log error
    await db.insert(transformationLogs).values({
      type: 'error' as const,
      message: error instanceof Error ? error.message : String(error),
      payload: JSON.stringify({
        error: error instanceof Error ? error.stack : undefined,
        input: apiData ? { type: typeof apiData, keys: Object.keys(apiData) } : null
      }),
      duration_ms: (Date.now() - startTime).toString(),
      created_at: new Date(),
      resolved: false,
      error_message: error instanceof Error ? error.message : String(error)
    });

    return {
      status: "error",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
      data: {
        today: { data: [] },
        weekly: { data: [] },
        monthly: { data: [] },
        all_time: { data: [] },
      },
    };
  }
}