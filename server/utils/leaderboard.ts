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
    // Extract users array from API response
    const users = apiData?.data || [];

    // Map the external API data structure to our internal format
    const mappedUsers = users.map((user: any) => ({
      uid: user.id || '',
      name: user.username || 'Anonymous',
      wagered: {
        today: parseFloat(user.today || 0),
        this_week: parseFloat(user.weekly || 0),
        this_month: parseFloat(user.monthly || 0),
        all_time: parseFloat(user.total || 0)
      }
    }));

    // Transform and sort data for each time period
    const transformedData = {
      status: "success",
      metadata: {
        totalUsers: mappedUsers.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { 
          data: sortByWagered(mappedUsers, "today")
            .filter(entry => entry.wagered?.today > 0)
        },
        weekly: { 
          data: sortByWagered(mappedUsers, "this_week")
            .filter(entry => entry.wagered?.this_week > 0)
        },
        monthly: { 
          data: sortByWagered(mappedUsers, "this_month")
            .filter(entry => entry.wagered?.this_month > 0)
        },
        all_time: { 
          data: sortByWagered(mappedUsers, "all_time")
            .filter(entry => entry.wagered?.all_time > 0)
        }
      }
    };

    return transformedData;
  } catch (error) {
    console.error('Error transforming data:', error);
    throw error;
  }
}