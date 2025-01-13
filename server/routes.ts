import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth.js";
import { db } from "@db";
import { wagers, affiliateStats } from "@db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { log } from "./vite";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/leaderboard"
  });

  log("WebSocket server initialized");

  // Handle WebSocket connections
  wss.on("connection", (ws) => {
    log("New WebSocket connection established");

    const interval = setInterval(async () => {
      try {
        const leaderboard = await db.select({
          username: wagers.userId,
          totalWager: sql<number>`sum(${wagers.amount})`,
        })
        .from(wagers)
        .groupBy(wagers.userId)
        .orderBy(desc(sql`sum(${wagers.amount})`))
        .limit(10);

        ws.send(JSON.stringify(leaderboard.map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }))));
      } catch (error) {
        log(`Error fetching leaderboard: ${error}`);
      }
    }, 1000);

    ws.on("close", () => {
      clearInterval(interval);
      log("WebSocket connection closed");
    });
  });

  // API Routes
  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const leaderboard = await db.select({
        username: wagers.userId,
        totalWager: sql<number>`sum(${wagers.amount})`,
      })
      .from(wagers)
      .groupBy(wagers.userId)
      .orderBy(desc(sql`sum(${wagers.amount})`))
      .limit(10);

      res.json(leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })));
    } catch (error) {
      log(`Error in /api/leaderboard: ${error}`);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/affiliate/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const stats = await db.select()
        .from(affiliateStats)
        .where(eq(affiliateStats.affiliateId, req.user!.id))
        .orderBy(desc(affiliateStats.timestamp))
        .limit(30);

      res.json(stats);
    } catch (error) {
      log(`Error in /api/affiliate/stats: ${error}`);
      res.status(500).json({ error: "Failed to fetch affiliate stats" });
    }
  });

  return httpServer;
}