import { Router, type Express, type Request, type Response, type NextFunction } from "express";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory, type RateLimiterRes } from 'rate-limiter-flexible';
import bonusChallengesRouter from "./routes/bonus-challenges";
import { wagerRaces, users, transformationLogs } from "@db/schema";

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
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { SelectUser } from "@db/schema";
import { initializeBot } from "./telegram/bot";

class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly defaultTTL: number;

  constructor(defaultTTL = 30000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  generateKey(req: any): string {
    return `${req.method}-${req.originalUrl}-${JSON.stringify(req.query)}`;
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

// Router setup
const router = Router();

// Constants
const CACHE_TIMES = {
  SHORT: 15000,    // 15 seconds
  MEDIUM: 60000,   // 1 minute
  LONG: 300000     // 5 minutes
};

// Health check endpoint
router.get("/health", async (_req: Request, res: Response) => {
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
      message: process.env.NODE_ENV === "production" ? "Health check failed" : error.message
    });
  }
});

// Wager races endpoint
router.get("/wager-races/current",
  createRateLimiter('high'),
  cacheMiddleware(CACHE_TIMES.SHORT),
  async (_req: Request, res: Response) => {
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

// Export functions and router
export { router };


// API Routes configuration
function setupAPIRoutes(app: Express) {
  // API middleware - ensure these run before any API route
  app.use('/api', (req, res, next) => {
    // Set common API headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Mount all API routes under /api prefix
  app.use("/api/bonus", bonusChallengesRouter);
  app.use("/api", router); //Added this line


  // Add other API routes here, ensuring they're all prefixed with /api
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  app.post("/api/batch", createRateLimiter('medium'), batchHandler);

  app.get("/api/affiliate/stats",
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

        // More detailed logging of the raw data structure
        log('Raw API response structure:', {
          hasData: Boolean(rawData),
          dataStructure: typeof rawData,
          keys: Object.keys(rawData),
          hasResults: Boolean(rawData?.results),
          resultsLength: rawData?.results?.length,
          hasSuccess: 'success' in rawData,
          successValue: rawData?.success,
          nestedData: Boolean(rawData?.data),
          nestedDataLength: rawData?.data?.length,
        });

        const transformedData = await transformLeaderboardData(rawData);

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

  app.get("/api/admin/analytics",
    createRateLimiter('low'),
    cacheMiddleware(CACHE_TIMES.LONG),
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
          throw new ApiError(`API request failed: ${response.status}`, { status: response.status });
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

  app.get("/api/telegram/status",
    createRateLimiter('medium'),
    async (_req, res) => {
      try {
        const bot = await initializeBot();
        if (!bot) {
          return res.status(500).json({
            status: "error",
            message: "Bot not initialized"
          });
        }

        const botInfo = await bot.getMe();
        res.json({
          status: "healthy",
          username: botInfo.username,
          timestamp: new Date().toISOString(),
          mode: "polling"
        });
      } catch (error) {
        log(`Error checking bot status: ${error}`);
        res.status(500).json({
          status: "error",
          message: "Failed to check bot status"
        });
      }
    }
  );

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

        const [lastSpin] = await db
          .select({ timestamp: sql`MAX(timestamp)` })
          .from(sql`wheel_spins`)
          .where(sql`user_id = ${(req.user as SelectUser).id}`)
          .limit(1);

        const now = new Date();
        const lastSpinDate = lastSpin?.timestamp ? new Date(lastSpin.timestamp as string) : null;

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

        await db.execute(
          sql`INSERT INTO wheel_spins (user_id, segment_index, reward_code, timestamp)
              VALUES (${(req.user as SelectUser).id}, ${segmentIndex}, ${reward}, NOW())`
        );

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
  app.get("/api/admin/transformation-metrics",
    createRateLimiter('medium'),
    cacheMiddleware(CACHE_TIMES.LONG),
    async (_req, res) => {
      try {
        console.log('Executing transformation metrics query...');

        const result = await db.query.transformationLogs.findMany({
          columns: {
            type: true,
            duration_ms: true,
            created_at: true
          },
          where: sql`created_at > NOW() - INTERVAL '24 hours'`
        });

        console.log('Raw query result:', result);

        // Calculate metrics from the result array
        const metrics = {
          total_transformations: result.length,
          average_time_ms: result.reduce((acc, row) => acc + (Number(row.duration_ms) || 0), 0) / (result.length || 1),
          error_count: result.filter(row => row.type === 'error').length,
          last_updated: result.length > 0
            ? Math.max(...result.map(row => row.created_at.getTime()))
            : Date.now()
        };

        console.log('Calculated metrics:', metrics);

        const response = {
          status: 'success',
          data: {
            totalTransformations: metrics.total_transformations,
            averageTimeMs: Number(metrics.average_time_ms.toFixed(2)),
            errorRate: metrics.total_transformations > 0
              ? Number((metrics.error_count / metrics.total_transformations).toFixed(2))
              : 0,
            lastUpdated: new Date(metrics.last_updated).toISOString()
          }
        };

        console.log('Processed response:', response);
        res.json(response);
      } catch (error) {
        console.error('Error in transformation metrics endpoint:', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error,
          timestamp: new Date().toISOString()
        });

        res.status(500).json({
          status: 'error',
          message: 'Failed to fetch transformation metrics',
          details: process.env.NODE_ENV === 'development'
            ? error instanceof Error ? error.message : String(error)
            : undefined
        });
      }
    }
  );
  app.get("/api/admin/export-logs",
    createRateLimiter('low'),
    async (_req, res) => {
      try {
        console.log('Fetching logs for export...');

        const logs = await db.query.transformationLogs.findMany({
          orderBy: (logs, { desc }) => [desc(logs.created_at)],
          limit: 1000 // Limit to last 1000 logs
        });

        console.log(`Found ${logs.length} logs to export`);

        const formattedLogs = logs.map(log => ({
          timestamp: log.created_at.toISOString(),
          type: log.type,
          message: log.message,
          duration_ms: log.duration_ms?.toString() || '',
          resolved: log.resolved ? 'Yes' : 'No',
          error_message: log.error_message || '',
          payload: log.payload ? JSON.stringify(log.payload) : ''
        }));

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transformation_logs_${new Date().toISOString().split('T')[0]}.csv`);

        // Convert to CSV format
        const csvData = [
          // Header row
          Object.keys(formattedLogs[0] || {}).join(','),
          // Data rows
          ...formattedLogs.map(log =>
            Object.values(log)
              .map(value => `"${String(value).replace(/"/g, '""')}"`)
              .join(',')
          )
        ].join('\n');

        res.send(csvData);
      } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to export logs',
          details: process.env.NODE_ENV === 'development'
            ? error instanceof Error ? error.message : String(error)
            : undefined
        });
      }
    }
  );
}

let wss: WebSocketServer;

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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Register API routes before setupVite is called
  setupAPIRoutes(app);

  // Setup WebSocket after HTTP server is created but before Vite
  setupWebSocket(httpServer);

  return httpServer;
}

function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    // Skip Vite HMR connections
    if (request.headers["sec-websocket-protocol"]?.includes("vite-hmr")) {
      return;
    }

    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname === "/ws/leaderboard") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
        handleLeaderboardConnection(ws);
      });
    } else {
      socket.destroy();
    }
  });
}

function handleLeaderboardConnection(ws: WebSocket) {
  const clientId = Date.now().toString();
  log(`Leaderboard WebSocket client connected (${clientId})`);

  // Set up connection state
  ws.isAlive = true;

  // Set up ping interval for connection health check
  const pingInterval = setInterval(() => {
    if (!ws.isAlive) {
      log(`Client ${clientId} not responding to pings, terminating connection`);
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  }, 30000);

  // Handle pong responses
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // Handle connection close
  ws.on("close", () => {
    log(`Leaderboard WebSocket client disconnected (${clientId})`);
    clearInterval(pingInterval);
  });

  // Handle errors
  ws.on("error", (error: Error) => {
    log(`WebSocket error (${clientId}): ${error.message}`);
    clearInterval(pingInterval);
    ws.terminate();
  });

  // Send initial connection confirmation
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      clientId,
      timestamp: Date.now()
    }));
  }
}

// Add to WebSocket type definition
declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
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

export function broadcastTransformationLog(log: {
  type: 'info' | 'error' | 'warning';
  message: string;
  data?: any;
}) {
  wss.clients.forEach((client) => {
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

declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}

const cacheManager = new CacheManager();

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
            throw new ApiError(`API Error: ${response.status}`, { status: response.status });
          }

          return await response.json();
        } catch (error) {
          const apiError = error as ApiError;
          return {
            status: 'error',
            error: apiError.message || 'Failed to process request',
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
      error: (error as Error).message
    });
  }
};

const wheelSpinSchema = z.object({
  segmentIndex: z.number(),
  reward: z.string().nullable(),
});

function setupRESTRoutes(app: Express) {
  app.get("/api/admin/export-logs",
    createRateLimiter('low'),
    async (_req, res) => {
      try {
        console.log('Fetching logs for export...');

        const logs = await db.query.transformationLogs.findMany({
          orderBy: (logs, { desc }) => [desc(logs.created_at)],
          limit: 1000 // Limit to last 1000 logs
        });

        console.log(`Found ${logs.length} logs to export`);

        const formattedLogs = logs.map(log => ({
          timestamp: log.created_at.toISOString(),
          type: log.type,
          message: log.message,
          duration_ms: log.duration_ms?.toString() || '',
          resolved: log.resolved ? 'Yes' : 'No',
          error_message: log.error_message || '',
          payload: log.payload ? JSON.stringify(log.payload) : ''
        }));

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transformation_logs_${new Date().toISOString().split('T')[0]}.csv`);

        // Convert to CSV format
        const csvData = [
          // Header row
          Object.keys(formattedLogs[0] || {}).join(','),
          // Data rows
          ...formattedLogs.map(log =>
            Object.values(log)
              .map(value => `"${String(value).replace(/"/g, '""')}"`)
              .join(',')
          )
        ].join('\n');

        res.send(csvData);
      } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to export logs',
          details: process.env.NODE_ENV === 'development'
            ? error instanceof Error ? error.message : String(error)
            : undefined
        });
      }
    }
  );
}

class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
  }
}