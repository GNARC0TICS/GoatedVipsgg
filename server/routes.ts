
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { log } from "./vite";
import { db } from "@db";
import { users, notificationPreferences } from "@db/schema";
import { eq } from "drizzle-orm";

const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsImlhdCI6MTcyNjc3Mjc5Nn0.PDZzGUz-3e6l3vh-vOOqXpbho4mhapZ8jHxfXDJBxEg";
const API_ENDPOINT = "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard";

// WebSocket handlers
const setupWebSocketServers = (httpServer: Server) => {
  const affiliateWss = createWebSocketServer(httpServer, "/ws/affiliate-stats");
  const wagerRacesWss = createWebSocketServer(httpServer, "/ws/wager-races");
  
  setupAffiliateWebSocket(affiliateWss);
  setupWagerRacesWebSocket(wagerRacesWss);
  
  log("WebSocket servers initialized");
};

const createWebSocketServer = (server: Server, path: string) => {
  return new WebSocketServer({ 
    server,
    path,
    verifyClient: (info) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });
};

const setupAffiliateWebSocket = (wss: WebSocketServer) => {
  wss.on("connection", (ws) => {
    log("New affiliate WebSocket connection established");

    const interval = setInterval(async () => {
      try {
        const response = await fetch(API_ENDPOINT, {
          headers: { 'Authorization': `Bearer ${API_TOKEN}` }
        });

        if (!response.ok) throw new Error(`API responded with status: ${response.status}`);

        const data = await response.json();
        ws.send(JSON.stringify(data));
      } catch (error) {
        log(`Error fetching affiliate data: ${error}`);
      }
    }, 5000);

    ws.on("close", () => {
      clearInterval(interval);
      log("Affiliate WebSocket connection closed");
    });
  });
};

const setupWagerRacesWebSocket = (wss: WebSocketServer) => {
  wss.on("connection", (ws) => {
    log("New wager races WebSocket connection established");

    const interval = setInterval(() => {
      const mockData = generateMockWagerRaceData();
      ws.send(JSON.stringify(mockData));
    }, 5000);

    ws.on("close", () => {
      clearInterval(interval);
      log("Wager races WebSocket connection closed");
    });
  });
};

const generateMockWagerRaceData = () => ({
  id: "weekly-race-1",
  type: "weekly",
  status: "live",
  prizePool: 100000,
  startDate: "2025-01-13T00:00:00Z",
  endDate: "2025-01-20T00:00:00Z",
  participants: Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    username: `Player${i + 1}`,
    wager: Math.floor(Math.random() * 1000000) + 500000,
    prizeShare: i === 0 ? 0.25 : 
                i === 1 ? 0.15 :
                i === 2 ? 0.10 :
                i <= 6 ? 0.075 : 0.05
  })).sort((a, b) => b.wager - a.wager)
});

// API Routes
const setupApiRoutes = (app: Express) => {
  app.get("/api/affiliate/stats", handleAffiliateStats);
  app.get("/api/notification-preferences", handleGetNotificationPreferences);
  app.post("/api/notification-preferences", handleUpdateNotificationPreferences);
};

const handleAffiliateStats = async (req: any, res: any) => {
  try {
    log("Fetching initial affiliate data from API...");
    const response = await fetch(API_ENDPOINT, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    });

    if (!response.ok) throw new Error(`API responded with status: ${response.status}`);

    const data = await response.json();
    log(`Successfully fetched initial data for ${data.data?.length || 0} affiliates`);
    res.json(data);
  } catch (error) {
    log(`Error in /api/affiliate/stats: ${error}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch affiliate stats",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleGetNotificationPreferences = async (req: any, res: any) => {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, req.user.id))
      .limit(1);

    if (!preferences) {
      const [newPreferences] = await db
        .insert(notificationPreferences)
        .values({
          userId: req.user.id,
          wagerRaceUpdates: true,
          vipStatusChanges: true,
          promotionalOffers: true,
          monthlyStatements: true,
        })
        .returning();

      return res.json(newPreferences);
    }

    res.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
};

const handleUpdateNotificationPreferences = async (req: any, res: any) => {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, req.user.id))
      .limit(1);

    if (!preferences) {
      const [newPreferences] = await db
        .insert(notificationPreferences)
        .values({
          userId: req.user.id,
          ...req.body,
        })
        .returning();

      return res.json(newPreferences);
    }

    const [updatedPreferences] = await db
      .update(notificationPreferences)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, req.user.id))
      .returning();

    res.json(updatedPreferences);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupWebSocketServers(httpServer);
  setupApiRoutes(app);
  return httpServer;
}
