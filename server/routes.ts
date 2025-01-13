import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { log } from "./vite";

const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsImlhdCI6MTcyNjc3Mjc5Nn0.PDZzGUz-3e6l3vh-vOOqXpbho4mhapZ8jHxfXDJBxEg";
const API_ENDPOINT = "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Affiliate Stats WebSocket
  const affiliateWss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/affiliate-stats",
    verifyClient: (info) => {
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  // Wager Races WebSocket
  const wagerRacesWss = new WebSocketServer({
    server: httpServer,
    path: "/ws/wager-races",
    verifyClient: (info) => {
      return !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr');
    }
  });

  log("WebSocket servers initialized");

  // Handle Affiliate WebSocket connections
  affiliateWss.on("connection", (ws) => {
    log("New affiliate WebSocket connection established");

    const interval = setInterval(async () => {
      try {
        const response = await fetch(API_ENDPOINT, {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`
          }
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        ws.send(JSON.stringify(data));
      } catch (error) {
        log(`Error fetching affiliate data: ${error}`);
      }
    }, 5000);

    ws.on("close", () => {
      clearInterval(interval);
      log("Affiliate WebSocket connection closed");
    });
  });

  // Handle Wager Races WebSocket connections
  wagerRacesWss.on("connection", (ws) => {
    log("New wager races WebSocket connection established");

    // Simulate wager race updates
    const interval = setInterval(() => {
      const mockData = {
        id: "weekly-race-1",
        type: "weekly",
        status: "live",
        prizePool: 100000,
        startDate: "2025-01-13T00:00:00Z",
        endDate: "2025-01-20T00:00:00Z",
        participants: Array.from({ length: 10 }, (_, i) => ({
          rank: i + 1,
          username: `Player${i + 1}`,
          wager: Math.floor(Math.random() * 1000000) + 500000,
          prizeShare: i === 0 ? 0.25 : 
                     i === 1 ? 0.15 :
                     i === 2 ? 0.10 :
                     i <= 6 ? 0.075 : 0.05
        })).sort((a, b) => b.wager - a.wager)
      };

      ws.send(JSON.stringify(mockData));
    }, 5000);

    ws.on("close", () => {
      clearInterval(interval);
      log("Wager races WebSocket connection closed");
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