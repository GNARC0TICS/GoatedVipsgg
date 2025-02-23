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
  participants: LeaderboardEntry[];
  today: number;
  this_week: number;
};

/**
 * Transforms and stores leaderboard data
 */
export async function transformLeaderboardData(apiResponse: any) {
  const startTime = Date.now();
  const logId = `transform_${startTime}`;

  try {
    console.log('[DEBUG] Raw API Response:', JSON.stringify(apiResponse, null, 2));

    if (!apiResponse?.participants || !Array.isArray(apiResponse.participants)) {
      console.error(`[${logId}] Invalid API response format:`, apiResponse);
      throw new Error('Invalid API response format');
    }

    // Transform entries with strict type checking and data validation
    const transformedEntries = apiResponse.participants
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
      .filter((entry: LeaderboardEntry | null): entry is LeaderboardEntry => entry !== null);

    if (!transformedEntries.length) {
      console.warn('[DEBUG] No valid entries after transformation');
      throw new Error('No valid entries after transformation');
    }

    // Sort data for each period
    console.log('[DEBUG] Starting data sorting...');

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

    // Create transformation log
    await db.insert(transformationLogs).values({
      type: 'info',
      message: 'Leaderboard transformation completed',
      payload: JSON.stringify({
        totalEntries: transformedEntries.length,
        periods: {
          today: {
            count: todayData.length,
            topWagered: todayData[0]?.wagered.today || 0,
            totalWagered: apiResponse.today || 0
          },
          weekly: {
            count: weeklyData.length,
            topWagered: weeklyData[0]?.wagered.this_week || 0,
            totalWagered: apiResponse.this_week || 0
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
    });

    const result = {
      status: "success",
      metadata: {
        totalUsers: transformedEntries.length,
        lastUpdated: new Date().toISOString(),
        summary: {
          today: apiResponse.today || 0,
          this_week: apiResponse.this_week || 0
        }
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