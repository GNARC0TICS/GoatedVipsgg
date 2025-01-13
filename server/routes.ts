import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { log } from "./vite";
import { db } from "@db";
import { users, notificationPreferences, wagerRaces } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { IncomingMessage } from "http";

const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsImlhdCI6MTcyNjc3Mjc5Nn0.PDZzGUz-3e6l3vh-vOOqXpbho4mhapZ8jHxfXDJBxEg";
const API_ENDPOINT = "https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard";

// WebSocket handlers
const setupWebSocketServers = (httpServer: Server) => {
  const affiliateWss = createWebSocketServer(httpServer, "/ws/affiliate-stats");
  const wagerRacesWss = createWebSocketServer(httpServer, "/ws/wager-races");

  setupAffiliateWebSocket(affiliateWss);
  setupWagerRacesWebSocket(wagerRacesWss);

  log("WebSocket servers initialized");
};

interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

const createWebSocketServer = (server: Server, path: string) => {
  return new WebSocketServer({ 
    server,
    path,
    verifyClient: (info: VerifyClientInfo) => !info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')
  });
};

const setupAffiliateWebSocket = (wss: WebSocketServer) => {
  wss.on("connection", (ws: WebSocket) => {
    log("New affiliate WebSocket connection established");

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
      log("Affiliate WebSocket connection closed");
    });
  });
};

const setupWagerRacesWebSocket = (wss: WebSocketServer) => {
  wss.on("connection", async (ws: WebSocket) => {
    log("New wager races WebSocket connection established");

    const sendRaceData = async () => {
      try {
        const activeRaces = await db
          .select()
          .from(wagerRaces)
          .where(
            and(
              eq(wagerRaces.status, "live"),
              eq(wagerRaces.type, "weekly")
            )
          );

        ws.send(JSON.stringify(activeRaces));
      } catch (error) {
        log(`Error fetching wager race data: ${error}`);
      }
    };

    const interval = setInterval(sendRaceData, 5000);
    sendRaceData(); // Send initial data

    ws.on("close", () => {
      clearInterval(interval);
      log("Wager races WebSocket connection closed");
    });
  });
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // API Routes
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      log("Fetching initial affiliate data from API...");
      const response = await fetch(API_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });

      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);

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

  // Setup WebSocket servers
  setupWebSocketServers(httpServer);

  return httpServer;
}