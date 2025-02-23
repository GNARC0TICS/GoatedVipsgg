import { Router, type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import cors from "cors";

// API Constants
const LEADERBOARD_API_URL = 'https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/referral-leaderboard/2RW440E';
const LEADERBOARD_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJNZ2xjTU9DNEl6cWpVbzVhTXFBVyIsInNlc3Npb24iOiJEVVQ2Vkh1S3pNMjIiLCJpYXQiOjE3Mzc0MjQ3ODMsImV4cCI6MTczNzUxMTE4M30.ozh12z5PbT9vkZHb8x8d3BI4dUxe6KCyH8cYPUAMxGo';

interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
}

let wsServer: WebSocketServer;

async function fetchLeaderboardData() {
  console.log('Fetching leaderboard data from API...');
  try {
    const response = await fetch(LEADERBOARD_API_URL, {
      headers: {
        Authorization: `Bearer ${LEADERBOARD_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const rawData = await response.json();
    console.log('Raw API response:', JSON.stringify(rawData, null, 2));
    return rawData;
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    throw error;
  }
}

function setupWebSocket(httpServer: Server) {
  wsServer = new WebSocketServer({
    noServer: true,
    path: "/ws"
  });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request);
      setupWebSocketHandlers(ws as CustomWebSocket);
    });
  });
}

function setupWebSocketHandlers(ws: CustomWebSocket) {
  ws.isAlive = true;

  ws.on("close", () => {
    console.log('WebSocket connection closed');
  });

  ws.on("error", (error: Error) => {
    console.error('WebSocket error:', error);
    ws.terminate();
  });

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      timestamp: new Date().toISOString()
    }));
  }
}

function registerRoutes(app: Express): Server {
  app.use(express.json());
  app.use(cors({
    origin: true,
    credentials: true
  }));

  const httpServer = createServer(app);
  const apiRouter = Router();

  // Direct API endpoint without transformation
  apiRouter.get("/affiliate/stats", async (_req, res) => {
    try {
      console.log('Fetching leaderboard data...');
      const data = await fetchLeaderboardData();

      // Broadcast update to WebSocket clients
      if (wsServer) {
        wsServer.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "LEADERBOARD_UPDATE",
              data,
              timestamp: new Date().toISOString()
            }));
          }
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Error in /affiliate/stats:', error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch leaderboard data",
        timestamp: new Date().toISOString()
      });
    }
  });

  app.use("/api", apiRouter);
  setupWebSocket(httpServer);
  return httpServer;
}

export { setupWebSocket, registerRoutes };