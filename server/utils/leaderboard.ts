import { pgTable, text, serial, timestamp, boolean, decimal, jsonb, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users, mockWagerData } from "@db/schema";

/**
 * Utility function to sort data by wagered amount
 */
function sortByWagered(data: any[], period: string) {
  return [...data].sort((a, b) => {
    const bWager = b.wagered?.[period] || 0;
    const aWager = a.wagered?.[period] || 0;
    return bWager - aWager;
  });
}

/**
 * Transforms raw leaderboard data into standardized format
 */
export async function transformLeaderboardData(apiData: any) {
  try {
    const responseData = Array.isArray(apiData) ? apiData[0] : apiData;
    const users = responseData?.data || [];

    const transformedData = {
      status: "success",
      metadata: {
        totalUsers: users.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { data: sortByWagered(users, "today").filter(entry => entry.wagered?.today > 0) },
        weekly: { data: sortByWagered(users, "this_week").filter(entry => entry.wagered?.this_week > 0) },
        monthly: { data: sortByWagered(users, "this_month").filter(entry => entry.wagered?.this_month > 0) },
        all_time: { data: sortByWagered(users, "all_time").filter(entry => entry.wagered?.all_time > 0) }
      }
    };

    return transformedData;
  } catch (error) {
    console.error('Error transforming data:', error);
    throw error;
  }
}