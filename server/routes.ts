import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { db } from "@db";
import { wagerRaces } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import compression from "express-compression";

// Enhanced rate limiting configuration with batch support
const rateLimits = {
  HIGH: { points: 120, duration: 60 },   // 120 requests per minute for batch operations
  MEDIUM: { points: 60, duration: 60 },  // 60 requests per minute for regular endpoints
  LOW: { points: 20, duration: 60 }      // 20 requests per minute for analytics
};

// Cache times based on data volatility with shorter TTLs
const CACHE_TIMES = {
  AFFILIATE_STATS: 30000,   // 30 seconds
  RACE_DATA: 30000,         // 30 seconds
  ANALYTICS: 300000         // 5 minutes
};

// Enhanced cache manager with memory usage optimization
class CacheManager {
  private cache: Map<string, { data: any; timestamp: number; size: number }>;
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private currentSize: number;

  constructor(defaultTTL = 30000, maxSize = 100 * 1024 * 1024) { // 100MB max cache size
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.currentSize = 0;
  }

  generateKey(req: any): string {
    const relevantParams = ['username', 'limit', 'period'];
    const queryString = req.query ? 
      Object.keys(req.query)
        .filter(key => relevantParams.includes(key))
        .sort()
        .map(key => `${key}=${req.query[key]}`)
        .join('&')
      : '';

    return `${req.method}-${req.path}${queryString ? `?${queryString}` : ''}`;
  }

  get(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.defaultTTL) {
      this.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    const size = Buffer.from(JSON.stringify(data)).length;

    // Check if adding this item would exceed max size
    if (this.currentSize + size > this.maxSize) {
      this.evictOldest();
    }

    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentSize -= oldEntry.size;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size
    });
    this.currentSize += size;
  }

  private delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
    }
  }

  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    if (entries.length === 0) return;

    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries until we're under maxSize
    while (this.currentSize > this.maxSize && entries.length > 0) {
      const [key] = entries.shift()!;
      this.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }
}

// Initialize cache manager
const cacheManager = new CacheManager();

// Enhanced cache middleware with compression
const cacheMiddleware = (ttl = 30000) => async (req: any, res: any, next: any) => {
  const key = cacheManager.generateKey(req);
  const cachedResponse = cacheManager.get(key);

  if (cachedResponse) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl/1000)}`);
    return res.json(cachedResponse);
  }

  res.setHeader('X-Cache', 'MISS');
  const originalJson = res.json;
  res.json = (body: any) => {
    cacheManager.set(key, body);
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl/1000)}`);
    return originalJson.call(res, body);
  };
  next();
};

// Initialize rate limiters
const rateLimiters = {
  HIGH: new RateLimiterMemory(rateLimits.HIGH),
  MEDIUM: new RateLimiterMemory(rateLimits.MEDIUM),
  LOW: new RateLimiterMemory(rateLimits.LOW),
};

function setupRESTRoutes(app: Express) {
  // Enable compression for all routes
  app.use(compression());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  // Optimized affiliate stats endpoint
  app.get("/api/affiliate/stats",
    createRateLimiter('medium'),
    cacheMiddleware(CACHE_TIMES.AFFILIATE_STATS),
    async (req, res) => {
      try {
        const username = req.query.username as string;
        let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

        if (username) {
          url += `?username=${encodeURIComponent(username)}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip, deflate"
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const apiData = await response.json();
        const transformedData = transformLeaderboardData(apiData, req.query.limit as string);

        res.json(transformedData);
      } catch (error) {
        log(`Error in /api/affiliate/stats: ${error}`);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch affiliate stats"
        });
      }
    }
  );

  // Current race data endpoint
  app.get("/api/wager-races/current",
    createRateLimiter('high'),
    cacheMiddleware(CACHE_TIMES.RACE_DATA),
    async (_req, res) => {
      try {
        const response = await fetch(
          `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
              "Content-Type": "application/json",
              "Accept-Encoding": "gzip, deflate"
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const rawData = await response.json();
        const stats = transformLeaderboardData(rawData);

        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const raceData = {
          id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
          status: 'live',
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          endDate: endOfMonth.toISOString(),
          prizePool: 500,
          participants: stats.data.monthly.data
            .slice(0, 10)
            .map((participant: any, index: number) => ({
              uid: participant.uid,
              name: participant.name,
              wagered: participant.wagered.this_month,
              position: index + 1
            }))
        };

        res.json(raceData);
      } catch (error) {
        log(`Error fetching current race: ${error}`);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch current race"
        });
      }
    }
  );

  // Analytics endpoint with aggressive caching
  app.get("/api/admin/analytics",
    createRateLimiter('low'),
    cacheMiddleware(CACHE_TIMES.ANALYTICS),
    async (_req, res) => {
      try {
        const response = await fetch(
          `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
              "Content-Type": "application/json",
              "Accept-Encoding": "gzip, deflate"
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const rawData = await response.json();
        const data = rawData.data || rawData.results || rawData;

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
  // Add batch endpoint
  app.post("/api/batch", 
    createRateLimiter('high'),
    async (req, res) => {
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
            } catch (error: any) {
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
      } catch (error: any) {
        res.status(500).json({ 
          status: 'error',
          message: 'Batch processing failed',
          error: error.message 
        });
      }
    }
  );
}

// Helper functions
function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0)
  );
}

function transformLeaderboardData(apiData: any, limit?: string) {
  const responseData = apiData.data || apiData.results || apiData;
  if (!responseData) {
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
  const maxEntries = limit ? parseInt(limit, 10) : dataArray.length;

  const transformedData = dataArray
    .slice(0, maxEntries)
    .map((entry) => ({
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

// Helper function to create rate limiter middleware
const createRateLimiter = (tier: 'HIGH' | 'MEDIUM' | 'LOW') => {
  const limiter = rateLimiters[tier];
  return async (req: any, res: any, next: any) => {
    try {
      const rateLimitRes = await limiter.consume(req.ip);
      const points = tier === 'HIGH' ? 120 : tier === 'MEDIUM' ? 60 : 20;

      res.setHeader('X-RateLimit-Limit', points);
      res.setHeader('X-RateLimit-Remaining', rateLimitRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitRes.msBeforeNext).toISOString());

      next();
    } catch (rejRes: any) {
      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Limit', rateLimits[tier].points);
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

export function registerRoutes(app: Express, httpServer: Server) {
  setupRESTRoutes(app);
  setupWebSocket(httpServer);
  return httpServer;
}

let wss: WebSocketServer;

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

function handleLeaderboardConnection(ws: WebSocket) {
  const clientId = Date.now().toString();
  log(`Leaderboard WebSocket client connected (${clientId})`);

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("pong", () => {
    log(`Received pong from client ${clientId}`);
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