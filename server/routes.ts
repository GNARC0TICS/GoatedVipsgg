import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";

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

    // Transform the API response into the expected format
    const transformedData = {
      success: true,
      data: {
        all_time: { 
          data: Array.isArray(data) ? data : [data] 
        },
        monthly: { 
          data: Array.isArray(data) ? data : [data] 
        },
        weekly: { 
          data: Array.isArray(data) ? data : [data] 
        }
      }
    };

    return transformedData;
  } catch (error) {
    log(`Error fetching leaderboard data: ${error}`);
    // Return empty data structure with the correct format
    return {
      success: false,
      error: "Failed to fetch leaderboard data",
      data: {
        all_time: { data: [] },
        monthly: { data: [] },
        weekly: { data: [] }
      }
    };
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication
  setupAuth(app);

  // WebSocket setup
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info: any) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });

  wss.on("connection", (ws: WebSocket) => {
    log("New WebSocket connection established");
    let interval: NodeJS.Timeout;

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
          ws.send(JSON.stringify({
            success: false,
            error: "Failed to fetch leaderboard data",
            data: {
              all_time: { data: [] },
              monthly: { data: [] },
              weekly: { data: [] }
            }
          }));
        }
      }
    };

    // Send initial data
    sendLeaderboardData();

    // Set up interval for updates (every 5 seconds)
    interval = setInterval(sendLeaderboardData, 5000);

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
      res.status(500).json({
        success: false,
        error: "Failed to fetch affiliate stats",
        data: {
          all_time: { data: [] },
          monthly: { data: [] },
          weekly: { data: [] }
        }
      });
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