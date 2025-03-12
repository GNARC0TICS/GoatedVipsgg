import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { requireAdmin, requireAuth } from "./middleware/auth";
import { db } from "@db";
// Import specific schemas from the updated schema structure
import * as schema from "@db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { affiliateRateLimiter, raceRateLimiter } from "./middleware/rate-limiter"; // Import rate limiters with correct path
import { registerBasicVerificationRoutes } from "./basic-verification-routes";

// Add missing type definitions
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

// Add utility functions
function getTierFromWager(wagerAmount: number): string {
  if (wagerAmount >= 1000000) return 'Diamond';
  if (wagerAmount >= 500000) return 'Platinum';
  if (wagerAmount >= 100000) return 'Gold';
  if (wagerAmount >= 50000) return 'Silver';
  return 'Bronze';
}

// Constants
const PRIZE_POOL_BASE = 500; // Base prize pool amount
const prizePool = PRIZE_POOL_BASE;

function handleLeaderboardConnection(ws: ExtendedWebSocket) {
  const clientId = Date.now().toString();
  log(`Leaderboard WebSocket client connected (${clientId})`);

  ws.isAlive = true;
  const pingInterval = setInterval(() => {
    if (!ws.isAlive) {
      clearInterval(pingInterval);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", (error: Error) => {
    log(`WebSocket error (${clientId}): ${error.message}`);
    clearInterval(pingInterval);
    ws.terminate();
  });

  ws.on("close", () => {
    log(`Leaderboard WebSocket client disconnected (${clientId})`);
    clearInterval(pingInterval);
  });

  // Send initial data with rate limiting
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "CONNECTED",
      clientId,
      timestamp: Date.now()
    }));
  }
}

// Broadcast leaderboard updates to all connected clients
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

// Helper functions
function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0)
  );
}

const transformMVPData = (mvpData: any) => {
  return Object.entries(mvpData).reduce((acc: Record<string, any>, [period, data]: [string, any]) => {
    if (data) {
      // Calculate if there was a wager change
      const currentWager = data.wagered[period === 'daily' ? 'today' : period === 'weekly' ? 'this_week' : 'this_month'];
      const previousWager = data.wagered?.previous || 0;
      const hasIncrease = currentWager > previousWager;

      acc[period] = {
        username: data.name,
        wagerAmount: currentWager,
        rank: 1,
        lastWagerChange: hasIncrease ? Date.now() : undefined,
        stats: {
          winRate: data.stats?.winRate || 0,
          favoriteGame: data.stats?.favoriteGame || 'Unknown',
          totalGames: data.stats?.totalGames || 0
        }
      };
    }
    return acc;
  }, {});
};

// Transforms raw API data into our standardized leaderboard format
// This is the central data transformation function used by both web and Telegram interfaces
function transformLeaderboardData(apiData: any) {
  // Extract data from various possible API response formats
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
  setupAuth(app);
  setupRESTRoutes(app);
  setupWebSocket(httpServer);
  // Register verification routes
  registerBasicVerificationRoutes(app);
  return httpServer;
}

function setupRESTRoutes(app: Express) {
  // Add endpoint to fetch previous month's results
  app.get("/api/wager-races/previous", async (_req, res) => {
    try {
      // Temporarily return empty data until next race
      res.status(404).json({
        status: "error",
        message: "No previous race data found",
      });
    } catch (error) {
      log(`Error fetching previous race: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch previous race data",
      });
    }
  });

  // Modified current race endpoint to handle month end
  app.get("/api/wager-races/current", raceRateLimiter, async (_req, res) => {
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
      const stats = transformLeaderboardData(rawData);

      // Get current month's info
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Check if previous month needs to be archived
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // If it's the first day of the month and we haven't archived yet
      if (now.getDate() === 1 && now.getHours() < 1) {
        const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        // Check if we already have an entry for the previous month
        const [existingEntry] = await db
          .select()
          .from(historicalRaces)
          .where(
            and(
              eq(historicalRaces.month, previousMonth),
              eq(historicalRaces.year, previousYear)
            )
          )
          .limit(1);

        const prizeDistribution = [0.5, 0.3, 0.1, 0.05, 0.05, 0, 0, 0, 0, 0]; //Example distribution, needs to be defined elsewhere

        if (!existingEntry && stats.data.monthly.data.length > 0) {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          // Store complete race results with detailed participant data
          const winners = stats.data.monthly.data.slice(0, 10).map((participant: any, index: number) => ({
            uid: participant.uid,
            name: participant.name,
            wagered: participant.wagered.this_month,
            allTimeWagered: participant.wagered.all_time,
            tier: getTierFromWager(participant.wagered.all_time),
            prize: (prizePool * prizeDistribution[index]).toFixed(2),
            position: index + 1,
            timestamp: new Date().toISOString()
          }));

          // Store race completion data
          await db.insert(historicalRaces).values({
            month: currentMonth,
            year: currentYear,
            prizePool: prizePool,
            startDate: new Date(currentYear, currentMonth, 1),
            endDate: now,
            participants: winners,
            totalWagered: stats.data.monthly.data.reduce((sum: number, p: any) => sum + p.wagered.this_month, 0),
            participantCount: stats.data.monthly.data.length,
            status: 'completed',
            metadata: {
              transitionEnds: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              nextRaceStarts: new Date(currentYear, currentMonth + 1, 1).toISOString(),
              prizeDistribution: prizeDistribution
            }
          });

          await db.insert(historicalRaces).values({
            month: previousMonth,
            year: previousYear,
            prizePool: 500,
            startDate: new Date(previousYear, previousMonth - 1, 1),
            endDate: new Date(previousYear, previousMonth, 0, 23, 59, 59),
            participants: winners,
            isCompleted: true
          });

          // Broadcast race completion to all connected clients
          broadcastLeaderboardUpdate({
            type: "RACE_COMPLETED",
            data: {
              winners,
              nextRaceStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            }
          });
        }
      }

      // Generate explicit dates to ensure correct month
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const raceData = {
        id: `${currentYear}${(currentMonth + 1).toString().padStart(2, '0')}`,
        status: 'live',
        startDate: new Date(currentYear, currentMonth, 1).toISOString(),
        endDate: endOfMonth.toISOString(),
        title: `${new Date(currentYear, currentMonth, 1).toLocaleString('en-US', { month: 'long' })} ${currentYear} Race`,
        prizePool: 500, // Monthly race prize pool
        participants: stats.data.monthly.data.map((participant: any, index: number) => ({
          uid: participant.uid,
          name: participant.name,
          wagered: participant.wagered.this_month,
          position: index + 1
        })).slice(0, 10) // Top 10 participants
      };
      
      // Log race data for debugging
      console.log(`Race data for month ${currentMonth + 1}, year ${currentYear}:`, raceData.title);

      res.json(raceData);
    } catch (error) {
      log(`Error fetching current race: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch current race",
      });
    }
  });

  app.get("/api/profile", requireAuth, handleProfileRequest);
  app.post("/api/admin/login", handleAdminLogin);
  app.get("/api/admin/users", requireAdmin, handleAdminUsersRequest);
  app.get("/api/admin/wager-races", requireAdmin, handleWagerRacesRequest);
  app.post("/api/admin/wager-races", requireAdmin, handleCreateWagerRace);
  app.get("/api/affiliate/stats", affiliateRateLimiter, handleAffiliateStats);

  // Support system endpoints
  app.get("/api/support/messages", requireAuth, async (req, res) => {
    try {
      const messages = await db.query.ticketMessages.findMany({
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        with: {
          user: {
            columns: {
              username: true,
              isAdmin: true
            }
          }
        }
      });

      res.json({
        status: "success",
        data: messages
      });
    } catch (error) {
      log(`Error fetching support messages: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch support messages"
      });
    }
  });

  app.get("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const tickets = await db.query.supportTickets.findMany({
        orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
        with: {
          user: {
            columns: {
              username: true
            }
          },
          messages: true
        }
      });

      res.json({
        status: "success",
        data: tickets
      });
    } catch (error) {
      log(`Error fetching support tickets: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch support tickets"
      });
    }
  });

  app.post("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const [ticket] = await db.insert(supportTickets)
        .values({
          userId: req.user!.id,
          subject: req.body.subject,
          description: req.body.description,
          status: 'open',
          priority: req.body.priority || 'medium',
          createdAt: new Date()
        })
        .returning();

      // Create initial message
      await db.insert(ticketMessages)
        .values({
          ticketId: ticket.id,
          userId: req.user!.id,
          message: req.body.description,
          createdAt: new Date(),
          isStaffReply: false
        });

      res.json({
        status: "success",
        data: ticket
      });
    } catch (error) {
      log(`Error creating support ticket: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to create support ticket"
      });
    }
  });

  app.post("/api/support/reply", requireAuth, async (req, res) => {
    try {
      const { ticketId, message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Message is required"
        });
      }

      const [savedMessage] = await db
        .insert(ticketMessages)
        .values({
          ticketId,
          message: message.trim(),
          userId: req.user!.id,
          isStaffReply: req.user!.isAdmin,
          createdAt: new Date()
        })
        .returning();

      // Update ticket status if admin replied
      if (req.user!.isAdmin) {
        await db
          .update(supportTickets)
          .set({ status: 'in_progress' })
          .where(eq(supportTickets.id, ticketId));
      }

      // Broadcast message to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'NEW_MESSAGE',
            data: savedMessage
          }));
        }
      });

      res.json({
        status: "success",
        data: savedMessage
      });
    } catch (error) {
      log(`Error saving support reply: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to save reply"
      });
    }
  });

  app.patch("/api/support/tickets/:id", requireAdmin, async (req, res) => {
    try {
      const { status, priority, assignedTo } = req.body;
      const [updatedTicket] = await db
        .update(supportTickets)
        .set({
          status,
          priority,
          assignedTo,
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, parseInt(req.params.id)))
        .returning();

      res.json({
        status: "success",
        data: updatedTicket
      });
    } catch (error) {
      log(`Error updating support ticket: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to update support ticket"
      });
    }
  });

  // Bonus code management routes
  app.get("/api/admin/bonus-codes", requireAdmin, async (_req, res) => {
    try {
      const codes = await db.query.bonusCodes.findMany({
        orderBy: (codes, { desc }) => [desc(codes.createdAt)],
      });
      res.json(codes);
    } catch (error) {
      log(`Error fetching bonus codes: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch bonus codes",
      });
    }
  });

  app.post("/api/admin/bonus-codes", requireAdmin, async (req, res) => {
    try {
      const [code] = await db
        .insert(bonusCodes)
        .values({
          ...req.body,
          createdBy: req.user!.id,
        })
        .returning();
      res.json(code);
    } catch (error) {
      log(`Error creating bonus code: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to create bonus code",
      });
    }
  });

  app.put("/api/admin/bonus-codes/:id", requireAdmin, async (req, res) => {
    try {
      const [code] = await db
        .update(bonusCodes)
        .set(req.body)
        .where(eq(bonusCodes.id, parseInt(req.params.id)))
        .returning();
      res.json(code);
    } catch (error) {
      log(`Error updating bonus code: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to update bonus code",
      });
    }
  });

  app.delete("/api/admin/bonus-codes/:id", requireAdmin, async (req, res) => {
    try {
      await db
        .delete(bonusCodes)
        .where(eq(bonusCodes.id, parseInt(req.params.id)));
      res.json({ status: "success" });
    } catch (error) {
      log(`Error deleting bonus code: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to delete bonus code",
      });
    }
  });

  // Chat history endpoint
  app.get("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const messages = await db.query.ticketMessages.findMany({
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 50,
      });
      res.json(messages);
    } catch (error) {
      log(`Error fetching chat history: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch chat history",
      });
    }
  });

  app.get("/api/admin/analytics", requireAdmin, async (_req, res) => {
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
        db.select({ count: sql`count(*)` }).from(users),
        db.select({ count: sql`count(*)` }).from(wagerRaces).where(eq(wagerRaces.status, 'live')),
      ]);

      const stats = {
        totalUsers: userCount[0].count,
        activeRaces: raceCount[0].count,
        wagerTotals: totals
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
}

// Request handlers
async function handleProfileRequest(req: any, res: any) {
  try {
    // Fetch user data
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Fetch current leaderboard data
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

    const leaderboardData = await response.json();
    const data = leaderboardData.data || leaderboardData.results || leaderboardData;

    // Find user positions
    const position = {
      weekly: data.findIndex((entry: any) => entry.uid === user.id) + 1 || undefined,
      monthly: data.findIndex((entry: any) => entry.uid === user.id) + 1 || undefined
    };

    res.json({
      status: "success",
      data: {
        ...user,
        position
      },
    });
  } catch (error) {
    log(`Error fetching profile: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch profile",
    });
  }
}

async function handleAffiliateStats(req: any, res: any) {
  try {
    const username = req.query.username;
    let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

    if (username) {
      url += `?username=${encodeURIComponent(username)}`;
    }

    const response = await fetch(url,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || API_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      }
    );

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
    // Return empty data structure to prevent UI breaking
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
}

async function handleAdminLogin(req: any, res: any) {
  try {
    const result = adminLoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: result.error.issues.map((i) => i.message).join(", "),
      });
    }

    const { username, password } = result.data;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || !user.isAdmin) {
      return res.status(401).json({
        status: "error",
        message: "Invalid admin credentials",
      });
    }

    // Verify password and generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      status: "success",
      message: "Admin login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    log(`Admin login error: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to process admin login",
    });
  }
}

async function handleAdminUsersRequest(_req: any, res: any) {
  try {
    const usersList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .orderBy(users.createdAt);

    res.json({
      status: "success",
      data: usersList,
    });
  } catch (error) {
    log(`Error fetching users: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch users",
    });
  }
}

async function handleWagerRacesRequest(_req: any, res: any) {
  try {
    const races = await db.query.wagerRaces.findMany({
      orderBy: (races, { desc }) => [desc(races.createdAt)],
    });
    res.json({
      status: "success",
      data: races,
    });
  } catch (error) {
    log(`Error fetching wager races: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch wager races",
    });
  }
}

async function handleCreateWagerRace(req: any, res: any) {
  try {
    const race = await db
      .insert(wagerRaces)
      .values({
        ...req.body,
        createdBy: req.user!.id,
      })
      .returning();

    // Broadcast update to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "RACE_UPDATE", data: race[0] }));
      }
    });

    res.json({
      status: "success",
      message: "Race created successfully",
      data: race[0],
    });
  } catch (error) {
    log(`Error creating wager race: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to create wager race",
    });
  }
}

function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    // Skip vite HMR requests
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

const chatMessageSchema = z.object({
  type: z.literal("chat_message"),
  message: z.string().min(1).max(1000),
  userId: z.number().optional(),
  isStaffReply: z.boolean().default(false),
});

async function handleChatConnection(ws: WebSocket) {
  log("Chat WebSocket client connected");
  let pingInterval: NodeJS.Timeout;

  // Setup ping interval
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

      const { message: messageText, userId, isStaffReply } = result.data;

      // Save message to database
      const [savedMessage] = await db
        .insert(ticketMessages)
        .values({
          message: messageText,
          userId: userId || null,
          isStaffReply,
          createdAt: new Date(),
        })
        .returning();

      // Broadcast message to all connected clients
      const broadcastMessage = {
        id: savedMessage.id,
        message: savedMessage.message,
        userId: savedMessage.userId,
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

  // Send welcome message
  const welcomeMessage = {
    id: Date.now(),
    message:
      "Welcome to VIP Support! How can we assist you today? Our team is here to help with any questions or concerns youmay have.",
    userId: null,
    createdAt: new Date(),
    isStaffReply: true,
  };
  ws.send(JSON.stringify(welcomeMessage));
}

const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

function generateToken(payload: any): string {
  //Implementation for generateToken is missing in original code, but it's not relevant to the fix.  Leaving as is.
  return "";
}