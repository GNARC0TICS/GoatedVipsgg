import { pgTable, text, serial, timestamp, boolean, decimal, jsonb, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users, mockWagerData } from "@db/schema";

interface WagerData {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface LeaderboardUser {
  uid: string;
  name: string;
  wagered: WagerData;
}

/**
 * Utility function to sort data by wagered amount
 */
function sortByWagered(data: LeaderboardUser[], period: keyof WagerData): LeaderboardUser[] {
  return [...data].sort((a, b) => {
    const bWager = parseFloat(String(b.wagered[period] || 0));
    const aWager = parseFloat(String(a.wagered[period] || 0));
    return bWager - aWager;
  });
}

/**
 * Transforms raw leaderboard data into standardized format
 */
export async function transformLeaderboardData(apiData: any) {
  try {
    console.log('Transforming leaderboard data. Raw input:', JSON.stringify(apiData).slice(0, 200) + '...');

    // Extract users array from API response
    const users = Array.isArray(apiData) ? apiData : (apiData?.data || []);
    console.log(`Found ${users.length} users to process`);

    // Map the external API data structure to our internal format
    const mappedUsers: LeaderboardUser[] = users.map((user: any) => ({
      uid: user.uid || '',
      name: user.name || 'Anonymous',
      wagered: {
        today: parseFloat(user.wagered?.today || 0),
        this_week: parseFloat(user.wagered?.this_week || 0),
        this_month: parseFloat(user.wagered?.this_month || 0),
        all_time: parseFloat(user.wagered?.all_time || 0)
      }
    }));

    console.log('Sample mapped user:', JSON.stringify(mappedUsers[0]));

    // Transform and sort data for each time period
    const transformedData = {
      data: {
        today: { 
          data: sortByWagered(mappedUsers, 'today')
        },
        weekly: { 
          data: sortByWagered(mappedUsers, 'this_week')
        },
        monthly: { 
          data: sortByWagered(mappedUsers, 'this_month')
        },
        all_time: { 
          data: sortByWagered(mappedUsers, 'all_time')
        }
      }
    };

    console.log('Transformed data stats:', {
      today: transformedData.data.today.data.length,
      weekly: transformedData.data.weekly.data.length,
      monthly: transformedData.data.monthly.data.length,
      all_time: transformedData.data.all_time.data.length
    });

    // Log top 3 users for debugging
    console.log('Top 3 users (all time):', 
      transformedData.data.all_time.data
        .slice(0, 3)
        .map(user => ({
          name: user.name,
          wagered: user.wagered.all_time
        }))
    );

    return transformedData;
  } catch (error) {
    console.error('Error transforming data:', error);
    throw error;
  }
}