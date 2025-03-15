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
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { z } from "zod";
import {
  affiliateRateLimiter,
  raceRateLimiter,
} from "./middleware/rate-limiter"; // Import rate limiters with correct path
import { registerBasicVerificationRoutes } from "./basic-verification-routes";
import supportRoutes from "./routes/support";

// Add missing type definitions
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

// Add utility functions
function getTierFromWager(wagerAmount: number): string {
  if (wagerAmount >= 1000000) return "Diamond";
  if (wagerAmount >= 500000) return "Platinum";
  if (wagerAmount >= 100000) return "Gold";
  if (wagerAmount >= 50000) return "Silver";
  return "Bronze";
}

// Constants
const PRIZE_POOL_BASE = 500; // Base prize pool amount
const prizePool = PRIZE_POOL_BASE;

// Define a type for the leaderboard data cache
type LeaderboardData = {
  status: string;
  metadata: {
    totalUsers: number;
    lastUpdated: string;
  };
  data: {
    today: { data: any[] };
    weekly: { data: any[] };
    monthly: { data: any[] };
    all_time: { data: any[] };
  };
};

// Update the cache variable with proper typing
let cachedLeaderboardData: LeaderboardData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Centralized function to get leaderboard data with caching
 * This reduces redundant API calls by storing the data for a period of time
 */
async function getLeaderboardData() {
  const now = Date.now();
  // Return cached data if it's still fresh
  if (cachedLeaderboardData && now - lastFetchTime < CACHE_DURATION) {
    return cachedLeaderboardData;
  }
  
  // Fetch fresh data from the API
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
    // Transform once and cache
    const transformedData = transformLeaderboardData(rawData);
    
    // Update cache
    cachedLeaderboardData = transformedData;
    lastFetchTime = now;
    
    return transformedData;
  } catch (error) {
    log(`Error fetching leaderboard data: ${error}`);
    // If there's an error, return the stale cache if available
    if (cachedLeaderboardData) {
      return cachedLeaderboardData;
    }
    throw error;
  }
}

function handleLeaderboardConnection(ws: WebSocket) {
  const extendedWs = ws as ExtendedWebSocket;
  extendedWs.isAlive = true;
  
  log("Leaderboard WebSocket client connected");
  
  const clientId = Date.now().toString();
  const pingInterval = setInterval(() => {
    if (!extendedWs.isAlive) {
      clearInterval(pingInterval);
      return ws.terminate();
    }
    extendedWs.isAlive = false;
    extendedWs.ping();
  }, 30000);

  ws.on("pong", () => {
    extendedWs.isAlive = true;
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
    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        clientId,
        timestamp: Date.now(),
      }),
    );
  }
}

// Broadcast leaderboard updates to all connected clients
export function broadcastLeaderboardUpdate(data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "LEADERBOARD_UPDATE",
          data,
        }),
      );
    }
  });
}

let wss: WebSocketServer;

// Helper functions
function sortByWagered(data: any[], period: string) {
  return [...data].sort(
    (a, b) => (b.wagered[period] || 0) - (a.wagered[period] || 0),
  );
}

const transformMVPData = (mvpData: any) => {
  return Object.entries(mvpData).reduce(
    (acc: Record<string, any>, [period, data]: [string, any]) => {
      if (data) {
        // Calculate if there was a wager change
        const currentWager =
          data.wagered[
            period === "daily"
              ? "today"
              : period === "weekly"
                ? "this_week"
                : "this_month"
          ];
        const previousWager = data.wagered?.previous || 0;
        const hasIncrease = currentWager > previousWager;

        acc[period] = {
          username: data.name,
          wagerAmount: currentWager,
          rank: 1,
          lastWagerChange: hasIncrease ? Date.now() : undefined,
          stats: {
            winRate: data.stats?.winRate || 0,
            favoriteGame: data.stats?.favoriteGame || "Unknown",
            totalGames: data.stats?.totalGames || 0,
          },
        };
      }
      return acc;
    },
    {},
  );
};

// Transforms raw API data into our standardized leaderboard format
// This is the central data transformation function used by both web and Telegram interfaces
function transformLeaderboardData(apiData: any) {
  // Extract data from various possible API response formats
  const responseData = apiData.data || apiData.results || apiData;
  if (
    !responseData ||
    (Array.isArray(responseData) && responseData.length === 0)
  ) {
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
  // Import and use support routes
  app.use("/api/support", requireAuth, supportRoutes);

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
      // Use cached data instead of making a new API call
      const stats = await getLeaderboardData();

      // Get current month's info
      const now = new Date();
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      // Check if previous month needs to be archived
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // If it's the first day of the month and we haven't archived yet
      if (now.getDate() === 1 && now.getHours() < 1) {
        const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const previousYear =
          now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        // Use a placeholder for now
        const existingEntry = null;

        const prizeDistribution = [0.5, 0.3, 0.1, 0.05, 0.05, 0, 0, 0, 0, 0]; //Example distribution, needs to be defined elsewhere

        if (!existingEntry && stats.data.monthly.data.length > 0) {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          // Store complete race results with detailed participant data
          const winners = stats.data.monthly.data
            .slice(0, 10)
            .map((participant: any, index: number) => ({
              uid: participant.uid,
              name: participant.name,
              wagered: participant.wagered.this_month,
              allTimeWagered: participant.wagered.all_time,
              tier: getTierFromWager(participant.wagered.all_time),
              prize: (prizePool * prizeDistribution[index]).toFixed(2),
              position: index + 1,
              timestamp: new Date().toISOString(),
            }));

          // Broadcast race completion to all connected clients
          broadcastLeaderboardUpdate({
            type: "RACE_COMPLETED",
            data: {
              winners,
              nextRaceStart: new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
              ).toISOString(),
            },
          });
        }
      }

      // Generate explicit dates to ensure correct month
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const raceData = {
        id: `${currentYear}${(currentMonth + 1).toString().padStart(2, "0")}`,
        status: "live",
        startDate: new Date(currentYear, currentMonth, 1).toISOString(),
        endDate: endOfMonth.toISOString(),
        prizePool: 500, // Monthly race prize pool
        participants: stats.data.monthly.data
          .map((participant: any, index: number) => ({
            uid: participant.uid,
            name: participant.name,
            wagered: participant.wagered.this_month,
            position: index + 1,
          }))
          .slice(0, 10), // Top 10 participants
      };

      // Log race data for debugging
      console.log(
        `Race data for month ${currentMonth + 1}, year ${currentYear}`,
      );

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
      /*
      // Use the db.select approach instead of db.query
      const messages = await db
        .select()
        .from(schema.ticketMessages)
        .orderBy(schema.ticketMessages.createdAt);
      */
      
      // Use a placeholder for now
      const messages: any[] = [];

      res.json({
        status: "success",
        data: messages,
      });
    } catch (error) {
      log(`Error fetching support messages: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch support messages",
      });
    }
  });

  app.get("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      /*
      // Use the db.select approach instead of db.query
      const tickets = await db
        .select()
        .from(schema.supportTickets)
        .orderBy(schema.supportTickets.createdAt);

      // Fetch messages separately
      const ticketIds = tickets.map(ticket => ticket.id);
      const messages = ticketIds.length > 0 
        ? await db
            .select()
            .from(schema.ticketMessages)
            .where(sql`${schema.ticketMessages.ticketId} IN ${ticketIds}`)
        : [];

      // Fetch users separately
      const userIds = tickets.map(ticket => ticket.userId).filter(Boolean);
      const users = userIds.length > 0
        ? await db
            .select({
              id: schema.users.id,
              username: schema.users.username
            })
            .from(schema.users)
            .where(sql`${schema.users.id} IN ${userIds}`)
        : [];

      // Combine the data
      const ticketsWithRelations = tickets.map(ticket => ({
        ...ticket,
        user: users.find(user => user.id === ticket.userId),
        messages: messages.filter(message => message.ticketId === ticket.id)
      }));
      */
      
      // Use a placeholder for now
      const ticketsWithRelations: any[] = [];

      res.json({
        status: "success",
        data: ticketsWithRelations,
      });
    } catch (error) {
      log(`Error fetching support tickets: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch support tickets",
      });
    }
  });

  app.post("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      /*
      const [ticket] = await db
        .insert(schema.supportTickets)
        .values({
          userId: req.user!.id,
          subject: req.body.subject,
          description: req.body.description,
          status: "open",
          priority: req.body.priority || "medium",
          createdAt: new Date(),
        })
        .returning();

      // Create initial message
      await db.insert(schema.ticketMessages).values({
        ticketId: ticket.id,
        userId: req.user!.id,
        message: req.body.description,
        createdAt: new Date(),
        isStaffReply: false,
      });
      */

      // Placeholder implementation
      const ticket = { id: Date.now() };

      res.json({
        status: "success",
        data: ticket,
      });
    } catch (error) {
      log(`Error creating support ticket: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to create support ticket",
      });
    }
  });

  app.post("/api/support/reply", requireAuth, async (req, res) => {
    try {
      const { ticketId, message } = req.body;

      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Message is required",
        });
      }

      /*
      const [savedMessage] = await db
        .insert(schema.ticketMessages)
        .values({
          ticketId,
          message: message.trim(),
          userId: req.user!.id,
          isStaffReply: req.user!.isAdmin,
          createdAt: new Date(),
        })
        .returning();

      // Update ticket status if admin replied
      if (req.user!.isAdmin) {
        await db
          .update(schema.supportTickets)
          .set({ status: "in_progress" })
          .where(eq(schema.supportTickets.id, ticketId));
      }
      */

      // Placeholder implementation
      const savedMessage = {
        id: Date.now(),
        message: message.trim(),
        userId: req.user!.id,
        createdAt: new Date(),
        isStaffReply: req.user!.isAdmin,
      };

      // Broadcast message to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "NEW_MESSAGE",
              data: savedMessage,
            }),
          );
        }
      });

      res.json({
        status: "success",
        data: savedMessage,
      });
    } catch (error) {
      log(`Error saving support reply: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to save reply",
      });
    }
  });

  app.patch("/api/support/tickets/:id", requireAdmin, async (req, res) => {
    try {
      const { status, priority, assignedTo } = req.body;
      /*
      const [updatedTicket] = await db
        .update(schema.supportTickets)
        .set({
          status,
          priority,
          assignedTo,
          updatedAt: new Date(),
        })
        .where(eq(schema.supportTickets.id, parseInt(req.params.id)))
        .returning();
      */

      // Placeholder implementation
      const updatedTicket = {
        id: parseInt(req.params.id),
        status,
        priority,
        assignedTo,
        updatedAt: new Date(),
      };

      res.json({
        status: "success",
        data: updatedTicket,
      });
    } catch (error) {
      log(`Error updating support ticket: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to update support ticket",
      });
    }
  });

  // Bonus code management routes
  app.get("/api/admin/bonus-codes", requireAdmin, async (_req, res) => {
    try {
      /*
      const codes = await db.query.bonusCodes.findMany({
        orderBy: (codes, { desc }) => [desc(codes.createdAt)],
      });
      res.json(codes);
      */
      // Placeholder implementation
      res.json([]);
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
      /*
      const [code] = await db
        .insert(schema.bonusCodes)
        .values({
          ...req.body,
          createdBy: req.user!.id,
        })
        .returning();
      res.json(code);
      */
      // Placeholder implementation
      res.json({ status: "success" });
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
      /*
      const [code] = await db
        .update(schema.bonusCodes)
        .set(req.body)
        .where(eq(schema.bonusCodes.id, parseInt(req.params.id)))
        .returning();
      res.json(code);
      */
      // Placeholder implementation
      res.json({ status: "success" });
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
      /*
      await db
        .delete(schema.bonusCodes)
        .where(eq(schema.bonusCodes.id, parseInt(req.params.id)));
      */
      // Placeholder implementation
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
      /*
      const messages = await db.query.ticketMessages.findMany({
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 50,
      });
      res.json(messages);
      */
      // Placeholder implementation
      res.json([]);
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
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const rawData = await response.json();
      const data = rawData.data || rawData.results || rawData;

      // Calculate totals
      const totals = data.reduce(
        (acc: any, entry: any) => {
          acc.dailyTotal += entry.wagered?.today || 0;
          acc.weeklyTotal += entry.wagered?.this_week || 0;
          acc.monthlyTotal += entry.wagered?.this_month || 0;
          acc.allTimeTotal += entry.wagered?.all_time || 0;
          return acc;
        },
        {
          dailyTotal: 0,
          weeklyTotal: 0,
          monthlyTotal: 0,
          allTimeTotal: 0,
        },
      );

      /*
      const [userCount, raceCount] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(schema.users),
        db
          .select({ count: sql`count(*)` })
          .from(schema.wagerRaces)
          .where(eq(schema.wagerRaces.status, "live")),
      ]);
      */
      // Placeholder implementation
      const userCount = [{ count: 0 }];
      const raceCount = [{ count: 0 }];

      const stats = {
        totalUsers: userCount[0].count,
        activeRaces: raceCount[0].count,
        wagerTotals: totals,
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
    /*
    const [user] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        isAdmin: schema.users.isAdmin,
        createdAt: schema.users.createdAt,
        lastLogin: schema.users.lastLogin,
      })
      .from(schema.users)
      .where(eq(schema.users.id, req.user!.id))
      .limit(1);
    */
    // Placeholder implementation
    const user = {
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      isAdmin: req.user!.isAdmin,
      createdAt: new Date(),
      lastLogin: null,
    };

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
      },
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const leaderboardData = await response.json();
    const data =
      leaderboardData.data || leaderboardData.results || leaderboardData;

    // Find user positions
    const position = {
      weekly:
        data.findIndex((entry: any) => entry.uid === user.id) + 1 || undefined,
      monthly:
        data.findIndex((entry: any) => entry.uid === user.id) + 1 || undefined,
    };

    res.json({
      status: "success",
      data: {
        ...user,
        position,
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
    // Use the cached data function instead of making a direct API call
    const data = await getLeaderboardData();
    
    // Return the complete data object with all time periods
    // This allows the frontend to extract what it needs without additional API calls
    res.json(data);
    
    // Broadcast updates to any connected WebSocket clients
    broadcastLeaderboardUpdate(data);
  } catch (error) {
    log(`Error in affiliate stats handler: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch affiliate statistics",
    });
  }
}

async function handleAdminLogin(req: any, res: any) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    
    // Look up admin in the database
    /*
    const admin = await db.query.users.findFirst({
      where: eq(schema.users.username, username),
      columns: {
        id: true,
        username: true,
        password: true,
        isAdmin: true
      }
    });
    
    if (!admin || !admin.isAdmin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Verify password hash here...
    // For simplicity, we're assuming direct comparison, but in a real app
    // you would use bcrypt.compare or similar
    if (admin.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    */
    
    // Placeholder implementation
    const admin = { 
      id: 1, 
      username, 
      isAdmin: true 
    };
    
    // Generate token and return
    const token = generateToken({ id: admin.id, username: admin.username, isAdmin: admin.isAdmin });
    res.json({ token });
  } catch (error) {
    log(`Error in admin login: ${error}`);
    res.status(500).json({ error: "Server error" });
  }
}

async function handleAdminUsersRequest(_req: any, res: any) {
  try {
    // Fetch users from database
    /*
    const dbUsers = await db.query.users.findMany({
      orderBy: [desc(schema.users.createdAt)]
    });
    */
    // Placeholder implementation
    const dbUsers: any[] = [];
    
    res.json({ users: dbUsers });
  } catch (error) {
    log(`Error fetching admin users: ${error}`);
    res.status(500).json({ error: "Server error" });
  }
}

async function handleWagerRacesRequest(_req: any, res: any) {
  try {
    /*
    const races = await db.query.wagerRaces.findMany({
      orderBy: (races, { desc }) => [desc(races.createdAt)],
    });
    */
    // Placeholder implementation
    const races: any[] = [];
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
    /*
    const race = await db
      .insert(schema.wagerRaces)
      .values({
        ...req.body,
        createdBy: req.user!.id,
      })
      .returning();
    */
    // Placeholder implementation
    const race = [{ id: Date.now(), ...req.body }];

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
  const extendedWs = ws as ExtendedWebSocket;
  extendedWs.isAlive = true;
  let pingInterval: NodeJS.Timeout;

  // Setup ping interval
  pingInterval = setInterval(() => {
    if (extendedWs.readyState === WebSocket.OPEN) {
      extendedWs.ping();
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
          }),
        );
        return;
      }

      const { message: messageText, userId, isStaffReply } = result.data;

      // Save message to database
      /*
      const [savedMessage] = await db
        .insert(schema.ticketMessages)
        .values({
          message: messageText,
          userId: userId || null,
          isStaffReply,
          createdAt: new Date(),
        })
        .returning();
      */
      // Placeholder implementation
      const savedMessage = {
        id: Date.now(),
        message: messageText,
        userId: userId || null,
        createdAt: new Date(),
        isStaffReply,
      };

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
        }),
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
  // In a real application, you would use a proper JWT library
  // This is a placeholder implementation
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
  
  // In a real app, you would sign this with a secret key
  const signature = Buffer.from('signature').toString('base64').replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
