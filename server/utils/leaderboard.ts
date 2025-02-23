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
import { transformationLogs } from "@db/schema";

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
 * Transforms and stores leaderboard data
 */
export async function transformLeaderboardData(apiResponse: any) {
  const startTime = Date.now();
  const logId = `transform_${startTime}`;

  try {
    console.log('[DEBUG] Starting transformation of API Response');
    console.log('[DEBUG] Raw API Response:', JSON.stringify(apiResponse, null, 2));

    if (!apiResponse) {
      throw new Error('API response is empty');
    }

    // Handle both array and object responses
    let entries: any[] = [];
    if (Array.isArray(apiResponse)) {
      entries = apiResponse;
    } else if (typeof apiResponse === 'object' && apiResponse !== null) {
      // Handle the specific API response format we're receiving
      if (Array.isArray(apiResponse.entries)) {
        entries = apiResponse.entries;
      } else if (apiResponse.today !== undefined && apiResponse.this_week !== undefined) {
        // Extract entries from the specific response format
        entries = Object.entries(apiResponse)
          .filter(([key]) => !['today', 'this_week'].includes(key))
          .map(([_, value]) => value);
      } else {
        console.error('Unexpected API response structure:', apiResponse);
        throw new Error('Invalid API response format');
      }
    }

    if (!entries.length) {
      console.warn('No entries found in API response');
      entries = [];
    }

    console.log('[DEBUG] Extracted entries:', entries.length);

    // Transform entries with flexible validation
    const transformedEntries = entries
      .map((entry: Record<string, any>): LeaderboardEntry | null => {
        try {
          // Extract identifier with fallbacks
          const uid = entry.uid || entry.id || entry.userId || entry.user_id;
          if (!uid) {
            console.warn(`[${logId}] Entry missing identifier:`, entry);
            return null;
          }

          // Extract name with fallbacks
          const name = entry.name || entry.username || entry.user_name || 'Anonymous';

          // Extract wager data with careful type conversion
          const extractNumber = (value: any): number => {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') return parseFloat(value) || 0;
            return 0;
          };

          const wagered = {
            today: extractNumber(entry.wagered?.today || entry.today || 0),
            this_week: extractNumber(entry.wagered?.this_week || entry.week || 0),
            this_month: extractNumber(entry.wagered?.this_month || entry.month || 0),
            all_time: extractNumber(entry.wagered?.all_time || entry.total || 0)
          };

          return {
            uid: String(uid),
            name: String(name),
            wagered
          };
        } catch (error) {
          console.error(`[${logId}] Error transforming entry:`, error);
          return null;
        }
      })
      .filter((entry: LeaderboardEntry | null): entry is LeaderboardEntry => entry !== null);

    if (!transformedEntries.length) {
      console.warn('[DEBUG] No valid entries after transformation');
      throw new Error('No valid entries after transformation');
    }

    console.log('[DEBUG] Successfully transformed entries:', transformedEntries.length);

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
          },
          weekly: {
            count: weeklyData.length,
            topWagered: weeklyData[0]?.wagered.this_week || 0,
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
        lastUpdated: new Date().toISOString()
      },
      data: {
        today: { data: todayData },
        weekly: { data: weeklyData },
        monthly: { data: monthlyData },
        all_time: { data: allTimeData }
      }
    };

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