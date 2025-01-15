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

    const sendLeaderboardData = async () => {
      try {
        const response = await fetch(API_ENDPOINT, {
          headers: { 'Authorization': `Bearer ${API_TOKEN}` }
        });

        if (!response.ok) {
          // Send mock data for development
          ws.send(JSON.stringify({
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
          }));
          return;
        }

        const data = await response.json();
        ws.send(JSON.stringify(data));
      } catch (error) {
        // Send mock data on error
        ws.send(JSON.stringify({
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
        }));
        log(`Error fetching affiliate data: ${error}`);
      }
    };

    // Send initial data
    sendLeaderboardData();

    // Set up interval for updates
    const interval = setInterval(sendLeaderboardData, 5000);

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

      if (!response.ok) {
        // Return mock data for development
        return res.json({
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
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      // Return mock data on error
      res.json({
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
      });
      log(`Error fetching affiliate stats: ${error}`);
    }
  });

  return httpServer;
}