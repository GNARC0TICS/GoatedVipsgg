import { Router, type Express } from "express";
import { setupAuth } from "./auth";
import usersRouter from "./routes/users";
import bonusChallengesRouter from "./routes/bonus-challenges";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./vite";
import { RateLimiterMemory, type RateLimiterRes } from 'rate-limiter-flexible';
import { z } from "zod";
import type { SelectUser } from "@db/schema";
import { initializeBot } from "./telegram/bot";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { wagerRaces, transformationLogs } from "@db/schema";
import { API_CONFIG } from "./config/api";

// Extend WebSocket interface with our custom properties
interface CustomWebSocket extends WebSocket {
  isAlive?: boolean;
}

type RateLimitTier = 'HIGH' | 'MEDIUM' | 'LOW';
const rateLimits: Record<RateLimitTier, { points: number; duration: number }> = {
  HIGH: { points: 30, duration: 60 },
  MEDIUM: { points: 15, duration: 60 },
  LOW: { points: 5, duration: 60 }
};

const rateLimiters = {
  high: new RateLimiterMemory(rateLimits.HIGH),
  medium: new RateLimiterMemory(rateLimits.MEDIUM),
  low: new RateLimiterMemory(rateLimits.LOW),
};

const createRateLimiter = (tier: keyof typeof rateLimiters) => {
  const limiter = rateLimiters[tier];
  return async (req: any, res: any, next: any) => {
    try {
      const rateLimitRes = await limiter.consume(req.ip);
      res.setHeader('X-RateLimit-Limit', rateLimits[tier.toUpperCase() as RateLimitTier].points);
      res.setHeader('X-RateLimit-Remaining', rateLimitRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitRes.msBeforeNext).toISOString());
      next();
    } catch (rejRes) {
      const rejection = rejRes as RateLimiterRes;
      res.setHeader('Retry-After', Math.ceil(rejection.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejection.msBeforeNext).toISOString());
      res.status(429).json({
        status: 'error',
        message: 'Too many requests',
        retryAfter: Math.ceil(rejection.msBeforeNext / 1000)
      });
    }
  };
};

class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly defaultTTL: number;

  constructor(defaultTTL = 30000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  get(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cacheManager = new CacheManager();

const cacheMiddleware = (ttl = 30000) => async (req: any, res: any, next: any) => {
  const key = req.originalUrl;
  const cachedResponse = cacheManager.get(key);
  if (cachedResponse) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cachedResponse);
  }
  res.originalJson = res.json;
  res.json = (body: any) => {
    cacheManager.set(key, body);
    return res.originalJson(body);
  };
  next();
};

// Router setup
const router = Router();

// Constants
const CACHE_TIMES = {
  SHORT: 15000,    // 15 seconds
  MEDIUM: 60000,   // 1 minute
  LONG: 300000     // 5 minutes
};

// Health check endpoint
router.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      db: "connected",
      telegramBot: global.botInstance ? "initialized" : "not initialized",
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: process.env.NODE_ENV === "production" ? "Health check failed" : (error as Error).message
    });
  }
});

// Affiliate stats endpoint with transformation logging
router.get("/affiliate/stats",
  createRateLimiter('medium'),
  cacheMiddleware(CACHE_TIMES.MEDIUM),
  async (req, res) => {
    try {
      const username = typeof req.query.username === 'string' ? req.query.username : undefined;
      let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

      if (username) {
        url += `?username=${encodeURIComponent(username)}`;
      }

      log('Fetching affiliate stats from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          log("API Authentication failed - check API token");
          throw new ApiError("API Authentication failed", { status: 401 });
        }
        throw new ApiError(`API request failed: ${response.status}`, { status: response.status });
      }

      const rawData = await response.json();
      const startTime = Date.now();

      // Log raw data structure
      log('Raw API response structure:', {
        hasData: Boolean(rawData),
        dataStructure: typeof rawData,
        keys: Object.keys(rawData),
        hasResults: Boolean(rawData?.results),
        resultsLength: rawData?.results?.length,
      });

      const transformedData = await transformLeaderboardData(rawData);
      const duration = Date.now() - startTime;

      // Log transformation metrics
      broadcastTransformationLog({
        type: 'info',
        message: 'Data transformation completed',
        data: {
          duration_ms: duration,
          total_entries: transformedData.metadata?.totalUsers,
        }
      });

      log('Transformed leaderboard data:', {
        status: transformedData.status,
        totalUsers: transformedData.metadata?.totalUsers,
        dataLengths: {
          today: transformedData.data?.today?.data?.length,
          weekly: transformedData.data?.weekly?.data?.length,
          monthly: transformedData.data?.monthly?.data?.length,
          allTime: transformedData.data?.all_time?.data?.length,
        }
      });

      res.json(transformedData);
    } catch (error) {
      log(`Error in /api/affiliate/stats: ${error}`);
      broadcastTransformationLog({
        type: 'error',
        message: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      res.status(error instanceof ApiError ? error.status || 500 : 500).json({
        status: "error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
        data: {
          today: { data: [] },
          weekly: { data: [] },
          monthly: { data: [] },
          all_time: { data: [] },
        },
      });
    }
  }
);

// Wager races endpoint
router.get("/wager-races/current",
  createRateLimiter('high'),
  cacheMiddleware(CACHE_TIMES.SHORT),
  async (_req, res) => {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return res.json(getDefaultRaceData());
      }

      const rawData = await response.json();
      const stats = await transformLeaderboardData(rawData);
      const raceData = formatRaceData(stats);

      res.json(raceData);
    } catch (error) {
      console.error('Error in /wager-races/current:', error);
      res.status(200).json(getDefaultRaceData());
    }
  }
);

// Helper functions
function getDefaultRaceData() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
    status: 'live',
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: endOfMonth.toISOString(),
    prizePool: 500,
    participants: []
  };
}

function formatRaceData(stats: any) {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const monthlyData = stats?.data?.monthly?.data ?? [];

  return {
    id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
    status: 'live',
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: endOfMonth.toISOString(),
    prizePool: 500,
    participants: monthlyData
      .map((participant: any, index: number) => ({
        uid: participant?.uid ?? "",
        name: participant?.name ?? "Unknown",
        wagered: Number(participant?.wagered?.this_month ?? 0),
        position: index + 1
      }))
      .slice(0, 10)
  };
}

function formatRaceData(stats: any) {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const monthlyData = stats?.data?.monthly?.data ?? [];

  return {
    id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
    status: 'live',
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: endOfMonth.toISOString(),
    prizePool: 500,
    participants: monthlyData
      .map((participant: any, index: number) => ({
        uid: participant?.uid ?? "",
        name: participant?.name ?? "Unknown",
        wagered: Number(participant?.wagered?.this_month ?? 0),
        position: index + 1
      }))
      .slice(0, 10)
  };
}

export function transformLeaderboardData(apiData: any) {
  const data = apiData.data || apiData.results || apiData;
  if (!Array.isArray(data)) {
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

  const todayData = [...data].sort((a, b) => (b.wagered.today || 0) - (a.wagered.today || 0));
  const weeklyData = [...data].sort((a, b) => (b.wagered.this_week || 0) - (a.wagered.this_week || 0));
  const monthlyData = [...data].sort((a, b) => (b.wagered.this_month || 0) - (a.wagered.this_month || 0));
  const allTimeData = [...data].sort((a, b) => (b.wagered.all_time || 0) - (a.wagered.all_time || 0));

  return {
    status: "success",
    metadata: {
      totalUsers: data.length,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: todayData },
      weekly: { data: weeklyData },
      monthly: { data: monthlyData },
      all_time: { data: allTimeData },
    },
  };
}

// Export functions and router
export { router };

//This is the new registerRoutes function.
export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication first
  setupAuth(app);

  // API Routes configuration
  app.use('/api', (req, res, next) => {
    // Set common API headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Mount all API routes under /api prefix
  app.use("/api/users", usersRouter);
  app.use("/api/bonus", bonusChallengesRouter);
  app.use("/api", router);

  // Setup WebSocket after HTTP server is created but before Vite
  setupWebSocket(httpServer);

  return httpServer;
}

let wsServer: WebSocketServer;

function setupWebSocket(httpServer: Server) {
  wsServer = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    const url = request.url;

    if (url === "/ws/leaderboard" || url === "/ws/transformation-logs") {
      wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit("connection", ws, request);
        if (url === "/ws/leaderboard") {
          handleLeaderboardConnection(ws as CustomWebSocket);
        } else {
          handleTransformationLogsConnection(ws as CustomWebSocket);
        }
      });
    } else {
      socket.destroy();
    }
  });
}

function handleLeaderboardConnection(ws: CustomWebSocket) {
  const clientId = Date.now().toString();
  log(`Leaderboard WebSocket client connected (${clientId})`);

  ws.isAlive = true;
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", (error: Error) => {
    log(`WebSocket error (${clientId}): ${error.message}`);
    clearInterval(pingInterval);
    ws.terminate();
  });

  ws.on("close", () => {
    log(`Leaderboard WebSocket client disconnected (${clientId})`);
    clearInterval(pingInterval);
  });

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      clientId,
      timestamp: Date.now()
    }));
  }
}

function handleTransformationLogsConnection(ws: CustomWebSocket) {
  const clientId = Date.now().toString();
  log(`Transformation logs WebSocket client connected (${clientId})`);

  ws.isAlive = true;
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    clearInterval(pingInterval);
    log(`Transformation logs WebSocket client disconnected (${clientId})`);
  });

  ws.on("error", (error: Error) => {
    log(`WebSocket error (${clientId}): ${error.message}`);
    clearInterval(pingInterval);
    ws.terminate();
  });

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      clientId,
      timestamp: Date.now()
    }));

    // Send recent logs on connection
    db.select()
      .from(transformationLogs)
      .orderBy(sql`created_at DESC`)
      .limit(50)
      .then(logs => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "INITIAL_LOGS",
            logs: logs.map(log => ({
              ...log,
              timestamp: log.created_at.toISOString()
            }))
          }));
        }
      })
      .catch(error => {
        console.error("Error fetching initial logs:", error);
      });
  }
}

export function broadcastLeaderboardUpdate(data: any) {
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "LEADERBOARD_UPDATE",
        data
      }));
    }
  });
}

export function broadcastTransformationLog(log: {
  type: 'info' | 'error' | 'warning';
  message: string;
  data?: any;
}) {
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "TRANSFORMATION_LOG",
        log: {
          ...log,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
}