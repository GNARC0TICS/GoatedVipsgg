import { pgTable, text, serial, timestamp, boolean, decimal, jsonb, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users, mockWagerData } from "@db/schema";

/**
 * Utility function to sort data by wagered amount
 */
function sortByWagered(data: any[], period: string) {
  return [...data].sort((a, b) => {
    const bWager = typeof b.wagered === 'number' ? b.wagered : (b.wagered?.[period] || 0);
    const aWager = typeof a.wagered === 'number' ? a.wagered : (a.wagered?.[period] || 0);
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
    const mappedUsers = users.map((user: any) => ({
      uid: user.uid || '',  // Changed from id to uid
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
      status: "success",
      metadata: {
        totalUsers: mappedUsers.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { 
          data: sortByWagered(mappedUsers.map(user => ({
            ...user,
            wagered: user.wagered.today
          })), "today")
          .filter(entry => entry.wagered > 0)
        },
        weekly: { 
          data: sortByWagered(mappedUsers.map(user => ({
            ...user,
            wagered: user.wagered.this_week
          })), "this_week")
          .filter(entry => entry.wagered > 0)
        },
        monthly: { 
          data: sortByWagered(mappedUsers.map(user => ({
            ...user,
            wagered: user.wagered.this_month
          })), "this_month")
          .filter(entry => entry.wagered > 0)
        },
        all_time: { 
          data: sortByWagered(mappedUsers.map(user => ({
            ...user,
            wagered: user.wagered.all_time
          })), "all_time")
          .filter(entry => entry.wagered > 0)
        }
      }
    };

    console.log('Transformed data stats:', {
      today: transformedData.data.today.data.length,
      weekly: transformedData.data.weekly.data.length,
      monthly: transformedData.data.monthly.data.length,
      all_time: transformedData.data.all_time.data.length
    });

    return transformedData;
  } catch (error) {
    console.error('Error transforming data:', error);
    throw error;
  }
}