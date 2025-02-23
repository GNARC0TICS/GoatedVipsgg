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
  status: "success" | "error";
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
    console.log('[DEBUG] Raw API Response:', JSON.stringify(apiResponse, null, 2));

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

    // Add more detailed logging for data structure
    console.log('[DEBUG] First entry data structure:', rawData[0]);

    // Transform entries with strict type checking and data validation
    const transformedEntries = rawData
      .map((entry: Record<string, any>): LeaderboardEntry | null => {
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
      console.warn('[DEBUG] No valid entries after transformation');
      throw new Error('No valid entries after transformation');
    }

    // Sort data for each period and log the sorting results
    console.log('[DEBUG] Starting data sorting...');

    const todayData = [...transformedEntries].sort((a, b) => 
      (b.wagered.today || 0) - (a.wagered.today || 0)
    );
    console.log('[DEBUG] Today top 3:', todayData.slice(0, 3));

    const weeklyData = [...transformedEntries].sort((a, b) => 
      (b.wagered.this_week || 0) - (a.wagered.this_week || 0)
    );
    console.log('[DEBUG] Weekly top 3:', weeklyData.slice(0, 3));

    const monthlyData = [...transformedEntries].sort((a, b) => 
      (b.wagered.this_month || 0) - (a.wagered.this_month || 0)
    );
    console.log('[DEBUG] Monthly top 3:', monthlyData.slice(0, 3));

    const allTimeData = [...transformedEntries].sort((a, b) => 
      (b.wagered.all_time || 0) - (a.wagered.all_time || 0)
    );
    console.log('[DEBUG] All-time top 3:', allTimeData.slice(0, 3));

    // Create transformation log record with detailed stats
    const transformationLogRecord = {
      type: 'info',
      message: 'Leaderboard transformation completed',
      payload: JSON.stringify({
        totalEntries: transformedEntries.length,
        periods: {
          today: {
            count: todayData.length,
            topWagered: todayData[0]?.wagered.today || 0
          },
          weekly: {
            count: weeklyData.length,
            topWagered: weeklyData[0]?.wagered.this_week || 0
          },
          monthly: {
            count: monthlyData.length,
            topWagered: monthlyData[0]?.wagered.this_month || 0
          },
          allTime: {
            count: allTimeData.length,
            topWagered: allTimeData[0]?.wagered.all_time || 0
          }
        },
        timestamp: new Date().toISOString()
      }),
      duration_ms: (Date.now() - startTime).toString(),
      created_at: new Date(),
      resolved: true,
      error_message: null
    };

    // Store the transformation log
    await db.insert(transformationLogs).values([transformationLogRecord]);

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

    console.log('[DEBUG] Final transformed result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error(`[${logId}] Error transforming leaderboard data:`, error);

    // Log error details with correct typing for Drizzle insert
    await db.insert(transformationLogs).values([{
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
    }]);

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