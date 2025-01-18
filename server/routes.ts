import type { Express } from "express";
import { createServer, type Server } from "http";
import expressWs from 'express-ws';
import { WebSocketHandler } from "./websocket";
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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup WebSocket support for Express
  const wsInstance = expressWs(app, httpServer);

  // Initialize WebSocket handler
  const wsHandler = new WebSocketHandler(httpServer);

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

  // Support channel websocket connection
  app.ws('/api/support', (ws, req) => {
    wsHandler.handleSupportConnection(ws, req);
  });

  return httpServer;
}