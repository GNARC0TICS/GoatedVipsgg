import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { db } from "@db";
import { wagerRaces } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { users, type SelectUser } from "@db/schema";

/**
 * Cache Manager Class
 * Handles in-memory caching with TTL (Time To Live) functionality
 */
class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly defaultTTL: number;

  constructor(defaultTTL = 30000) { // Default TTL of 30 seconds
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generates a unique cache key based on request properties
   */
  generateKey(req: any): string {
    return `${req.method}-${req.originalUrl}-${JSON.stringify(req.query)}`;
  }

  /**
   * Retrieves cached data if valid, returns null if expired
   */
  get(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Stores data in cache with current timestamp
   */
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

/**
 * Rate Limiting Configuration
 * Defines different tiers of rate limits for API endpoints
 */
const rateLimits = {
  HIGH: { points: 30, duration: 60 },    // 30 requests per minute
  MEDIUM: { points: 15, duration: 60 },  // 15 requests per minute
  LOW: { points: 5, duration: 60 }       // 5 requests per minute
};

// Initialize rate limiters for each tier
const rateLimiters = {
  high: new RateLimiterMemory(rateLimits.HIGH),
  medium: new RateLimiterMemory(rateLimits.MEDIUM),
  low: new RateLimiterMemory(rateLimits.LOW),
};

// Initialize cache manager
const cacheManager = new CacheManager();

/**
 * Cache Middleware
 * Implements caching logic for API responses
 */
const cacheMiddleware = (ttl = 30000) => async (req: any, res: any, next: any) => {
  const key = cacheManager.generateKey(req);
  const cachedResponse = cacheManager.get(key);

  if (cachedResponse) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl/1000)}`);
    return res.json(cachedResponse);
  }

  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'no-cache');
  const originalJson = res.json;
  res.json = (body: any) => {
    cacheManager.set(key, body);
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl/1000)}`);
    return originalJson.call(res, body);
  };
  next();
};

/**
 * Rate Limit Middleware Factory
 * Creates rate limiting middleware based on specified tier
 */
const createRateLimiter = (tier: 'high' | 'medium' | 'low') => {
  const limiter = rateLimiters[tier];
  return async (req: any, res: any, next: any) => {
    try {
      const rateLimitRes = await limiter.consume(req.ip);

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimits[tier.toUpperCase()].points);
      res.setHeader('X-RateLimit-Remaining', rateLimitRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitRes.msBeforeNext).toISOString());

      log(`Rate limit - ${tier}: ${rateLimitRes.remainingPoints} requests remaining`);
      next();
    } catch (rejRes) {
      log(`Rate limit exceeded - ${tier}: IP ${req.ip}`);

      // Set headers for rate limit exceeded response
      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Limit', rateLimits[tier.toUpperCase()].points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());

      res.status(429).json({
        status: 'error',
        message: 'Too many requests',
        retryAfter: Math.ceil(rejRes.msBeforeNext / 1000)
      });
    }
  };
};

/**
 * Batch Request Handler
 * Processes multiple API requests in parallel
 */
const batchHandler = async (req: any, res: any) => {
  try {
    const { requests } = req.body;
    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'Invalid batch request format' });
    }

    const results = await Promise.allSettled(
      requests.map(async (request) => {
        try {
          const response = await fetch(
            `${API_CONFIG.baseUrl}${request.endpoint}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          return { 
            status: 'error',
            error: error.message || 'Failed to process request',
            endpoint: request.endpoint
          };
        }
      })
    );

    res.json({
      status: 'success',
      results: results.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      )
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Batch processing failed',
      error: error.message 
    });
  }
};

// Add new schema for wheel spin
const wheelSpinSchema = z.object({
  segmentIndex: z.number(),
  reward: z.string().nullable(),
});

/**
 * Sets up REST API routes
 * Configures endpoints with appropriate middleware and handlers
 */
function setupRESTRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  // Batch processing endpoint
  app.post("/api/batch", createRateLimiter('medium'), batchHandler);

  // Current wager race data endpoint
  app.get("/api/wager-races/current",
    createRateLimiter('high'),
    cacheMiddleware(15000),
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
          // Return empty race data instead of throwing error
          return res.json({
            id: new Date().getFullYear() + (new Date().getMonth() + 1).toString().padStart(2, '0'),
            status: 'live',
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString(),
            prizePool: 500,
            participants: []
          });
        }

        const rawData = await response.json();
        const stats = transformLeaderboardData(rawData);

        // Calculate race period
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const raceData = {
          id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
          status: 'live',
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          endDate: endOfMonth.toISOString(),
          prizePool: 500,
          participants: stats.data.monthly.data
            .map((participant: any, index: number) => ({
              uid: participant.uid,
              name: participant.name,
              wagered: participant.wagered.this_month,
              position: index + 1
            }))
            .slice(0, 10)
        };

        res.json(raceData);
      } catch (error) {
        log(`Error fetching current race: ${error}`);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch current race",
        });
      }
    }
  );

  // Affiliate statistics endpoint
  app.get("/api/affiliate/stats",
    createRateLimiter('medium'),
    cacheMiddleware(60000),
    async (req, res) => {
      try {
        const username = req.query.username;
        let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

        if (username) {
          url += `?username=${encodeURIComponent(username)}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            log("API Authentication failed - check API token");
            throw new Error("API Authentication failed");
          }
          throw new Error(`API request failed: ${response.status}`);
        }

        const apiData = await response.json();
        const transformedData = transformLeaderboardData(apiData);

        res.json(transformedData);
      } catch (error) {
        log(`Error in /api/affiliate/stats: ${error}`);
        res.json({
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
        });
      }
    }
  );

  // Analytics endpoint for admin
  app.get("/api/admin/analytics",
    createRateLimiter('low'),
    cacheMiddleware(300000),
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
          throw new Error(`API request failed: ${response.status}`);
        }

        const rawData = await response.json();
        const data = rawData.data || rawData.results || rawData;

        // Calculate totals
        const totals = data.reduce((acc: any, entry: any) => {
          acc.dailyTotal += entry.wagered?.today || 0;
          acc.weeklyTotal += entry.wagered?.this_week || 0;
          acc.monthlyTotal += entry.wagered?.this_month || 0;
          acc.allTimeTotal += entry.wagered?.all_time || 0;
          return acc;
        }, {
          dailyTotal: 0,
          weeklyTotal: 0,
          monthlyTotal: 0,
          allTimeTotal: 0
        });

        // Get race statistics
        const [raceCount, activeRaceCount] = await Promise.all([
          db.select({ count: sql`count(*)` }).from(wagerRaces),
          db.select({ count: sql`count(*)` }).from(wagerRaces).where(eq(wagerRaces.status, 'live')),
        ]);

        const stats = {
          totalRaces: raceCount[0].count,
          activeRaces: activeRaceCount[0].count,
          wagerTotals: totals
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch analytics" });
      }
    }
  );

  // Telegram webhook route
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      await bot.handleUpdate(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error("Telegram webhook error:", error);
      res.sendStatus(500);
    }
  });

  // Wheel Challenge Routes
  app.get("/api/wheel/check-eligibility",
    createRateLimiter('high'),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            status: "error",
            message: "Authentication required" 
          });
        }

        // Check last spin time from database
        const [lastSpin] = await db
          .select({ timestamp: sql`MAX(timestamp)` })
          .from(sql`wheel_spins`)
          .where(sql`user_id = ${(req.user as SelectUser).id}`)
          .limit(1);

        const now = new Date();
        const lastSpinDate = lastSpin?.timestamp ? new Date(lastSpin.timestamp) : null;

        // Can spin if:
        // 1. Never spun before OR
        // 2. Last spin was before today (UTC midnight)
        const canSpin = !lastSpinDate || 
          (now.getUTCDate() !== lastSpinDate.getUTCDate() ||
           now.getUTCMonth() !== lastSpinDate.getUTCMonth() ||
           now.getUTCFullYear() !== lastSpinDate.getUTCFullYear());

        res.json({
          canSpin,
          lastSpin: lastSpinDate?.toISOString() || null
        });
      } catch (error) {
        console.error("Error checking wheel spin eligibility:", error);
        res.status(500).json({ 
          status: "error",
          message: "Failed to check eligibility" 
        });
      }
    }
  );

  app.post("/api/wheel/record-spin",
    createRateLimiter('medium'),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            status: "error",
            message: "Authentication required" 
          });
        }

        const result = wheelSpinSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            status: "error",
            message: "Invalid request data",
            errors: result.error.issues
          });
        }

        const { segmentIndex, reward } = result.data;

        // Record the spin
        await db.execute(
          sql`INSERT INTO wheel_spins (user_id, segment_index, reward_code, timestamp)
              VALUES (${(req.user as SelectUser).id}, ${segmentIndex}, ${reward}, NOW())`
        );

        // If there's a reward, create a bonus code record
        if (reward) {
          await db.execute(
            sql`INSERT INTO bonus_codes (code, user_id, claimed_at, expires_at)
                VALUES (${reward}, ${(req.user as SelectUser).id}, NOW(), NOW() + INTERVAL '24 hours')`
          );
        }

        res.json({
          status: "success",
          message: "Spin recorded successfully"
        });
      } catch (error) {
        console.error("Error recording wheel spin:", error);
        res.status(500).json({ 
          status: "error",
          message: "Failed to record spin" 
        });
      }
    }
  );
}

let wss: WebSocketServer;

/**
 * Utility function to sort data by wagered amount
 */
function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0)
  );
}

/**
 * Transforms raw leaderboard data into standardized format
 */
export function transformLeaderboardData(apiData: any) {
  const responseData = apiData.data || apiData.results || apiData;
  if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
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

  const dataArray = Array.isArray(responseData) ? responseData : [responseData];
  const transformedData = dataArray.map((entry) => ({
    uid: entry.uid || "",
    name: entry.name || "",
    wagered: {
      today: entry.wagered?.today || 0,
      this_week: entry.wagered?.this_week || 0,
      this_month: entry.wagered?.this_month || 0,
      all_time: entry.wagered?.all_time || 0,
    },
  }));

  return {
    status: "success",
    metadata: {
      totalUsers: transformedData.length,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: sortByWagered(transformedData, "today") },
      weekly: { data: sortByWagered(transformedData, "this_week") },
      monthly: { data: sortByWagered(transformedData, "this_month") },
      all_time: { data: sortByWagered(transformedData, "all_time") },
    },
  };
}

/**
 * Sets up WebSocket server and registers routes
 */
export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupRESTRoutes(app);
  setupWebSocket(httpServer);
  return httpServer;
}

/**
 * Configures WebSocket server
 */
// Webhook endpoint for Telegram bot
function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    if (request.url === "/ws/leaderboard") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
        handleLeaderboardConnection(ws);
      });
    }
  });
}

/**
 * Handles new WebSocket connections for leaderboard
 */
function handleLeaderboardConnection(ws: WebSocket) {
  const clientId = Date.now().toString();
  log(`Leaderboard WebSocket client connected (${clientId})`);

  // Keep connection alive with ping/pong
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", (error) => {
    log(`WebSocket error (${clientId}):`, error);
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

/**
 * Broadcasts updates to all connected WebSocket clients
 */
export function broadcastLeaderboardUpdate(data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "LEADERBOARD_UPDATE",
        data
      }));
    }
  });
}