import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { requireAdmin, requireAuth, authenticate, adminOnly } from "./middleware/auth";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { Router } from 'express';


// Rate limiting setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

function handleLeaderboardConnection(ws: WebSocket) {
  const clientId = Date.now().toString();
  log(`Leaderboard WebSocket client connected (${clientId})`);

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", (error) => {
    log(`WebSocket error (${clientId}):`, error);
    clearInterval(pingInterval);
    ws.terminate();
  });

  ws.on("close", () => {
    log(`Leaderboard WebSocket client disconnected (${clientId})`);
    clearInterval(pingInterval);
  });

  // Send initial data with rate limiting
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      clientId,
      timestamp: Date.now()
    }));
  }
}

// Broadcast leaderboard updates to all connected clients
export function broadcastLeaderboardUpdate(data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "LEADERBOARD_UPDATE",
        data
      }));
    }
  });
}

let wss: WebSocketServer;

export const routes = Router();

// User routes
routes.get('/users', authenticate, async (req, res) => {
  try {
    const users = await db.query.users.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

routes.get('/users/:id', authenticate, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.params.id),
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Admin routes
routes.get('/admin/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const totalUsers = await db.query.users.count();
    res.json({ totalUsers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});



export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupAuth(app);
  app.use('/api', routes); // Mount the new router at /api
  setupWebSocket(httpServer);
  return httpServer;
}


function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    // Skip vite HMR requests
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    if (request.url === "/ws/leaderboard") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
        handleLeaderboardConnection(ws);
      });
    }
  });
}