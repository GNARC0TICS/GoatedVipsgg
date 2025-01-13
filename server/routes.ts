import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { log } from "./vite";

const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsImlhdCI6MTcyNjc3Mjc5Nn0.PDZzGUz-3e6l3vh-vOOqXpbho4mhapZ8jHxfXDJBxEg";
const API_ENDPOINT = "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/affiliate-stats",
    // Important: Ignore Vite HMR WebSocket requests
    verifyClient: (info) => {
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  log("WebSocket server initialized");

  // Handle WebSocket connections for real-time updates
  wss.on("connection", (ws) => {
    log("New WebSocket connection established");

    const interval = setInterval(async () => {
      try {
        log("Fetching affiliate data from API...");
        const response = await fetch(API_ENDPOINT, {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`
          }
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        log(`Successfully fetched data for ${data.data?.length || 0} affiliates`);
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

  // API Routes
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      log("Fetching initial affiliate data from API...");
      const response = await fetch(API_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`
        }
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

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
  });

  return httpServer;
}