import { pgTable, text, serial, timestamp, boolean, decimal, jsonb, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users, mockWagerData } from "@db/schema";

/**
 * Utility function to sort data by wagered amount
 */
function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0)
  );
}

/**
 * Transforms raw leaderboard data into standardized format, including mock data
 */
export async function transformLeaderboardData(apiData: any) {
  const responseData = apiData.data || apiData.results || apiData;
  if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
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
        all_time: { data: [] },
      },
    };
  }

  // Get all mock data
  const mockData = await db
    .select()
    .from(mockWagerData)
    .where(eq(mockWagerData.isMocked, true));

  const mockDataMap = new Map(mockData.map(m => [m.username, m]));

  const dataArray = Array.isArray(responseData) ? responseData : [responseData];
  const transformedData = dataArray.map((entry) => {
    const mockEntry = mockDataMap.get(entry.name);

    if (mockEntry) {
      // Use mock data if available
      return {
        uid: entry.uid || "",
        name: entry.name || "",
        wagered: {
          today: parseFloat(mockEntry.wageredToday),
          this_week: parseFloat(mockEntry.wageredThisWeek),
          this_month: parseFloat(mockEntry.wageredThisMonth),
          all_time: parseFloat(mockEntry.wageredAllTime),
        },
      };
    }

    // Use actual data
    return {
      uid: entry.uid || "",
      name: entry.name || "",
      wagered: {
        today: entry.wagered?.today || 0,
        this_week: entry.wagered?.this_week || 0,
        this_month: entry.wagered?.this_month || 0,
        all_time: entry.wagered?.all_time || 0,
      },
    };
  });

  // Add mock-only users that don't exist in the actual data
  mockData.forEach(mock => {
    if (!transformedData.some(d => d.name === mock.username)) {
      transformedData.push({
        uid: mock.userId.toString(),
        name: mock.username,
        wagered: {
          today: parseFloat(mock.wageredToday),
          this_week: parseFloat(mock.wageredThisWeek),
          this_month: parseFloat(mock.wageredThisMonth),
          all_time: parseFloat(mock.wageredAllTime),
        },
      });
    }
  });

  return {
    status: "success",
    metadata: {
      totalUsers: transformedData.length,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: sortByWagered(transformedData, "today") },
      weekly: { data: sortByWagered(transformedData, "this_week") },
      monthly: { data: sortByWagered(transformedData, "this_month") },
      all_time: { data: sortByWagered(transformedData, "all_time") },
    },
  };
}