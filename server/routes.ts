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
  apiRouter.use("/bonus", bonusChallengesRouter);

  // Health check endpoint
  apiRouter.get("/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        db: "connected",
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: process.env.NODE_ENV === "production" ? "Health check failed" : (error as Error).message
      });
    }
  });

  // Affiliate stats endpoint with auth check and error handling
  apiRouter.get("/affiliate/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

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
        throw new Error(`API request failed with status ${response.status}`);
      }

      const rawData = await response.json();

      // Transform and validate the data
      const transformedData = await transformLeaderboardData(rawData);

      // Store in database and broadcast updates
      await storeLeaderboardData(transformedData);

      res.json(transformedData);
    } catch (error) {
      console.error('Error in /affiliate/stats:', error);
      // Send a structured error response
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch leaderboard data",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Mount the combined API router with security headers
  app.use("/api", (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  }, apiRouter);

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


  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Error] ${err.message}`);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  });

  // Setup WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}

let wsServer: WebSocketServer;

function setupWebSocket(httpServer: Server) {
  wsServer = new WebSocketServer({
    noServer: true,
    path: "/ws"
  });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    const url = new URL(request.url || '', `http://${request.headers.host}`);
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request);
      setupWebSocketHandlers(ws as CustomWebSocket);
    });
  });
}

function setupWebSocketHandlers(ws: CustomWebSocket) {
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
  });

  ws.on("error", (error: Error) => {
    console.error('WebSocket error:', error);
    clearInterval(pingInterval);
    ws.terminate();
  });

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      timestamp: new Date().toISOString()
    }));
  }
}

async function storeLeaderboardData(data: any) {
  const now = new Date();

  await db.transaction(async (tx) => {
    // Log the transformation
    await tx.insert(transformationLogs).values({
      type: 'info',
      message: 'Leaderboard data stored',
      payload: JSON.stringify(data),
      duration_ms: '0',
      created_at: now,
      resolved: true
    });

    // Broadcast the update
    wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "LEADERBOARD_UPDATE",
          data,
          timestamp: now.toISOString()
        }));
      }
    });
  });
}

// Common cache times
const CACHE_TIMES = {
  SHORT: 15000,    // 15 seconds
  MEDIUM: 60000,   // 1 minute
  LONG: 300000     // 5 minutes
};

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

function transformLeaderboardData(apiData: any) {
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


export { broadcastTransformationLog, setupWebSocket, registerRoutes };