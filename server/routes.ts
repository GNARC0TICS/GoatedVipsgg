import type { Express } from "express";
import { createServer, type Server } from "http";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from 'rate-limiter-flexible';

// API configuration with validation
export const API_CONFIG = {
  token: process.env.API_TOKEN || '',
  baseUrl: process.env.API_BASE_URL || "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate"
};

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

// Type definitions for API response
interface WageredData {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: WageredData;
}

interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
}

async function fetchLeaderboardData(): Promise<any> {
  try {
    log(`Making API request to: ${API_CONFIG.baseUrl}/referral-leaderboard`);

    const response = await fetch(`${API_CONFIG.baseUrl}/referral-leaderboard`, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`API Error (${response.status}): ${errorText}`);
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }

    const rawData = await response.json();

    // Detailed logging of API response structure
    log('API Response Structure:', {
      success: rawData.success,
      dataType: typeof rawData.data,
      isArray: Array.isArray(rawData.data),
      entryCount: rawData.data?.length || 0
    });

    // Validate API response structure
    if (!rawData.success || !Array.isArray(rawData.data)) {
      log('Invalid API response format:', rawData);
      throw new Error('Invalid API response format');
    }

    // Validate data entries
    const invalidEntries = rawData.data.filter(entry => 
      !entry.uid || 
      !entry.name || 
      !entry.wagered ||
      typeof entry.wagered.today !== 'number' ||
      typeof entry.wagered.this_week !== 'number' ||
      typeof entry.wagered.this_month !== 'number' ||
      typeof entry.wagered.all_time !== 'number'
    );

    if (invalidEntries.length > 0) {
      log('Found invalid entries:', invalidEntries);
      throw new Error(`Found ${invalidEntries.length} invalid entries in the data`);
    }

    // Log data statistics
    const stats = {
      totalEntries: rawData.data.length,
      uniqueUsers: new Set(rawData.data.map(entry => entry.uid)).size,
      activeThisWeek: rawData.data.filter(entry => entry.wagered.this_week > 0).length,
      totalWagered: rawData.data.reduce((sum, entry) => sum + entry.wagered.all_time, 0)
    };
    log('Data Statistics:', stats);

    // Transform and organize the data
    const transformedData = {
      success: true,
      metadata: {
        totalUsers: rawData.data.length,
        lastUpdated: new Date().toISOString(),
        stats
      },
      data: {
        all_time: {
          data: [...rawData.data].sort((a, b) => b.wagered.all_time - a.wagered.all_time)
        },
        monthly: {
          data: [...rawData.data].sort((a, b) => b.wagered.this_month - a.wagered.this_month)
        },
        weekly: {
          data: [...rawData.data].sort((a, b) => b.wagered.this_week - a.wagered.this_week)
        }
      }
    };

    // Log sample of transformed data
    log('Sample Transformed Data:', {
      totalEntries: transformedData.metadata.totalUsers,
      topAllTimeWager: transformedData.data.all_time.data[0]?.wagered.all_time,
      topWeeklyWager: transformedData.data.weekly.data[0]?.wagered.this_week
    });

    return transformedData;
  } catch (error) {
    log(`Error in fetchLeaderboardData: ${error}`);
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication
  setupAuth(app);

  // HTTP endpoint for leaderboard data
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      await rateLimiter.consume(req.ip || "unknown");
      const data = await fetchLeaderboardData();
      res.json(data);
    } catch (error: any) {
      if (error.consumedPoints) {
        res.status(429).json({ error: "Too many requests" });
      } else {
        log(`Error in /api/affiliate/stats: ${error}`);
        res.status(500).json({
          success: false,
          error: "Failed to fetch affiliate stats",
          message: error.message
        });
      }
    }
  });

  return httpServer;
}