import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { wagerRaces } from "@db/schema";
import { eq } from "drizzle-orm";

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

  return httpServer;
}