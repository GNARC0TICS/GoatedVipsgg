
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { log } from "./vite";
import { setupAuth } from "./auth";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { requireAdmin, requireAuth } from './middleware/auth';
import { db } from '@db';
import { wagerRaces, users } from '@db/schema';
import { eq } from 'drizzle-orm';

const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupAuth(app);
  setupRESTRoutes(app);
  setupWebSocket(httpServer);
  return httpServer;
}

function setupRESTRoutes(app: Express) {
  app.get("/api/profile", requireAuth, handleProfileRequest);
  app.get("/api/admin/users", requireAdmin, handleAdminUsersRequest);
  app.get("/api/admin/wager-races", requireAdmin, handleWagerRacesRequest);
  app.post("/api/admin/wager-races", requireAdmin, handleCreateWagerRace);
  app.get("/api/affiliate/stats", handleAffiliateStats);
}

async function handleProfileRequest(req: any, res: any) {
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
}

async function handleAdminUsersRequest(_req: any, res: any) {
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
}

async function handleWagerRacesRequest(_req: any, res: any) {
  try {
    const races = await db.query.wagerRaces.findMany({
      orderBy: (races, { desc }) => [desc(races.createdAt)]
    });
    res.json(races);
  } catch (error) {
    log(`Error fetching wager races: ${error}`);
    res.status(500).json({ error: "Failed to fetch wager races" });
  }
}

async function handleCreateWagerRace(req: any, res: any) {
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
}

async function handleAffiliateStats(req: any, res: any) {
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
}

function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/affiliate-stats') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', handleWebSocketConnection);
}

async function handleWebSocketConnection(ws: WebSocket) {
  log('WebSocket client connected');
  let interval: NodeJS.Timeout;

  try {
    const data = await fetchLeaderboardData();
    ws.send(JSON.stringify(data));

    interval = setInterval(async () => {
      try {
        const data = await fetchLeaderboardData();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      } catch (error) {
        log(`Error sending WebSocket update: ${error}`);
      }
    }, 30000);

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
}

async function fetchLeaderboardData(page: number = 0, limit: number = 10) {
  const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`, {
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      log('API Authentication failed - check API token');
      throw new Error('API Authentication failed');
    }
    throw new Error(`API request failed: ${response.status}`);
  }

  const apiData = await response.json();
  return transformLeaderboardData(apiData);
}

function transformLeaderboardData(apiData: any) {
  const responseData = apiData.data || apiData.results || apiData;
  if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
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

  const dataArray = Array.isArray(responseData) ? responseData : [responseData];
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

  return {
    success: true,
    metadata: {
      totalUsers: transformedData.length,
      lastUpdated: new Date().toISOString()
    },
    data: {
      today: { data: sortByWagered(transformedData, 'today') },
      weekly: { data: sortByWagered(transformedData, 'this_week') },
      monthly: { data: sortByWagered(transformedData, 'this_month') },
      all_time: { data: sortByWagered(transformedData, 'all_time') }
    }
  };
}

function sortByWagered(data: any[], period: string) {
  return [...data].sort((a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0));
}
