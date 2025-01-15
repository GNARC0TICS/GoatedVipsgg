import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";

// API configuration
const API_CONFIG = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiJtODJmSTlMQ1ZjZmEiLCJpYXQiOjE3MzY5MDQ2MTIsImV4cCI6MTczNjkyNjIxMn0.5qL9O_4qRk6APmiisigzAvlMxTAfwd_Zx_aLQZGCbhs",
  baseUrl: "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate"
};

const fetchLeaderboardData = async () => {
  const response = await fetch(`${API_CONFIG.baseUrl}/referral-leaderboard`, {
    headers: {
      'Authorization': API_CONFIG.token
    }
  });
  return await response.json();
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication
  setupAuth(app);

  // Setup WebSocket server for real-time leaderboard updates
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info: any) => {
      // Ignore Vite HMR WebSocket connections
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    log("New WebSocket connection established for leaderboard");

    const sendLeaderboardData = async () => {
      if (ws.readyState === ws.OPEN) {
        const data = await fetchLeaderboardData();
        ws.send(JSON.stringify(data));
      }
    };

    // Send initial data
    sendLeaderboardData();

    // Set up interval for updates (every 5 seconds)
    const interval = setInterval(sendLeaderboardData, 5000);

    ws.on("error", (error) => {
      log(`WebSocket error occurred: ${error}`);
    });

    ws.on("close", () => {
      clearInterval(interval);
      log("WebSocket connection closed");
    });
  });

  // HTTP endpoint for initial data load
  app.get("/api/affiliate/stats", (_req, res) => {
    try {
      const data = generateMockLeaderboardData();
      res.json(data);
    } catch (error) {
      log(`Error in /api/affiliate/stats: ${error}`);
      res.status(500).json({ error: "Failed to fetch affiliate stats" });
    }
  });

  // Bonus codes endpoint
  app.get("/api/bonus-codes", (_req, res) => {
    try {
      const BONUS_CODES = [
        {
          code: "WELCOME2024",
          description: "New player welcome bonus",
          expiryDate: "2024-02-15",
          value: "100% up to $100"
        },
        {
          code: "GOATEDVIP",
          description: "VIP exclusive reload bonus",
          expiryDate: "2024-01-31",
          value: "50% up to $500"
        },
        {
          code: "WEEKEND50",
          description: "Weekend special bonus",
          expiryDate: "2024-01-20",
          value: "50% up to $200"
        }
      ];
      res.json({ bonusCodes: BONUS_CODES });
    } catch (error) {
      log(`Error in /api/bonus-codes: ${error}`);
      res.status(500).json({ error: "Failed to fetch bonus codes" });
    }
  });

  return httpServer;
}