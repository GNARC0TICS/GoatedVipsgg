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
import { users, mockWagerData, transformationLogs } from "@db/schema";
import { broadcastTransformationLog } from "../routes";

/**
 * Utility function to sort data by wagered amount with safe defaults
 */
function sortByWagered(data: any[], period: string) {
  if (!Array.isArray(data)) {
    console.warn(`Invalid data passed to sortByWagered: ${typeof data}`);
    return [];
  }

  return [...data].sort(
    (a, b) => {
      const bValue = Number(b?.wagered?.[period] ?? 0);
      const aValue = Number(a?.wagered?.[period] ?? 0);
      return bValue - aValue;
    }
  );
}

/**
 * Transforms raw leaderboard data into standardized format, including mock data
 */
export async function transformLeaderboardData(apiData: any) {
  const startTime = Date.now();

  try {
    console.log('Transforming leaderboard data:', { 
      dataType: typeof apiData,
      hasData: Boolean(apiData),
      structure: apiData ? Object.keys(apiData) : null
    });

    broadcastTransformationLog({
      type: 'info',
      message: 'Starting leaderboard transformation',
      data: {
        dataType: typeof apiData,
        hasStructure: Boolean(apiData && Object.keys(apiData).length)
      }
    });

    // Ensure we have valid input data or return empty structure
    const responseData = apiData?.data || apiData?.results || apiData || [];

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

    // Get all mock data with safe type checking
    const mockData = await db
      .select()
      .from(mockWagerData)
      .where(eq(mockWagerData.isMocked, true));

    const mockDataMap = new Map(mockData.map(m => [m.username, m]));

    const dataArray = Array.isArray(responseData) ? responseData : [responseData];
    console.log('Processing data array:', { length: dataArray.length });

    broadcastTransformationLog({
      type: 'info',
      message: 'Processing wager data',
      data: { recordCount: dataArray.length }
    });

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

    console.log('Transformation complete:', { 
      totalTransformed: transformedData.length,
      hasMockData: mockData.length > 0
    });

    broadcastTransformationLog({
      type: 'info',
      message: 'Transformation complete',
      data: {
        totalTransformed: transformedData.length,
        processingTimeMs: Date.now() - startTime
      }
    });

    // Log transformation metrics
    await db.insert(transformationLogs).values({
      type: 'info',
      message: 'Leaderboard transformation completed successfully',
      payload: {
        recordCount: dataArray.length,
        mockDataCount: mockData.length,
        transformedCount: transformedData.length
      },
      duration_ms: Date.now() - startTime,
      created_at: new Date(),
      resolved: false
    });

    // Return transformed data with guaranteed structure
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

    broadcastTransformationLog({
      type: 'error',
      message: 'Transformation failed',
      data: {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime
      }
    });

    // Log error metrics
    await db.insert(transformationLogs).values({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      payload: {
        error: error instanceof Error ? error.stack : undefined,
        input: apiData ? { type: typeof apiData, keys: Object.keys(apiData) } : null
      },
      duration_ms: Date.now() - startTime,
      created_at: new Date(),
      resolved: false
    });

    return defaultResponse;
  }
}