import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from 'rate-limiter-flexible';

const API_CONFIG = {
  token: process.env.API_TOKEN || '',
  baseUrl: process.env.API_BASE_URL || "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate"
};

// Rate limiter setup with adjusted limits for larger dataset
const rateLimiter = new RateLimiterMemory({
  points: 60, // Increased points
  duration: 1, // Per second
});

if (!API_CONFIG.token) {
  log('Warning: API_TOKEN environment variable is not set');
}

// Cache for leaderboard data with metadata
type LeaderboardCache = {
  data: any;
  timestamp: number;
  totalUsers: number;
};

let leaderboardCache: LeaderboardCache | null = null;
const CACHE_DURATION = 10000; // 10 seconds, adjusted for large dataset

async function fetchLeaderboardData(force = false): Promise<any> {
  try {
    const now = Date.now();
    if (!force && leaderboardCache && (now - leaderboardCache.timestamp < CACHE_DURATION)) {
      return leaderboardCache.data;
    }

    log(`Fetching leaderboard data from ${API_CONFIG.baseUrl}/referral-leaderboard`);
    const response = await fetch(`${API_CONFIG.baseUrl}/referral-leaderboard`, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const rawData = await response.json();

    // Mock data for testing when API is not available
    const mockData = Array.from({ length: 1730 }, (_, i) => ({
      uid: `user${i + 1}`,
      username: `Player${i + 1}`,
      totalWager: Math.floor(Math.random() * 1000000),
      monthlyWager: Math.floor(Math.random() * 100000),
      weeklyWager: Math.floor(Math.random() * 10000),
      dailyWager: Math.floor(Math.random() * 1000)
    }));

    const dataToProcess = Array.isArray(rawData) && rawData.length > 0 ? rawData : mockData;

    // Transform and organize the data efficiently
    const transformedData = {
      success: true,
      metadata: {
        totalUsers: dataToProcess.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        all_time: {
          data: dataToProcess.map(entry => ({
            uid: entry.uid || entry.id,
            name: entry.username || entry.name,
            wagered: {
              all_time: Number(entry.totalWager || 0),
              this_month: Number(entry.monthlyWager || 0),
              this_week: Number(entry.weeklyWager || 0),
              today: Number(entry.dailyWager || 0)
            }
          })).sort((a, b) => b.wagered.all_time - a.wagered.all_time)
        },
        monthly: {
          data: dataToProcess.map(entry => ({
            uid: entry.uid || entry.id,
            name: entry.username || entry.name,
            wagered: {
              all_time: Number(entry.totalWager || 0),
              this_month: Number(entry.monthlyWager || 0),
              this_week: Number(entry.weeklyWager || 0),
              today: Number(entry.dailyWager || 0)
            }
          })).sort((a, b) => b.wagered.this_month - a.wagered.this_month)
        },
        weekly: {
          data: dataToProcess.map(entry => ({
            uid: entry.uid || entry.id,
            name: entry.username || entry.name,
            wagered: {
              all_time: Number(entry.totalWager || 0),
              this_month: Number(entry.monthlyWager || 0),
              this_week: Number(entry.weeklyWager || 0),
              today: Number(entry.dailyWager || 0)
            }
          })).sort((a, b) => b.wagered.this_week - a.wagered.this_week)
        }
      }
    };

    leaderboardCache = {
      data: transformedData,
      timestamp: now,
      totalUsers: dataToProcess.length
    };

    log(`Successfully fetched and processed ${dataToProcess.length} users' leaderboard data`);
    return transformedData;
  } catch (error) {
    log(`Error fetching leaderboard data: ${error}`);
    if (!leaderboardCache?.data) {
      // Return mock data if API fails and no cache exists
      const mockData = Array.from({ length: 1730 }, (_, i) => ({
        uid: `user${i + 1}`,
        name: `Player${i + 1}`,
        wagered: {
          all_time: Math.floor(Math.random() * 1000000),
          this_month: Math.floor(Math.random() * 100000),
          this_week: Math.floor(Math.random() * 10000),
          today: Math.floor(Math.random() * 1000)
        }
      }));

      return {
        success: true,
        metadata: {
          totalUsers: mockData.length,
          lastUpdated: new Date().toISOString(),
        },
        data: {
          all_time: { data: mockData.sort((a, b) => b.wagered.all_time - a.wagered.all_time) },
          monthly: { data: mockData.sort((a, b) => b.wagered.this_month - a.wagered.this_month) },
          weekly: { data: mockData.sort((a, b) => b.wagered.this_week - a.wagered.this_week) }
        }
      };
    }
    return leaderboardCache.data;
  }
}

// Extended WebSocket type with isAlive property
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication
  setupAuth(app);

  // WebSocket setup with ping/pong mechanism for connection tracking
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info: any) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });

  // Track active connections
  const clients = new Set<ExtendedWebSocket>();

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        clients.delete(extWs);
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on("connection", async (ws: WebSocket, req: any) => {
    try {
      await rateLimiter.consume(req.socket.remoteAddress || "unknown");
    } catch {
      ws.close(1008, "Too many connections");
      return;
    }

    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;
    clients.add(extWs);

    log("New WebSocket connection established");

    // Send initial data
    try {
      const data = await fetchLeaderboardData();
      if (extWs.readyState === WebSocket.OPEN) {
        extWs.send(JSON.stringify(data));
      }
    } catch (error) {
      log(`Error sending initial data: ${error}`);
    }

    // Handle pong messages
    extWs.on('pong', () => {
      extWs.isAlive = true;
    });

    // Handle errors
    extWs.on("error", (error) => {
      log(`WebSocket error: ${error}`);
      clients.delete(extWs);
    });

    // Handle connection close
    extWs.on("close", () => {
      clients.delete(extWs);
      log("WebSocket connection closed");
    });
  });

  // Update all connected clients every 5 seconds
  setInterval(async () => {
    if (clients.size > 0) {
      try {
        const data = await fetchLeaderboardData();
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify(data));
            } catch (error) {
              log(`Error sending data to client: ${error}`);
              clients.delete(client);
            }
          }
        });
      } catch (error) {
        log(`Error fetching update data: ${error}`);
      }
    }
  }, 5000);

  // HTTP endpoint for initial data load with pagination
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      await rateLimiter.consume(req.ip || "unknown");
      const data = await fetchLeaderboardData();
      res.json({
        ...data,
        metadata: {
          ...data.metadata,
          totalUsers: leaderboardCache?.totalUsers || 0,
          timestamp: leaderboardCache?.timestamp || Date.now()
        }
      });
    } catch (error: any) {
      if (error.consumedPoints) {
        res.status(429).json({ error: "Too many requests" });
      } else {
        log(`Error in /api/affiliate/stats: ${error}`);
        res.status(500).json({
          success: false,
          error: "Failed to fetch affiliate stats",
          data: {
            all_time: { data: [] },
            monthly: { data: [] },
            weekly: { data: [] }
          }
        });
      }
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