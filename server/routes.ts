import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { db } from "@db";
import { users, notificationPreferences, wagerRaces } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { IncomingMessage } from "http";

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

interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

const createWebSocketServer = (server: Server, path: string) => {
  return new WebSocketServer({ 
    server,
    path,
    verifyClient: (info: VerifyClientInfo) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });
};

const setupAffiliateWebSocket = (wss: WebSocketServer) => {
  wss.on("connection", (ws: WebSocket) => {
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
  wss.on("connection", async (ws: WebSocket) => {
    log("New wager races WebSocket connection established");

    const sendRaceData = async () => {
      try {
        const activeRaces = await db
          .select()
          .from(wagerRaces)
          .where(
            and(
              eq(wagerRaces.status, "live"),
              eq(wagerRaces.type, "weekly")
            )
          );

        ws.send(JSON.stringify(activeRaces));
      } catch (error) {
        log(`Error fetching wager race data: ${error}`);
      }
    };

    const interval = setInterval(sendRaceData, 5000);
    sendRaceData(); // Send initial data

    ws.on("close", () => {
      clearInterval(interval);
      log("Wager races WebSocket connection closed");
    });
  });
};

// API Routes
const setupApiRoutes = (app: Express) => {
  app.get("/api/affiliate/stats", handleAffiliateStats);
  app.get("/api/notification-preferences", handleGetNotificationPreferences);
  app.post("/api/notification-preferences", handleUpdateNotificationPreferences);
};

const handleAffiliateStats = async (req: Request, res: Response) => {
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

const handleGetNotificationPreferences = async (req: Request, res: Response) => {
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

const handleUpdateNotificationPreferences = async (req: Request, res: Response) => {
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

// Admin middleware to check if user is admin
const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return res.status(401).send("Unauthorized");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!user?.isAdmin) {
    return res.status(403).send("Forbidden");
  }

  next();
};

// Admin routes for wager race management
const setupAdminRoutes = (app: Express) => {
  // Get all wager races
  app.get("/api/admin/wager-races", adminMiddleware, async (req: Request, res: Response) => {
    try {
      const races = await db
        .select()
        .from(wagerRaces)
        .orderBy(wagerRaces.startDate);

      res.json(races);
    } catch (error) {
      console.error("Error fetching wager races:", error);
      res.status(500).json({ error: "Failed to fetch wager races" });
    }
  });

  // Create a new wager race
  app.post("/api/admin/wager-races", adminMiddleware, async (req: Request, res: Response) => {
    try {
      const [race] = await db
        .insert(wagerRaces)
        .values({
          ...req.body,
          createdBy: req.user!.id,
          status: "upcoming",
        })
        .returning();

      res.json(race);
    } catch (error) {
      console.error("Error creating wager race:", error);
      res.status(500).json({ error: "Failed to create wager race" });
    }
  });

  // Update a wager race
  app.put("/api/admin/wager-races/:id", adminMiddleware, async (req: Request, res: Response) => {
    try {
      const [race] = await db
        .update(wagerRaces)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(wagerRaces.id, parseInt(req.params.id)))
        .returning();

      if (!race) {
        return res.status(404).json({ error: "Race not found" });
      }

      res.json(race);
    } catch (error) {
      console.error("Error updating wager race:", error);
      res.status(500).json({ error: "Failed to update wager race" });
    }
  });

  // Delete a wager race
  app.delete("/api/admin/wager-races/:id", adminMiddleware, async (req: Request, res: Response) => {
    try {
      const [race] = await db
        .delete(wagerRaces)
        .where(eq(wagerRaces.id, parseInt(req.params.id)))
        .returning();

      if (!race) {
        return res.status(404).json({ error: "Race not found" });
      }

      res.json({ message: "Race deleted successfully" });
    } catch (error) {
      console.error("Error deleting wager race:", error);
      res.status(500).json({ error: "Failed to delete wager race" });
    }
  });
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupWebSocketServers(httpServer);
  setupApiRoutes(app);
  setupAdminRoutes(app);
  return httpServer;
}