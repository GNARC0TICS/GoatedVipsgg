import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { log } from "./vite";
import { setupAuth } from "./auth";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { requireAdmin, requireAuth } from './middleware/auth';

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup authentication routes and middleware
  setupAuth(app);

  // HTTP endpoint for leaderboard data
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      await rateLimiter.consume(req.ip || "unknown");
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await fetchLeaderboardData(page, limit);
      res.json(data);
    } catch (error: any) {
      if (error.consumedPoints) {
        res.status(429).json({ error: "Too many requests" });
      } else {
        log(`Error in /api/affiliate/stats: ${error}`);
        res.status(500).json({
          success: false,
          error: "Failed to fetch affiliate stats",
          message: error.message
        });
      }
    }
  });

  // Setup WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade
  httpServer.on('upgrade', (request, socket, head) => {
    // Ignore vite HMR requests
    if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
      return;
    }

    if (request.url === '/ws/affiliate-stats') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // WebSocket connection handling
  wss.on('connection', async (ws: WebSocket) => {
    log('WebSocket client connected');
    let updateInterval: NodeJS.Timeout | null = null;
    let isAlive = true;

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      isAlive = true;
    });

    const cleanup = () => {
      if (updateInterval) clearInterval(updateInterval);
      clearInterval(pingInterval);
    };

    const sendUpdate = async () => {
      try {
        if (!isAlive) {
          cleanup();
          return;
        }
        const data = await fetchLeaderboardData();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      } catch (error) {
        log(`Error sending WebSocket update: ${error}`);
      }
    };

    try {
      // Send initial data
      await sendUpdate();

      // Setup periodic updates
      updateInterval = setInterval(sendUpdate, 30000);

      ws.on('close', () => {
        log('WebSocket client disconnected');
        cleanup();
      });

      ws.on('error', (error) => {
        log(`WebSocket error: ${error}`);
        cleanup();
        ws.terminate();
      });

    } catch (error) {
      log(`Error in WebSocket connection: ${error}`);
      cleanup();
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  });

  return httpServer;
}

async function fetchLeaderboardData(page: number = 0, limit: number = 10) {
  try {
    const response = await fetch(`https://europe-west2-g3casino.cloudfunctions.net/user/affiliate/leaderboard?page=${page}&limit=${limit}`);

    if (!response.ok) {
      log(`API error: ${response.status} - ${response.statusText}`);
      return {
        success: true,
        data: []
      };
    }

    const data = await response.json();
    log(`API Response: ${JSON.stringify(data)}`); // Debug log
    return {
      success: true,
      data: data.users.map((user: any) => ({
        uid: user.id.toString(),
        name: user.username,
        wagered: {
          today: parseFloat(user.wagered?.today || '0'),
          this_week: parseFloat(user.wagered?.this_week || '0'),
          this_month: parseFloat(user.wagered?.this_month || '0'),
          all_time: parseFloat(user.wagered?.all_time || '0')
        }
      }))
    };
  } catch (error) {
    log(`Error in fetchLeaderboardData: ${error}`);
    // Return empty data instead of throwing error
    return {
      success: true,
      data: []
    };
  }
}