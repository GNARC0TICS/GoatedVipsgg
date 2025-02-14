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
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users, mockWagerData } from "@db/schema";

/**
 * Utility function to sort data by wagered amount
 */
function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered?.[period] || 0) - (a.wagered?.[period] || 0)
  );
}

/**
 * Transforms raw leaderboard data into standardized format, including mock data
 */
export async function transformLeaderboardData(apiData: any) {
  // Ensure we have valid input data or return empty structure
  const responseData = apiData?.data || apiData?.results || apiData || {};

  // Default empty response structure
  const defaultResponse = {
    status: "success",
    metadata: {
      totalUsers: 0,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: [] },
      weekly: { data: [] },
      monthly: { data: [] },
      all_time: { data: [] },
    },
  };

  // Return default response if no valid data
  if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
    return defaultResponse;
  }

  try {
    // Get all mock data with safe type checking
    const mockData = await db
      .select()
      .from(mockWagerData)
      .where(eq(mockWagerData.isMocked, true));

    const mockDataMap = new Map(mockData.map(m => [m.username, m]));

    const dataArray = Array.isArray(responseData) ? responseData : [responseData];
    const transformedData = dataArray.map((entry) => {
      const mockEntry = mockDataMap.get(entry?.name || '');

      if (mockEntry) {
        // Use mock data if available with safe type conversion
        return {
          uid: entry?.uid || "",
          name: entry?.name || "",
          wagered: {
            today: Number(mockEntry.wageredToday) || 0,
            this_week: Number(mockEntry.wageredThisWeek) || 0,
            this_month: Number(mockEntry.wageredThisMonth) || 0,
            all_time: Number(mockEntry.wageredAllTime) || 0,
          },
        };
      }

      // Use actual data with safe defaults
      return {
        uid: entry?.uid || "",
        name: entry?.name || "",
        wagered: {
          today: Number(entry?.wagered?.today) || 0,
          this_week: Number(entry?.wagered?.this_week) || 0,
          this_month: Number(entry?.wagered?.this_month) || 0,
          all_time: Number(entry?.wagered?.all_time) || 0,
        },
      };
    });

    // Add mock-only users with safe type conversion
    mockData.forEach(mock => {
      if (!transformedData.some(d => d.name === mock.username)) {
        transformedData.push({
          uid: mock.userId?.toString() || "",
          name: mock.username || "",
          wagered: {
            today: Number(mock.wageredToday) || 0,
            this_week: Number(mock.wageredThisWeek) || 0,
            this_month: Number(mock.wageredThisMonth) || 0,
            all_time: Number(mock.wageredAllTime) || 0,
          },
        });
      }
    });

    // Sort data for each period with null checks
    return {
      status: "success",
      metadata: {
        totalUsers: transformedData.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { data: sortByWagered(transformedData, 'today') },
        weekly: { data: sortByWagered(transformedData, 'this_week') },
        monthly: { data: sortByWagered(transformedData, 'this_month') },
        all_time: { data: sortByWagered(transformedData, 'all_time') },
      },
    };
  } catch (error) {
    console.error('Error transforming leaderboard data:', error);
    return defaultResponse;
  }
}