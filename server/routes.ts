import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { requireAdmin, initializeAdmin } from './middleware/admin';
import { z } from 'zod';
import { db } from '@db';
import { wagerRaces } from '@db/schema';

// API configuration with validation
export const API_CONFIG = {
  token: process.env.API_TOKEN || '',
  baseUrl: process.env.API_BASE_URL || "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate"
};

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

// Type definitions for API response
interface WageredData {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

interface LeaderboardEntry {
  uid: string;
  name: string;
  wagered: WageredData;
}

interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
}

async function fetchLeaderboardData(): Promise<any> {
  try {
    log(`Making API request to: ${API_CONFIG.baseUrl}/referral-leaderboard`);

    const response = await fetch(`${API_CONFIG.baseUrl}/referral-leaderboard`, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`API Error (${response.status}): ${errorText}`);
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }

    const rawData = await response.json();

    // Detailed logging of API response structure
    log('API Response Structure:', {
      success: rawData.success,
      dataType: typeof rawData.data,
      isArray: Array.isArray(rawData.data),
      entryCount: rawData.data?.length || 0,
      responseKeys: Object.keys(rawData)
    });

    // Validate API response structure
    if (!rawData.success || !Array.isArray(rawData.data)) {
      log('Invalid API response format:', rawData);
      throw new Error('Invalid API response format');
    }

    // Transform and organize the data
    const transformedData = {
      success: true,
      metadata: {
        totalUsers: rawData.data.length,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: {
          data: [...rawData.data].sort((a, b) => b.wagered.today - a.wagered.today)
        },
        all_time: {
          data: [...rawData.data].sort((a, b) => b.wagered.all_time - a.wagered.all_time)
        },
        monthly: {
          data: [...rawData.data].sort((a, b) => b.wagered.this_month - a.wagered.this_month)
        },
        weekly: {
          data: [...rawData.data].sort((a, b) => b.wagered.this_week - a.wagered.this_week)
        }
      }
    };

    return transformedData;
  } catch (error) {
    log(`Error in fetchLeaderboardData: ${error}`);
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

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
      }, 10000); // Update every 10 seconds

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

  // Admin initialization endpoint
  app.post("/api/admin/initialize", async (req, res) => {
    try {
      const schema = z.object({
        username: z.string().min(1),
        password: z.string().min(8),
        adminKey: z.string()
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: result.error.issues
        });
      }

      const { username, password, adminKey } = result.data;
      const admin = await initializeAdmin(username, password, adminKey);

      res.json({
        message: "Admin user created successfully",
        admin: {
          id: admin.id,
          username: admin.username
        }
      });
    } catch (error: any) {
      log(`Error in admin initialization: ${error.message}`);
      res.status(500).json({
        error: error.message || "Failed to initialize admin user"
      });
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
          message: error.message
        });
      }
    }
  });

  return httpServer;
}