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
import express from "express";
import cors from "cors";

interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
}

export function registerRoutes(app: Express): Server {
  log("[Server] Starting route registration...");

  // Basic middleware setup
  app.use(express.json());
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  log("[Server] Basic middleware configured");

  // Create HTTP server first
  const httpServer = createServer(app);

  // Setup auth before routes
  setupAuth(app);
  log("[Server] Authentication middleware setup complete");

  // API Routes configuration with enhanced logging
  const apiRouter = Router();

  // Add auth-related routes to API router
  apiRouter.get("/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ user: req.user });
  });

  // Mount user routes first to handle auth endpoints
  apiRouter.use("/", usersRouter);
  log("[Server] User routes mounted");

  apiRouter.use("/bonus", bonusChallengesRouter);
  log("[Server] Bonus challenge routes mounted");

  // Health check endpoint
  apiRouter.get("/health", async (_req, res) => {
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

  // Mount the combined API router with security headers
  app.use("/api", (req, res, next) => {
    log(`[API] ${req.method} ${req.path}`);
    // Set common API headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  }, apiRouter);

  log("[Server] API routes mounted at /api");

  // Wager races endpoint
  apiRouter.get("/wager-races/current",
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
        const raceData = formatRaceData(transformLeaderboardData(rawData));

        res.json(raceData);
      } catch (error) {
        console.error('Error in /wager-races/current:', error);
        res.status(200).json(getDefaultRaceData());
      }
    }
  );


  // Create a temporary stub for the missing affiliate stats endpoint
  apiRouter.get("/affiliate/stats", (req, res) => {
    res.json({
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingPayouts: 0,
      recentActivity: []
    });
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    log(`[Error] ${err.message}`);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  });

  // Setup WebSocket after routes but before server starts
  setupWebSocket(httpServer);

  return httpServer;
}

let wsServer: WebSocketServer;

function setupWebSocket(httpServer: Server) {
  log("[WebSocket] Initializing WebSocket server...");
  wsServer = new WebSocketServer({
    noServer: true,
    path: "/ws"
  });

  httpServer.on("upgrade", (request, socket, head) => {
    // Skip Vite HMR requests
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      log("[WebSocket] Skipping Vite HMR WebSocket request");
      return;
    }

    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const pathname = url.pathname;

    log(`[WebSocket] Upgrade request received for: ${pathname}`);

    if (pathname === "/ws/leaderboard" || pathname === "/ws/transformation-logs") {
      wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit("connection", ws, request);
        const customWs = ws as CustomWebSocket;
        if (pathname === "/ws/leaderboard") {
          handleLeaderboardConnection(customWs);
        } else {
          handleTransformationLogsConnection(customWs);
        }
      });
    } else {
      log(`[WebSocket] Invalid WebSocket path: ${pathname}`);
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
    }
  });

  log("[WebSocket] WebSocket server initialized");
}

function handleLeaderboardConnection(ws: CustomWebSocket) {
  const clientId = Date.now().toString();
  log(`[WebSocket] Leaderboard client connected (${clientId})`);

  ws.isAlive = true;
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      log(`[WebSocket] Sending ping to leaderboard client (${clientId})`);
      ws.ping();
    }
  }, 30000);

  ws.on("pong", () => {
    log(`[WebSocket] Received pong from leaderboard client (${clientId})`);
    ws.isAlive = true;
  });

  ws.on("error", (error: Error) => {
    log(`[WebSocket] Leaderboard client error (${clientId}): ${error.message}`);
    clearInterval(pingInterval);
    ws.terminate();
  });

  ws.on("close", () => {
    log(`[WebSocket] Leaderboard client disconnected (${clientId})`);
    clearInterval(pingInterval);
  });

  if (ws.readyState === WebSocket.OPEN) {
    const message = {
      type: "CONNECTED",
      clientId,
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(message));
    log(`[WebSocket] Sent connection confirmation to leaderboard client (${clientId})`);
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

function getDefaultRaceData() {
  const now = new Date();
  return {
    id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
    status: 'live',
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
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


const CACHE_TIMES = {
  SHORT: 15000,    // 15 seconds
  MEDIUM: 60000,   // 1 minute
  LONG: 300000     // 5 minutes
};

export { router };