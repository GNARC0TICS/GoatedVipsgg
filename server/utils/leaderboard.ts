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
export async function transformLeaderboardData(apiData: APIResponse) {
  const startTime = Date.now();
  const logId = `transform_${startTime}`;

  try {
    // Extract and validate raw data
    const rawData = Array.isArray(apiData) ? apiData : 
                   Array.isArray(apiData?.data) ? apiData.data :
                   Array.isArray(apiData?.results) ? apiData.results : [];

    if (!rawData.length) {
      throw new Error('No valid data received from API');
    }

    // Log incoming data
    console.log(`[${logId}] Processing ${rawData.length} entries`);

    // Transform entries with strict type checking
    const transformedEntries = rawData.map((entry: any): LeaderboardEntry => {
      if (!entry?.uid || !entry?.name) {
        console.warn(`[${logId}] Invalid entry detected:`, entry);
        return null;
      }

      return {
        uid: String(entry.uid),
        name: String(entry.name),
        wagered: {
          today: Math.max(0, Number(entry?.wagered?.today || 0)),
          this_week: Math.max(0, Number(entry?.wagered?.this_week || 0)),
          this_month: Math.max(0, Number(entry?.wagered?.this_month || 0)),
          all_time: Math.max(0, Number(entry?.wagered?.all_time || 0))
        }
      };
    }).filter(Boolean);

    if (!transformedEntries.length) {
      throw new Error('No valid entries after transformation');
    }

    // Store data in database
    const now = new Date();
    await db.transaction(async (tx) => {
      // Create or update race entry
      const [race] = await tx
        .insert(wagerRaces)
        .values({
          title: `Monthly Race ${now.getMonth() + 1}/${now.getFullYear()}`,
          type: 'monthly',
          status: 'live',
          prizePool: 500,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          minWager: 0,
          prizeDistribution: {
            "1": 0.425,
            "2": 0.2,
            "3": 0.15,
            "4": 0.075,
            "5": 0.06,
            "6": 0.04,
            "7": 0.0275,
            "8": 0.0225,
            "9": 0.0175,
            "10": 0.0175
          }
        })
        .onConflictDoUpdate({
          target: [wagerRaces.type, wagerRaces.startDate],
          set: {
            updatedAt: now
          }
        })
        .returning();

      // Update participant data
      for (const entry of transformedEntries) {
        await tx
          .insert(wagerRaceParticipants)
          .values({
            raceId: race.id,
            userId: parseInt(entry.uid),
            totalWager: entry.wagered.this_month,
            wagerHistory: entry.wagered
          })
          .onConflictDoUpdate({
            target: [wagerRaceParticipants.raceId, wagerRaceParticipants.userId],
            set: {
              totalWager: entry.wagered.this_month,
              wagerHistory: entry.wagered,
              updatedAt: now
            }
          });
      }
    });

    // Sort data for each period
    const todayData = [...transformedEntries].sort((a, b) => b.wagered.today - a.wagered.today);
    const weeklyData = [...transformedEntries].sort((a, b) => b.wagered.this_week - a.wagered.this_week);
    const monthlyData = [...transformedEntries].sort((a, b) => b.wagered.this_month - a.wagered.this_month);
    const allTimeData = [...transformedEntries].sort((a, b) => b.wagered.all_time - a.wagered.all_time);

    // Log transformation success
    await db.insert(transformationLogs).values({
      type: 'info',
      message: 'Leaderboard transformation completed',
      payload: JSON.stringify({
        totalEntries: transformedEntries.length,
        periods: {
          today: todayData.length,
          weekly: weeklyData.length,
          monthly: monthlyData.length,
          allTime: allTimeData.length
        }
      }),
      duration_ms: (Date.now() - startTime).toString(),
      created_at: now,
      resolved: true,
      error_message: null
    });

    return {
      status: "success",
      metadata: {
        totalUsers: transformedEntries.length,
        lastUpdated: now.toISOString(),
      },
      data: {
        today: { data: todayData },
        weekly: { data: weeklyData },
        monthly: { data: monthlyData },
        all_time: { data: allTimeData }
      }
    };
  } catch (error) {
    console.error(`[${logId}] Error transforming leaderboard data:`, error);

    // Log error details
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