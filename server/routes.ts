import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from 'rate-limiter-flexible';

const API_CONFIG = {
  token: process.env.API_TOKEN || '',
  baseUrl: process.env.API_BASE_URL || "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate"
};

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
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
const CACHE_DURATION = 10000; // 10 seconds

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

    if (!rawData.success || !Array.isArray(rawData.data)) {
      throw new Error('Invalid API response format');
    }

    // Transform and organize the data based on the actual API response structure
    const transformedData = {
      success: true,
      metadata: {
        totalUsers: rawData.data.length,
        lastUpdated: new Date().toISOString(),
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

    leaderboardCache = {
      data: transformedData,
      timestamp: now,
      totalUsers: rawData.data.length
    };

    log(`Successfully fetched and processed ${rawData.data.length} users' leaderboard data`);
    return transformedData;
  } catch (error) {
    log(`Error fetching leaderboard data: ${error}`);
    if (!leaderboardCache?.data) {
      return {
        success: false,
        error: "Failed to fetch leaderboard data",
        data: {
          all_time: { data: [] },
          monthly: { data: [] },
          weekly: { data: [] }
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

  // WebSocket setup with ping/pong mechanism
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info: any) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });

  // Track active connections
  const clients = new Set<ExtendedWebSocket>();

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
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

    extWs.on('pong', () => {
      extWs.isAlive = true;
    });

    extWs.on("error", (error) => {
      log(`WebSocket error: ${error}`);
      clients.delete(extWs);
    });

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

  // HTTP endpoint for initial data load
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
          error: "Failed to fetch affiliate stats"
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