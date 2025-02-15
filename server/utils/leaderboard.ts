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

type APIResponse = {
  data?: any;
  results?: any;
  success?: boolean;
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
export async function transformLeaderboardData(apiData: APIResponse) {
  const startTime = Date.now();

  try {
    console.log('Starting leaderboard transformation:', { 
      hasData: Boolean(apiData),
      structure: Object.keys(apiData)
    });

    // Extract data from API response, handling potential nested structures
    const rawData = Array.isArray(apiData) ? apiData : 
                   Array.isArray(apiData?.data) ? apiData.data :
                   Array.isArray(apiData?.results) ? apiData.results : [];

    console.log('Raw data structure:', {
      isArray: Array.isArray(rawData),
      length: rawData.length,
      availablePeriods: rawData.length > 0 ? Object.keys(rawData[0]?.wagered || {}) : []
    });

    // Transform each entry, preserving all available data
    const transformedEntries = rawData.map((entry: any): LeaderboardEntry => ({
      uid: String(entry?.uid || ""),
      name: String(entry?.name || "Unknown"),
      wagered: {
        today: Number(entry?.wagered?.today || 0),
        this_week: Number(entry?.wagered?.this_week || 0),
        this_month: Number(entry?.wagered?.this_month || 0),
        all_time: Number(entry?.wagered?.all_time || 0)
      }
    }));

    // Sort data for each time period
    const todayData = sortByWagered(transformedEntries, 'today');
    const weeklyData = sortByWagered(transformedEntries, 'this_week');
    const monthlyData = sortByWagered(transformedEntries, 'this_month');
    const allTimeData = sortByWagered(transformedEntries, 'all_time');

    // Log transformation stats
    const transformedStats = {
      totalEntries: transformedEntries.length,
      availableData: {
        today: todayData.some(e => e.wagered.today > 0),
        weekly: weeklyData.some(e => e.wagered.this_week > 0),
        monthly: monthlyData.some(e => e.wagered.this_month > 0),
        allTime: allTimeData.some(e => e.wagered.all_time > 0)
      }
    };

    console.log('Transformation stats:', transformedStats);

    // Create the final response
    const response = {
      status: "success",
      metadata: {
        totalUsers: transformedEntries.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { data: todayData },
        weekly: { data: weeklyData },
        monthly: { data: monthlyData },
        all_time: { data: allTimeData }
      },
    };

    // Log successful transformation
    await db.insert(transformationLogs).values({
      type: 'info',
      message: 'Leaderboard transformation completed',
      payload: JSON.stringify(transformedStats),
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
      type: 'error',
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