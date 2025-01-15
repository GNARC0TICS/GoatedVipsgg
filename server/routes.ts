import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";

// New API configuration
const API_CONFIG = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiJtODJmSTlMQ1ZjZmEiLCJpYXQiOjE3MzY5MDQ2MTIsImV4cCI6MTczNjkyNjIxMn0.5qL9O_4qRk6APmiisigzAvlMxTAfwd_Zx_aLQZGCbhs",
  baseUrl: "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate"
};

async function fetchLeaderboardData() {
  try {
    log(`Fetching leaderboard data from ${API_CONFIG.baseUrl}/referral-leaderboard`);
    const response = await fetch(`${API_CONFIG.baseUrl}/referral-leaderboard`, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      log(`API Error: ${response.status} - ${response.statusText}`);
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    log('Successfully fetched leaderboard data');
    return data;
  } catch (error) {
    log(`Error fetching leaderboard data: ${error}`);
    // Return mock data structure matching the expected format
    return {
      all_time: {
        data: [
          { username: "Player1", totalWager: 15000, commission: 750 },
          { username: "Player2", totalWager: 12000, commission: 600 },
          { username: "Player3", totalWager: 9000, commission: 450 },
        ]
      },
      monthly: {
        data: [
          { username: "Player2", totalWager: 8000, commission: 400 },
          { username: "Player1", totalWager: 7000, commission: 350 },
          { username: "Player3", totalWager: 5000, commission: 250 },
        ]
      },
      weekly: {
        data: [
          { username: "Player3", totalWager: 3000, commission: 150 },
          { username: "Player1", totalWager: 2500, commission: 125 },
          { username: "Player2", totalWager: 2000, commission: 100 },
        ]
      }
    };
  }
}

// Bonus codes data
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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication
  setupAuth(app);

  // WebSocket setup for affiliate stats
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info: any) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });

  wss.on("connection", (ws: WebSocket) => {
    log("New WebSocket connection established");

    const sendLeaderboardData = async () => {
      try {
        const data = await fetchLeaderboardData();
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(data));
          log('Successfully sent leaderboard data through WebSocket');
        }
      } catch (error) {
        log(`WebSocket error: ${error}`);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ error: "Failed to fetch leaderboard data" }));
        }
      }
    };

    // Send initial data
    sendLeaderboardData();

    // Set up interval for updates
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
  app.get("/api/affiliate/stats", async (_req, res) => {
    try {
      const data = await fetchLeaderboardData();
      res.json(data);
    } catch (error) {
      log(`Error in /api/affiliate/stats: ${error}`);
      res.status(500).json({ error: "Failed to fetch affiliate stats" });
    }
  });

  // Bonus codes endpoint
  app.get("/api/bonus-codes", (_req, res) => {
    try {
      res.json({ bonusCodes: BONUS_CODES });
    } catch (error) {
      log(`Error in /api/bonus-codes: ${error}`);
      res.status(500).json({ error: "Failed to fetch bonus codes" });
    }
  });

  return httpServer;
}