import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { db } from "@db";
import { wagerRaces } from "@db/schema";
import { eq } from "drizzle-orm";

const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsImlhdCI6MTcyNjc3Mjc5Nn0.PDZzGUz-3e6l3vh-vOOqXpbho4mhapZ8jHxfXDJBxEg";
const API_ENDPOINT = "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard";

function createWebSocketServer(server: Server, path: string) {
  return new WebSocketServer({
    server,
    path,
    verifyClient: (info: any) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });
}

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user?.isAdmin) {
    return res.status(403).send('Unauthorized: Admin access required');
  }
  next();
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication first
  setupAuth(app);

  // Admin routes for wager races management
  app.get("/api/admin/wager-races", isAdmin, async (_req, res) => {
    try {
      const races = await db.select().from(wagerRaces).orderBy(wagerRaces.createdAt);
      res.json(races);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wager races" });
    }
  });

  app.post("/api/admin/wager-races", isAdmin, async (req, res) => {
    try {
      const [race] = await db.insert(wagerRaces).values({
        ...req.body,
        status: 'upcoming',
        createdBy: req.user!.id,
      }).returning();
      res.json(race);
    } catch (error) {
      res.status(500).json({ error: "Failed to create wager race" });
    }
  });

  app.put("/api/admin/wager-races/:id", isAdmin, async (req, res) => {
    try {
      const [race] = await db
        .update(wagerRaces)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(wagerRaces.id, parseInt(req.params.id)))
        .returning();
      res.json(race);
    } catch (error) {
      res.status(500).json({ error: "Failed to update wager race" });
    }
  });

  app.delete("/api/admin/wager-races/:id", isAdmin, async (req, res) => {
    try {
      await db
        .delete(wagerRaces)
        .where(eq(wagerRaces.id, parseInt(req.params.id)));
      res.json({ message: "Race deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete wager race" });
    }
  });

  // WebSocket setup for affiliate stats
  const wss = createWebSocketServer(httpServer, "/ws/affiliate-stats");

  wss.on("connection", (ws: WebSocket) => {
    log("New WebSocket connection established");

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
      log("WebSocket connection closed");
    });
  });

  // Basic API routes
  app.get("/api/affiliate/stats", async (_req, res) => {
    try {
      const response = await fetch(API_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });

      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch affiliate stats",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}