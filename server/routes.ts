import { Router, type Express } from "express";
import { setupAuth } from "./auth";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import cors from "cors";
import { transformLeaderboardData } from "./utils/leaderboard";

// Use direct API URL without token requirement
const LEADERBOARD_API_URL = 'https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard/2RW440E';

async function fetchLeaderboardData() {
  console.log('Fetching leaderboard data from API...');

  try {
    const response = await fetch(LEADERBOARD_API_URL);

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const rawData = await response.json();
    console.log('Raw API response:', JSON.stringify(rawData, null, 2));
    return rawData;
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    throw error;
  }
}

interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
}

let wsServer: WebSocketServer;

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
    console.log('WebSocket connection closed');
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

function setupWebSocket(httpServer: Server) {
  wsServer = new WebSocketServer({
    noServer: true,
    path: "/ws"
  });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request);
      setupWebSocketHandlers(ws as CustomWebSocket);
    });
  });
}

function registerRoutes(app: Express): Server {
  // Basic middleware setup
  app.use(express.json());
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup auth before routes
  setupAuth(app);

  // API Routes configuration
  const apiRouter = Router();

  // Health check endpoint
  apiRouter.get("/health", async (_req, res) => {
    try {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Health check failed"
      });
    }
  });

  // Affiliate stats endpoint - no authentication required
  apiRouter.get("/affiliate/stats", async (_req, res) => {
    try {
      console.log('Fetching leaderboard data...');
      const rawData = await fetchLeaderboardData();
      console.log('Transforming leaderboard data...');
      const transformedData = await transformLeaderboardData(rawData);
      console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

      res.json(transformedData);
    } catch (error) {
      console.error('Error in /affiliate/stats:', error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch leaderboard data",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Mount the API router with security headers
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
          `${LEADERBOARD_API_URL}`,
          {
            headers: {
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
    console.error(`[Error] ${err.stack}`);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  });

  // Setup WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}

export function broadcastTransformationLog(data: any) {
  if (!wsServer) return;

  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "LEADERBOARD_UPDATE",
        data,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

export { setupWebSocket, registerRoutes };
import { RateLimiterMemory, type RateLimiterRes } from 'rate-limiter-flexible';
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

type RateLimitTier = 'HIGH' | 'MEDIUM' | 'LOW';

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

// Common cache times
const CACHE_TIMES = {
  SHORT: 15000,    // 15 seconds
  MEDIUM: 60000,   // 1 minute
  LONG: 300000     // 5 minutes
};

async function storeLeaderboardData(data: any) {
  const now = new Date();

  // Store transformation log without transaction
  await db.insert(transformationLogs).values({
    type: 'info',
    message: 'Leaderboard data stored',
    payload: JSON.stringify(data),
    duration_ms: '0',
    created_at: now,
    resolved: true
  });

  // Broadcast the update
  broadcastTransformationLog(data);
}

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
import type { SelectUser } from "@db/schema";
import { initializeBot } from "./telegram/bot";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { wagerRaces, transformationLogs } from "@db/schema";