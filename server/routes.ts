import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";

const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsImlhdCI6MTcyNjc3Mjc5Nn0.PDZzGUz-3e6l3vh-vOOqXpbho4mhapZ8jHxfXDJBxEg";
const API_ENDPOINT = "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard";

function createWebSocketServer(server: Server, path: string) {
  return new WebSocketServer({
    server,
    path,
    verifyClient: (info: any) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication first
  setupAuth(app);

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