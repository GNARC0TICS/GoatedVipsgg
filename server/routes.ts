import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { log } from "./vite";
import { setupAuth } from "./auth";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { requireAdmin, requireAuth } from './middleware/auth';
import { z } from 'zod';
import { db } from '@db';
import { wagerRaces, users } from '@db/schema';
import { eq } from 'drizzle-orm';

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

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const usersList = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          lastLogin: users.lastLogin
        })
        .from(users)
        .orderBy(users.createdAt);

      res.json(usersList);
    } catch (error) {
      log(`Error fetching users: ${error}`);
      res.status(500).json({ error: "Failed to fetch users" });
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

  app.post("/api/admin/wager-races", requireAdmin, async (req, res) => {
    try {
      const race = await db
        .insert(wagerRaces)
        .values({
          ...req.body,
          createdBy: req.user!.id
        })
        .returning();
      res.json(race[0]);
    } catch (error) {
      log(`Error creating wager race: ${error}`);
      res.status(500).json({ error: "Failed to create wager race" });
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

  // Setup WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/affiliate-stats') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // WebSocket connection handling
  wss.on('connection', async (ws: WebSocket) => {
    log('WebSocket client connected');
    let interval: NodeJS.Timeout;

    try {
      // Send initial data
      const data = await fetchLeaderboardData();
      ws.send(JSON.stringify(data));

      // Setup periodic updates
      interval = setInterval(async () => {
        try {
          const data = await fetchLeaderboardData();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
          }
        } catch (error) {
          log(`Error sending WebSocket update: ${error}`);
        }
      }, 30000); // Update every 30 seconds

      // Handle WebSocket closure
      ws.on('close', () => {
        log('WebSocket client disconnected');
        clearInterval(interval);
      });

    } catch (error) {
      log(`Error in WebSocket connection: ${error}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  });

  return httpServer;
}

async function fetchLeaderboardData(page: number = 0, limit: number = 10) {
  try {
    // Fetch data from external API
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      log('API Authentication failed - check API token');
      throw new Error('API Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const apiData = await response.json();
    log('API Response:', JSON.stringify(apiData, null, 2));

    // Handle different response structures
    const responseData = apiData.data || apiData.results || apiData;
    if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
      log('No data received from API');
      return {
        success: false,
        metadata: {
          totalUsers: 0,
          lastUpdated: new Date().toISOString()
        },
        data: {
          today: { data: [] },
          all_time: { data: [] },
          monthly: { data: [] },
          weekly: { data: [] }
        }
      };
    }

    // Ensure we have an array to work with
    const dataArray = Array.isArray(responseData) ? responseData : [responseData];

    // Transform the API data into the expected structure
    const transformedData = dataArray.map(entry => ({
      uid: entry.uid || '',
      name: entry.name || '',
      wagered: {
        today: entry.wagered?.today || 0,
        this_week: entry.wagered?.this_week || 0,
        this_month: entry.wagered?.this_month || 0,
        all_time: entry.wagered?.all_time || 0
      }
    }));

    // Sort data for each time period
    const sortedData = {
      today: transformedData.sort((a, b) => (b.wagered.today || 0) - (a.wagered.today || 0)),
      weekly: transformedData.sort((a, b) => (b.wagered.this_week || 0) - (a.wagered.this_week || 0)),
      monthly: transformedData.sort((a, b) => (b.wagered.this_month || 0) - (a.wagered.this_month || 0)),
      all_time: transformedData.sort((a, b) => (b.wagered.all_time || 0) - (a.wagered.all_time || 0))
    };

    return {
      success: true,
      metadata: {
        totalUsers: transformedData.length,
        lastUpdated: new Date().toISOString()
      },
      data: {
        today: { data: sortedData.today },
        weekly: { data: sortedData.weekly },
        monthly: { data: sortedData.monthly },
        all_time: { data: sortedData.all_time }
      }
    };
  } catch (error) {
    log(`Error in fetchLeaderboardData: ${error}`);
    throw error;
  }
}