import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";

// Mock data structure
const generateMockLeaderboardData = () => ({
  all_time: {
    data: [
      { username: "Player1", totalWager: 150000, commission: 7500 },
      { username: "Player2", totalWager: 120000, commission: 6000 },
      { username: "Player3", totalWager: 90000, commission: 4500 },
    ]
  },
  monthly: {
    data: [
      { username: "Player2", totalWager: 80000, commission: 4000 },
      { username: "Player1", totalWager: 70000, commission: 3500 },
      { username: "Player3", totalWager: 50000, commission: 2500 },
    ]
  },
  weekly: {
    data: [
      { username: "Player3", totalWager: 30000, commission: 1500 },
      { username: "Player1", totalWager: 25000, commission: 1250 },
      { username: "Player2", totalWager: 20000, commission: 1000 },
    ]
  }
});

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

    const sendLeaderboardData = () => {
      if (ws.readyState === ws.OPEN) {
        const data = generateMockLeaderboardData();
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