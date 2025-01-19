import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { requireAdmin, requireAuth } from './middleware/auth';
import { z } from 'zod';
import { db } from '@db';
import { wagerRaces, users, affiliateStats } from '@db/schema';
import { eq, desc } from 'drizzle-orm';

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication routes and middleware
  setupAuth(app);

  // Protected routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          lastLogin: users.lastLogin
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      res.json(user);
    } catch (error) {
      log(`Error fetching profile: ${error}`);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });


  // Protected admin routes for wager race management
  app.get("/api/admin/wager-races", requireAdmin, async (req, res) => {
    try {
      const races = await db.query.wagerRaces.findMany({
        orderBy: (races, { desc }) => [desc(races.createdAt)]
      });
      res.json(races);
    } catch (error) {
      log(`Error fetching wager races: ${error}`);
      res.status(500).json({ error: "Failed to fetch wager races" });
    }
  });

  // HTTP endpoint for leaderboard data
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      await rateLimiter.consume(req.ip || "unknown");
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await fetchLeaderboardData(page, limit);
      res.json(data);
    } catch (error: any) {
      if (error.consumedPoints) {
        res.status(429).json({ error: "Too many requests" });
      } else {
        log(`Error in /api/affiliate/stats: ${error}`);
        res.status(500).json({
          success: false,
          error: "Failed to fetch affiliate stats",
          message: error.message
        });
      }
    }
  });

  // Setup WebSocket server with proper error handling
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade with error handling
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/affiliate-stats') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // WebSocket connection handling with improved error handling
  wss.on('connection', async (ws: WebSocket) => {
    log('WebSocket client connected');
    let isAlive = true;

    // Initialize interval variables
    let updateInterval: NodeJS.Timeout | null = null;
    const pingInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      isAlive = true;
    });

    const cleanup = () => {
      if (updateInterval) clearInterval(updateInterval);
      clearInterval(pingInterval);
    };

    try {
      // Send initial data
      const data = await fetchLeaderboardData();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }

      // Setup periodic updates
      updateInterval = setInterval(async () => {
        try {
          if (!isAlive) {
            cleanup();
            return;
          }
          const data = await fetchLeaderboardData();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
          }
        } catch (error) {
          log(`Error sending WebSocket update: ${error}`);
          // Don't throw here, just log the error and continue
        }
      }, 30000); // Update every 30 seconds

      // Handle WebSocket closure
      ws.on('close', () => {
        log('WebSocket client disconnected');
        cleanup();
      });

      ws.on('error', (error) => {
        log(`WebSocket error: ${error}`);
        cleanup();
        ws.terminate();
      });

    } catch (error) {
      log(`Error in WebSocket connection: ${error}`);
      cleanup();
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  });

  return httpServer;
}

async function fetchLeaderboardData(page: number = 0, limit: number = 10) {
  try {
    const stats = await db
      .select({
        userId: affiliateStats.userId,
        totalWager: affiliateStats.totalWager,
        commission: affiliateStats.commission,
        timestamp: affiliateStats.timestamp,
        username: users.username
      })
      .from(affiliateStats)
      .leftJoin(users, eq(affiliateStats.userId, users.id))
      .orderBy(desc(affiliateStats.totalWager))
      .offset(page * limit)
      .limit(limit);

    return {
      success: true,
      data: stats.map(stat => ({
        uid: stat.userId?.toString() ?? 'unknown',
        name: stat.username ?? 'Unknown User',
        wagered: {
          today: parseFloat(stat.totalWager?.toString() ?? '0'),
          this_week: parseFloat(stat.totalWager?.toString() ?? '0'),
          this_month: parseFloat(stat.totalWager?.toString() ?? '0'),
          all_time: parseFloat(stat.totalWager?.toString() ?? '0')
        }
      }))
    };
  } catch (error) {
    log(`Error in fetchLeaderboardData: ${error}`);
    throw error;
  }
}