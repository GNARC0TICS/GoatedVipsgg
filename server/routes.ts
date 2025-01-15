import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { db } from "@db";
import { affiliateStats, users } from "@db/schema";
import { desc, sql } from "drizzle-orm";

// Function to fetch affiliate data from database
async function fetchAffiliateStats(period: 'weekly' | 'monthly' | 'all_time') {
  const now = new Date();
  let timeFilter;

  switch (period) {
    case 'weekly':
      timeFilter = sql`timestamp >= date_trunc('week', ${now}::timestamp)`;
      break;
    case 'monthly':
      timeFilter = sql`timestamp >= date_trunc('month', ${now}::timestamp)`;
      break;
    case 'all_time':
    default:
      timeFilter = sql`true`;
      break;
  }

  try {
    const stats = await db
      .select({
        username: users.username,
        totalWager: sql<number>`sum(${affiliateStats.totalWager})`,
        commission: sql<number>`sum(${affiliateStats.commission})`
      })
      .from(affiliateStats)
      .innerJoin(users, sql`${users.id} = ${affiliateStats.userId}`)
      .where(timeFilter)
      .groupBy(users.username)
      .orderBy(desc(sql`sum(${affiliateStats.totalWager})`))
      .limit(10);

    return stats.map(stat => ({
      ...stat,
      totalWager: Number(stat.totalWager) || 0,
      commission: Number(stat.commission) || 0
    }));
  } catch (error) {
    log(`Error fetching affiliate stats: ${error}`);
    throw error;
  }
}

// Function to generate the full leaderboard data
async function generateLeaderboardData() {
  try {
    const [weeklyData, monthlyData, allTimeData] = await Promise.all([
      fetchAffiliateStats('weekly'),
      fetchAffiliateStats('monthly'),
      fetchAffiliateStats('all_time')
    ]);

    return {
      weekly: { data: weeklyData },
      monthly: { data: monthlyData },
      all_time: { data: allTimeData }
    };
  } catch (error) {
    log(`Error generating leaderboard data: ${error}`);
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication
  setupAuth(app);

  // Setup WebSocket server for real-time leaderboard updates
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info: any) => {
      // Ignore Vite HMR WebSocket connections
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    log("New WebSocket connection established for leaderboard");
    let interval: NodeJS.Timeout;

    const sendLeaderboardData = async () => {
      try {
        if (ws.readyState === ws.OPEN) {
          const data = await generateLeaderboardData();
          ws.send(JSON.stringify(data));
        }
      } catch (error) {
        log(`Error sending leaderboard data: ${error}`);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ error: "Failed to fetch leaderboard data" }));
        }
      }
    };

    // Send initial data
    sendLeaderboardData();

    // Set up interval for updates (every 5 seconds)
    interval = setInterval(sendLeaderboardData, 5000);

    ws.on("error", (error) => {
      log(`WebSocket error occurred: ${error}`);
    });

    ws.on("close", () => {
      clearInterval(interval);
      log("WebSocket connection closed");
    });
  });

  // HTTP endpoint for initial data load
  app.get("/api/affiliate/stats", async (_req, res) => {
    try {
      const data = await generateLeaderboardData();
      res.json(data);
    } catch (error) {
      log(`Error in /api/affiliate/stats: ${error}`);
      res.status(500).json({ error: "Failed to fetch affiliate stats" });
    }
  });

  // Bonus codes endpoint
  app.get("/api/bonus-codes", (_req, res) => {
    try {
      const BONUS_CODES = [
        {
          code: "WELCOME2024",
          description: "New player welcome bonus",
          expiryDate: "2024-02-15",
          value: "100% up to $100"
        },
        {
          code: "GOATEDVIP",
          description: "VIP exclusive reload bonus",
          expiryDate: "2024-01-31",
          value: "50% up to $500"
        },
        {
          code: "WEEKEND50",
          description: "Weekend special bonus",
          expiryDate: "2024-01-20",
          value: "50% up to $200"
        }
      ];
      res.json({ bonusCodes: BONUS_CODES });
    } catch (error) {
      log(`Error in /api/bonus-codes: ${error}`);
      res.status(500).json({ error: "Failed to fetch bonus codes" });
    }
  });

  return httpServer;
}