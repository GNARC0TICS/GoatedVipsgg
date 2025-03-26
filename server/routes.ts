import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { requireAdmin, requireAuth } from "./middleware/auth";
import userSessionsRouter from "./routes/user-sessions";
import userProfileRouter from "./routes/user-profile";
import telegramApiRouter from "./routes/telegram-api";
import apiTokensRouter from "./routes/api-tokens";
import wagerRaceRouter from "./routes/wager-race";
import { db } from "../db/connection";
import { users, wagerRaces, userSessions, userActivityLog } from "@db/schema/index";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { z } from "zod";
import {
  affiliateRateLimiter,
  raceRateLimiter,
} from "./middleware/rate-limiter"; // Import rate limiters with correct path
import { registerBasicVerificationRoutes } from "./basic-verification-routes";
import { 
  getLeaderboardData, 
  invalidateLeaderboardCache, 
  transformMVPData, 
  LeaderboardData 
} from "./utils/leaderboard-cache";
import { generateToken } from "./utils/token";
import NodeCache from "node-cache";

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

// Initialize cache with 5 minutes TTL
const profileCache = new NodeCache({ stdTTL: 300 });

// Profile update validation schema
const profileUpdateSchema = z.object({
  username: z.string().min(3).max(50),
  telegramUsername: z.string().optional(),
  bio: z.string().max(500).optional(),
  profileColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

// Validation middleware
const validateProfileUpdate = (req: any, res: any, next: any) => {
  try {
    profileUpdateSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: "error",
        message: "Invalid profile data",
        errors: error.errors,
      });
    } else {
      next(error);
    }
  }
};

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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupAuth(app);
  setupRESTRoutes(app);
  setupWebSocket(httpServer);
  // Register verification routes
  registerBasicVerificationRoutes(app);
  // Register user sessions routes
  app.use(userSessionsRouter);
  // Register user profile routes
  app.use(userProfileRouter);
  // Register Telegram API routes
  app.use("/api/telegram", telegramApiRouter);
  // Register API tokens routes
  app.use("/api/admin/api-tokens", apiTokensRouter);
  // Register wager race routes
  app.use(wagerRaceRouter);
  return httpServer;
}

function setupRESTRoutes(app: Express) {
  // Add endpoint to manually trigger a full refresh of leaderboard data
  app.get("/api/leaderboard/refresh", async (_req, res) => {
    try {
      log("Manual leaderboard refresh triggered");
      
      // Force a refresh by invalidating the cache
      invalidateLeaderboardCache();
      
      // Fetch fresh data - this will also trigger the sync to database for all periods
      const freshData = await getLeaderboardData(true);
      
      // Return success response with counts
      return res.json({
        status: "success",
        message: "Leaderboard data refreshed successfully",
        counts: {
          today: freshData.data.today.data.length,
          weekly: freshData.data.weekly.data.length,
          monthly: freshData.data.monthly.data.length,
          all_time: freshData.data.all_time.data.length
        }
      });
    } catch (error) {
      log(`Error refreshing leaderboard data: ${error}`);
      return res.status(500).json({
        status: "error",
        message: "Failed to refresh leaderboard data"
      });
    }
  });

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

      // Use dates to ensure correct month/year
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const actualYear = currentYear;
      const actualMonth = currentMonth;

      const raceData = {
        id: `${actualYear}${(actualMonth + 1).toString().padStart(2, "0")}`,
        status: "live", 
        startDate: new Date(actualYear, actualMonth, 1).toISOString(),
        endDate: new Date(actualYear, actualMonth + 1, 0, 23, 59, 59).toISOString(),
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

  // Modified profile endpoint with caching
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check cache first
      const cachedProfile = profileCache.get(`profile_${userId}`);
      if (cachedProfile) {
        return res.json(cachedProfile);
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then(rows => rows[0]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Cache the profile
      profileCache.set(`profile_${userId}`, user);

      res.json(user);
    } catch (error) {
      log(`Error fetching profile: ${error}`);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Modified profile update endpoint with validation
  app.post("/api/user/update", requireAuth, validateProfileUpdate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { username, telegramUsername, bio, profileColor } = req.body;

      const updatedUser = await db
        .update(users)
        .set({
          username,
          telegramUsername: telegramUsername || null,
          bio: bio || null,
          profileColor: profileColor || null,
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser[0]) {
        return res.status(404).json({ error: "User not found" });
      }

      // Invalidate cache
      profileCache.del(`profile_${userId}`);

      res.json(updatedUser[0]);
    } catch (error) {
      log(`Error updating profile: ${error}`);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Add user profile endpoint by ID for user profile page
  app.get("/api/users/:id", requireAuth, handleUserProfileRequest);
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
      // Use the cached leaderboard data instead of making a direct API call
      const leaderboardData = await getLeaderboardData();
      const data = leaderboardData.data.all_time.data;

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
async function handleUserProfileRequest(req: any, res: any) {
  try {
    // Get the requested user ID from URL parameters
    const userId = req.params.id;
    
    // Fetch user data from the database 
    // Uncomment in production - for now we'll use a placeholder
    /*
    const [user] = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        isAdmin: schema.users.isAdmin,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    */
    
    // Get leaderboard data
    const leaderboardData = await getLeaderboardData();
    
    // Find user in the leaderboard data
    const userData = leaderboardData.data.all_time.data.find((entry: any) => entry.uid == userId);
    
    if (!userData) {
      // If user not found in leaderboard, create a basic profile
      // In a real implementation, we would check the database first
      const basicUser = {
        username: req.user?.username || "User",
        totalWagered: 0,
        currentRank: 0,
        bestRank: 0,
        races: {
          participated: 0,
          won: 0,
          totalPrizes: 0,
        },
        achievements: [],
        history: [],
      };
      
      return res.json(basicUser);
    }
    
    // Format user statistics in the expected structure
    const userStats = {
      username: userData.name,
      totalWagered: userData.wagered.all_time,
      currentRank: leaderboardData.data.monthly.data.findIndex((entry: any) => entry.uid == userId) + 1 || 0,
      bestRank: leaderboardData.data.monthly.data.findIndex((entry: any) => entry.uid == userId) + 1 || 0,
      races: {
        participated: 1,
        won: leaderboardData.data.monthly.data[0]?.uid == userId ? 1 : 0,
        totalPrizes: 0,
      },
      achievements: [
        {
          name: "Platform Member",
          description: "Joined the platform",
          earned: new Date().toISOString(),
        },
      ],
      history: [
        {
          period: "Current Month",
          wagered: userData.wagered.this_month || 0,
          rank: leaderboardData.data.monthly.data.findIndex((entry: any) => entry.uid == userId) + 1 || 0,
          prize: 0,
        },
      ],
    };
    
    res.json(userStats);
  } catch (error) {
    log(`Error fetching user profile: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user profile",
    });
  }
}

import { syncLeaderboardData } from "./utils/data-sync";

async function handleAffiliateStats(req: any, res: any) {
  try {
    // Use the cached data function instead of making a direct API call
    const data = await getLeaderboardData();

    // Send the data back to the client immediately
    res.json(data);

    // Store the leaderboard data in the database for persistence
    try {
      await syncLeaderboardData(data);
    } catch (dbError) {
      // Log database errors but don't fail the request
      log(`Error storing leaderboard data: ${dbError}`);
    }
  } catch (error) {
    log(`Error fetching leaderboard data: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch leaderboard data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function handleAdminLogin(req: any, res: any) {
  try {
    const { username, email, password, identifier } = req.body;
    const userIdentifier = identifier || username || email;
    
    if (!userIdentifier || !password) {
      return res.status(400).json({ 
        status: "error",
        message: "Username/email and password required" 
      });
    }

    const isEmail = userIdentifier.includes('@');
    
    const [admin] = await db
      .select()
      .from(users)
      .where(
        isEmail 
          ? eq(users.email, userIdentifier) 
          : eq(users.username, userIdentifier)
      )
      .limit(1);

    if (!admin) {
      log(`Admin login failed: User not found for identifier ${userIdentifier}`);
      return res.status(401).json({ 
        status: "error",
        message: "Invalid credentials" 
      });
    }

    if (!admin.isAdmin) {
      log(`Admin login failed: User ${userIdentifier} is not an admin`);
      return res.status(403).json({ 
        status: "error",
        message: "Admin privileges required" 
      });
    }

    try {
      const scryptAsync = (await import('crypto')).scrypt;
      const timingSafeEqual = (await import('crypto')).timingSafeEqual;
      const promisify = (await import('util')).promisify;
      
      const scryptPromise = promisify(scryptAsync);
      
      const [hashedPassword, salt] = admin.password.split(".");
      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = await scryptPromise(password, salt, 64) as Buffer;
      
      const isMatch = timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
      
      if (!isMatch) {
        log(`Admin login failed: Invalid password for user ${userIdentifier}`);
        return res.status(401).json({ 
          status: "error",
          message: "Invalid credentials" 
        });
      }
    } catch (cryptoError) {
      log(`Error verifying password: ${cryptoError}`);
      
      if (admin.password !== password) {
        return res.status(401).json({ 
          status: "error",
          message: "Invalid credentials" 
        });
      }
    }

    const token = generateToken({ 
      id: admin.id, 
      username: admin.username,
      isAdmin: true 
    });
    
    res.json({ 
      status: "success",
      token,
      user: {
        id: admin.id,
        username: admin.username,
        isAdmin: true
      }
    });
    
    log(`Admin login successful for user: ${userIdentifier}`);
  } catch (error) {
    log(`Error in admin login: ${error}`);
    res.status(500).json({ 
      status: "error",
      message: "Server error" 
    });
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

const adminLoginSchema = z.object({
  // Accept either username, email, or a generic identifier field
  username: z.string().min(1, "Username is required").optional(),
  email: z.string().email("Please enter a valid email").optional(),
  identifier: z.string().min(1, "Email or username is required").optional(),
  password: z.string().min(1, "Password is required"),
}).refine(data => !!(data.username || data.email || data.identifier), {
  message: "Either username, email, or identifier is required",
  path: ["identifier"] 
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
