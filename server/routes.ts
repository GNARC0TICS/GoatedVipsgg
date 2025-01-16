import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from 'rate-limiter-flexible';

const API_CONFIG = {
  token: process.env.API_TOKEN || '',
  baseUrl: "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate"
};

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 30, // Number of points
  duration: 1, // Per second
});

if (!API_CONFIG.token) {
  log('Warning: API_TOKEN environment variable is not set');
}

// Cache for leaderboard data
let cachedLeaderboardData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

async function fetchLeaderboardData(force = false) {
  try {
    const now = Date.now();
    if (!force && cachedLeaderboardData && (now - lastFetchTime < CACHE_DURATION)) {
      return cachedLeaderboardData;
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

    const data = await response.json();

    const transformedData = {
      success: true,
      data: {
        all_time: { 
          data: Array.isArray(data) ? data.map(entry => ({
            uid: entry.uid || entry.id,
            name: entry.username || entry.name,
            wagered: {
              all_time: Number(entry.totalWager || 0),
              this_month: Number(entry.monthlyWager || 0),
              this_week: Number(entry.weeklyWager || 0)
            }
          })) : []
        },
        monthly: { 
          data: Array.isArray(data) ? data.map(entry => ({
            uid: entry.uid || entry.id,
            name: entry.username || entry.name,
            wagered: {
              all_time: Number(entry.totalWager || 0),
              this_month: Number(entry.monthlyWager || 0),
              this_week: Number(entry.weeklyWager || 0)
            }
          })) : []
        },
        weekly: { 
          data: Array.isArray(data) ? data.map(entry => ({
            uid: entry.uid || entry.id,
            name: entry.username || entry.name,
            wagered: {
              all_time: Number(entry.totalWager || 0),
              this_month: Number(entry.monthlyWager || 0),
              this_week: Number(entry.weeklyWager || 0)
            }
          })) : []
        }
      }
    };

    cachedLeaderboardData = transformedData;
    lastFetchTime = now;
    log('Successfully fetched leaderboard data');
    return transformedData;
  } catch (error) {
    log(`Error fetching leaderboard data: ${error}`);
    if (!cachedLeaderboardData) {
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
    return cachedLeaderboardData;
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

  // WebSocket setup with connection tracking
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info: any) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });

  // Track active connections
  const clients = new Set<ExtendedWebSocket>();
  let updateInterval: NodeJS.Timeout;

  wss.on("connection", async (ws: WebSocket, req: any) => {
    const extWs = ws as ExtendedWebSocket;

    try {
      await rateLimiter.consume(req.socket.remoteAddress);
    } catch {
      extWs.close(1008, "Too many connections");
      return;
    }

    log("New WebSocket connection established");
    clients.add(extWs);

    // Send initial data
    const initialData = await fetchLeaderboardData();
    if (extWs.readyState === 1) { // WebSocket.OPEN is 1
      extWs.send(JSON.stringify(initialData));
    }

    // Setup ping-pong to detect stale connections
    extWs.isAlive = true;
    extWs.on('pong', () => { extWs.isAlive = true; });

    extWs.on("error", (error) => {
      log(`WebSocket error: ${error}`);
      clients.delete(extWs);
    });

    extWs.on("close", () => {
      clients.delete(extWs);
      log("WebSocket connection closed");
    });

    // Start update interval if this is the first client
    if (clients.size === 1) {
      updateInterval = setInterval(async () => {
        const data = await fetchLeaderboardData();

        // Ping all clients and remove dead connections
        for (const client of clients) {
          if (!client.isAlive) {
            clients.delete(client);
            client.terminate();
            continue;
          }

          client.isAlive = false;
          client.ping();

          if (client.readyState === 1) { // WebSocket.OPEN is 1
            try {
              client.send(JSON.stringify(data));
            } catch (error) {
              log(`Error sending data to client: ${error}`);
              clients.delete(client);
            }
          }
        }

        // Clear interval if no clients are connected
        if (clients.size === 0) {
          clearInterval(updateInterval);
        }
      }, 5000);
    }
  });

  // HTTP endpoint for initial data load
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