import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { db } from "@db";
import { wagerRaces, ticketMessages } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { historicalRaces } from "@db/schema";

// Rate limiting setup
const rateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 1,
});

function handleLeaderboardConnection(ws: WebSocket) {
  const clientId = Date.now().toString();
  log(`Leaderboard WebSocket client connected (${clientId})`);

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", (error) => {
    log(`WebSocket error (${clientId}):`, error);
    clearInterval(pingInterval);
    ws.terminate();
  });

  ws.on("close", () => {
    log(`Leaderboard WebSocket client disconnected (${clientId})`);
    clearInterval(pingInterval);
  });

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      clientId,
      timestamp: Date.now()
    }));
  }
}

export function broadcastLeaderboardUpdate(data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "LEADERBOARD_UPDATE",
        data
      }));
    }
  });
}

let wss: WebSocketServer;

function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0)
  );
}

function transformLeaderboardData(apiData: any) {
  const responseData = apiData.data || apiData.results || apiData;
  if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
    return {
      status: "success",
      metadata: {
        totalUsers: 0,
        lastUpdated: new Date().toISOString(),
      },
      data: {
        today: { data: [] },
        weekly: { data: [] },
        monthly: { data: [] },
        all_time: { data: [] },
      },
    };
  }

  const dataArray = Array.isArray(responseData) ? responseData : [responseData];
  const transformedData = dataArray.map((entry) => ({
    uid: entry.uid || "",
    name: entry.name || "",
    wagered: {
      today: entry.wagered?.today || 0,
      this_week: entry.wagered?.this_week || 0,
      this_month: entry.wagered?.this_month || 0,
      all_time: entry.wagered?.all_time || 0,
    },
  }));

  return {
    status: "success",
    metadata: {
      totalUsers: transformedData.length,
      lastUpdated: new Date().toISOString(),
    },
    data: {
      today: { data: sortByWagered(transformedData, "today") },
      weekly: { data: sortByWagered(transformedData, "this_week") },
      monthly: { data: sortByWagered(transformedData, "this_month") },
      all_time: { data: sortByWagered(transformedData, "all_time") },
    },
  };
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupRESTRoutes(app);
  setupWebSocket(httpServer);
  return httpServer;
}

function setupRESTRoutes(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  app.get("/api/wager-races/current", async (_req, res) => {
    try {
      await rateLimiter.consume(_req.ip || "unknown");
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const rawData = await response.json();
      const stats = transformLeaderboardData(rawData);

      // Get current month's info
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const raceData = {
        id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
        status: 'live',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        endDate: endOfMonth.toISOString(),
        prizePool: 500,
        participants: stats.data.monthly.data.map((participant: any, index: number) => ({
          uid: participant.uid,
          name: participant.name,
          wagered: participant.wagered.this_month,
          position: index + 1
        })).slice(0, 10)
      };

      res.json(raceData);
    } catch (error) {
      log(`Error fetching current race: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch current race",
      });
    }
  });

  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      await rateLimiter.consume(req.ip || "unknown");
      const username = req.query.username;
      let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

      if (username) {
        url += `?username=${encodeURIComponent(username)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          log("API Authentication failed - check API token");
          throw new Error("API Authentication failed");
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiData = await response.json();
      const transformedData = transformLeaderboardData(apiData);

      res.json(transformedData);
    } catch (error) {
      log(`Error in /api/affiliate/stats: ${error}`);
      res.json({
        status: "success",
        metadata: {
          totalUsers: 0,
          lastUpdated: new Date().toISOString(),
        },
        data: {
          today: { data: [] },
          weekly: { data: [] },
          monthly: { data: [] },
          all_time: { data: [] },
        },
      });
    }
  });

  // Chat system endpoints
  app.get("/api/chat/messages", async (_req, res) => {
    try {
      const messages = await db.query.ticketMessages.findMany({
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 50,
      });
      res.json(messages);
    } catch (error) {
      log(`Error fetching chat messages: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch chat messages",
      });
    }
  });
  app.get("/api/admin/analytics", async (_req, res) => {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const rawData = await response.json();
      const data = rawData.data || rawData.results || rawData;

      // Calculate totals
      const totals = data.reduce((acc: any, entry: any) => {
        acc.dailyTotal += entry.wagered?.today || 0;
        acc.weeklyTotal += entry.wagered?.this_week || 0;
        acc.monthlyTotal += entry.wagered?.this_month || 0;
        acc.allTimeTotal += entry.wagered?.all_time || 0;
        return acc;
      }, {
        dailyTotal: 0,
        weeklyTotal: 0,
        monthlyTotal: 0,
        allTimeTotal: 0
      });

      const [userCount, raceCount] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(wagerRaces),
        db.select({ count: sql`count(*)` }).from(wagerRaces).where(eq(wagerRaces.status, 'live')),
      ]);

      const stats = {
        totalRaces: userCount[0].count,
        activeRaces: raceCount[0].count,
        wagerTotals: totals
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
}

const chatMessageSchema = z.object({
  type: z.literal("chat_message"),
  message: z.string().min(1).max(1000),
  isStaffReply: z.boolean().default(false),
});

async function handleChatConnection(ws: WebSocket) {
  log("Chat WebSocket client connected");
  let pingInterval: NodeJS.Timeout;

  pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const result = chatMessageSchema.safeParse(message);

      if (!result.success) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
        return;
      }

      const { message: messageText, isStaffReply } = result.data;

      const [savedMessage] = await db
        .insert(ticketMessages)
        .values({
          message: messageText,
          isStaffReply,
          createdAt: new Date(),
        })
        .returning();

      const broadcastMessage = {
        id: savedMessage.id,
        message: savedMessage.message,
        createdAt: savedMessage.createdAt,
        isStaffReply: savedMessage.isStaffReply,
      };

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(broadcastMessage));
        }
      });
    } catch (error) {
      log(`Error handling chat message: ${error}`);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to process message",
        })
      );
    }
  });

  ws.on("close", () => {
    log("Chat WebSocket client disconnected");
    clearInterval(pingInterval);
  });

  ws.on("error", (error) => {
    log(`WebSocket error: ${error}`);
    clearInterval(pingInterval);
    ws.terminate();
  });

  const welcomeMessage = {
    id: Date.now(),
    message:
      "Welcome to Support! How can we assist you today? Our team is here to help with any questions or concerns you may have.",
    createdAt: new Date(),
    isStaffReply: true,
  };
  ws.send(JSON.stringify(welcomeMessage));
}

function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    if (request.url === "/ws/leaderboard") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
        handleLeaderboardConnection(ws);
      });
    } else if (request.url === "/ws/chat") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
        handleChatConnection(ws);
      });
    }
  });
}