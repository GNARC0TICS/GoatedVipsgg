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
import { users, transformationLogs, wagerRaces, wagerRaceParticipants } from "@db/schema";
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
 * Transforms and stores leaderboard data
 */
export async function transformLeaderboardData(apiResponse: any) {
  const startTime = Date.now();
  const logId = `transform_${startTime}`;

  try {
    console.log('Raw API Response:', JSON.stringify(apiResponse, null, 2));

    // Extract data from various possible response formats
    let rawData;
    if (Array.isArray(apiResponse)) {
      rawData = apiResponse;
    } else if (apiResponse?.data && Array.isArray(apiResponse.data)) {
      rawData = apiResponse.data;
    } else if (apiResponse?.results && Array.isArray(apiResponse.results)) {
      rawData = apiResponse.results;
    } else {
      console.error(`[${logId}] Invalid API response format:`, apiResponse);
      throw new Error('Invalid API response format');
    }

    if (!rawData.length) {
      console.warn(`[${logId}] No valid data received from API`);
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
          all_time: { data: [] }
        }
      };
    }

    // Transform entries with strict type checking and data validation
    const transformedEntries = rawData
      .map((entry: any): LeaderboardEntry | null => {
        if (!entry?.uid || !entry?.name) {
          console.warn(`[${logId}] Invalid entry detected:`, entry);
          return null;
        }

        const wagered = {
          today: Math.max(0, Number(entry?.wagered?.today || 0)),
          this_week: Math.max(0, Number(entry?.wagered?.this_week || 0)),
          this_month: Math.max(0, Number(entry?.wagered?.this_month || 0)),
          all_time: Math.max(0, Number(entry?.wagered?.all_time || 0))
        };

        return {
          uid: String(entry.uid),
          name: String(entry.name),
          wagered
        };
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null);

    if (!transformedEntries.length) {
      console.warn('No valid entries after transformation');
      throw new Error('No valid entries after transformation');
    }

    // Sort data for each period
    const todayData = [...transformedEntries].sort((a, b) => 
      (b.wagered.today || 0) - (a.wagered.today || 0)
    );
    const weeklyData = [...transformedEntries].sort((a, b) => 
      (b.wagered.this_week || 0) - (a.wagered.this_week || 0)
    );
    const monthlyData = [...transformedEntries].sort((a, b) => 
      (b.wagered.this_month || 0) - (a.wagered.this_month || 0)
    );
    const allTimeData = [...transformedEntries].sort((a, b) => 
      (b.wagered.all_time || 0) - (a.wagered.all_time || 0)
    );

    // Log success
    const transformationLog = {
      type: 'info',
      message: 'Leaderboard transformation completed',
      payload: {
        totalEntries: transformedEntries.length,
        periods: {
          today: todayData.length,
          weekly: weeklyData.length,
          monthly: monthlyData.length,
          allTime: allTimeData.length
        }
      },
      duration_ms: Date.now() - startTime,
      created_at: new Date(),
      resolved: true,
      error_message: null
    };

    console.log('Transformation Log:', transformationLog);
    await db.insert(transformationLogs).values(transformationLog);

    const result = {
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
      }
    };

    console.log('Transformed Result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error(`[${logId}] Error transforming leaderboard data:`, error);

    // Log error details
    await db.insert(transformationLogs).values({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      payload: JSON.stringify({
        error: error instanceof Error ? error.stack : undefined,
        input: apiResponse ? { 
          type: typeof apiResponse, 
          keys: Object.keys(apiResponse) 
        } : null
      }),
      duration_ms: (Date.now() - startTime).toString(),
      created_at: new Date(),
      resolved: false,
      error_message: error instanceof Error ? error.message : String(error)
    });

    throw error;
  }
}

function sortByWagered(data: LeaderboardEntry[], period: keyof WageredData): LeaderboardEntry[] {
  return [...data].sort((a, b) => {
    const bValue = Number(b.wagered[period]) || 0;
    const aValue = Number(a.wagered[period]) || 0;
    return bValue - aValue;
  });
}