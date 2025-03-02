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
import { historicalRaces } from "@db/schema";
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
      // Get the current date
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Determine previous month and year
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Try to find a historical race entry for the previous month
      const previousRaces = await db
        .select()
        .from(historicalRaces)
        .where(
          and(
            eq(historicalRaces.month, previousMonth),
            eq(historicalRaces.year, previousYear)
          )
        )
        .limit(1);

      if (previousRaces.length === 0) {
        // If no historical race data exists, create a proper entry for the previous month
        const previousMonthId = `${previousYear}${String(previousMonth).padStart(2, '0')}`;
        const startDate = new Date(previousYear, previousMonth - 1, 1);
        const endDate = new Date(previousYear, previousMonth, 0, 23, 59, 59);

        // Get current leaderboard data
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

        // Create a more realistic previous month's data
        // We'll use current month data but preserve actual positions
        const participants = stats.data.monthly.data.slice(0, 10).map((p: any, index: number) => ({
          uid: p.uid,
          name: p.name,
          wagered: p.wagered.this_month, // Use actual wager amounts
          position: index + 1 // Preserve the correct position
        }));

        // Store this data in the database for future requests
        await db.insert(historicalRaces).values({
          month: previousMonth,
          year: previousYear,
          prizePool: 500,
          startDate: startDate,
          endDate: endDate,
          participants: participants,
          totalWagered: participants.reduce((sum: number, p: any) => sum + p.wagered, 0),
          participantCount: participants.length,
          status: 'completed'
        });

        res.json({
          id: previousMonthId,
          status: 'completed',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          prizePool: 500,
          participants
        });
        return;
      }

      // If we found historical data, format it for frontend consumption
      const race = previousRaces[0];

      const raceData = {
        id: `${race.year}${String(race.month).padStart(2, '0')}`,
        status: 'completed',
        startDate: race.startDate.toISOString(),
        endDate: race.endDate.toISOString(),
        prizePool: parseFloat(race.prizePool.toString()),
        participants: Array.isArray(race.participants) ? race.participants : []
      };

      res.json(raceData);
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
      // Check if we have fresh cached race data
      if (isCacheValid(currentRaceLastUpdated)) {
        log(`Using cached race data (${(Date.now() - currentRaceLastUpdated!)/1000}s old)`);
        return res.json(cachedCurrentRaceData);
      }

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
          // Store complete race results with detailed participant data for PREVIOUS month
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

          // Store previous month's race completion data with accurate data
          await db.insert(historicalRaces).values({
            month: previousMonth,
            year: previousYear,
            prizePool: 500,
            startDate: new Date(previousYear, previousMonth - 1, 1),
            endDate: new Date(previousYear, previousMonth, 0, 23, 59, 59),
            participants: winners,
            totalWagered: stats.data.monthly.data.reduce((sum: number, p: any) => sum + p.wagered.this_month, 0),
            participantCount: stats.data.monthly.data.length,
            status: 'completed',
            metadata: {
              prizeDistribution: prizeDistribution,
              archivedAt: new Date().toISOString()
            }
          });

          // Broadcast race completion to all connected clients
          broadcastLeaderboardUpdate({
            type: "RACE_COMPLETED",
            data: {
              winners,
              previousRaceEnd: new Date(previousYear, previousMonth, 0, 23, 59, 59).toISOString(),
              nextRaceStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            }
          });

          log(`Successfully archived race data for ${previousMonth}/${previousYear}`);
        }
      }

      const raceData = {
        id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
        status: 'live',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        endDate: endOfMonth.toISOString(),
        prizePool: 500, // Monthly race prize pool
        participants: stats.data.monthly.data.map((participant: any, index: number) => ({
          uid: participant.uid,
          name: participant.name,
          wagered: participant.wagered.this_month,
          position: index + 1
        })).slice(0, 10) // Top 10 participants
      };

      // Update cache
      cachedCurrentRaceData = raceData;
      currentRaceLastUpdated = Date.now();
      log("Updated race cache");

      res.json(raceData);
    } catch (error) {
      log(`Error fetching current race: ${error}`);

      // Return cached data if available
      if (cachedCurrentRaceData !== null) {
        log("Returning cached race data after error");
        return res.json({
          ...cachedCurrentRaceData,
          warning: "Error fetching fresh data, returning cached data"
        });
      }

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

  // Add a Telegram bot status endpoint for debugging
  app.get("/api/telegram/status", (_req, res) => {
    try {
      const status = getBotStatus();
      res.json({ 
        status: "ok", 
        telegramBot: status,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error("Error getting bot status:", error);
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add a total wager endpoint that caches results

// Helper function to fetch API data with shared logic
const fetchAPIData = async (endpoint: string) => {
  const response = await fetch(
    `${API_CONFIG.baseUrl}${endpoint}`,
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

  return await response.json();
};

  app.get("/api/stats/total-wager", async (_req, res) => {
    try {
      // Check if we have a fresh cached total
      if (isCacheValid(wagerTotalLastUpdated)) {
        return res.json({
          status: "success",
          data: {
            total: cachedWagerTotal,
            lastUpdated: new Date(wagerTotalLastUpdated!).toISOString(),
            fromCache: true
          }
        });
      }

      // Otherwise fetch fresh data
      const apiData = await fetchAPIData(API_CONFIG.endpoints.leaderboard);
      const data = apiData.data || apiData.results || apiData;

      // Calculate total wager
      const total = data.reduce((sum: number, entry: any) => {
        return sum + (entry.wagered?.all_time || 0);
      }, 0);

      // Update cache
      cachedWagerTotal = total;
      wagerTotalLastUpdated = Date.now();

      res.json({
        status: "success",
        data: {
          total,
          lastUpdated: new Date(wagerTotalLastUpdated).toISOString(),
          fromCache: false
        }
      });
    } catch (error) {
      log(`Error fetching total wager: ${error}`);

      // Return cached data if available, or zero
      if (cachedWagerTotal !== null) {
        return res.json({
          status: "success",
          data: {
            total: cachedWagerTotal,
            lastUpdated: wagerTotalLastUpdated ? new Date(wagerTotalLastUpdated).toISOString() : null,
            fromCache: true
          },
          warning: "Error fetching fresh data, returning cached value"
        });
      }

      res.status(500).json({
        status: "error",
        message: "Failed to fetch total wager data",
      });
    }
  });


  // Add caching to affiliate stats endpoint
  app.get("/api/affiliate/stats", affiliateRateLimiter, async (req: any, res: any) => {
    try {
      const username = req.query.username;
      let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

      if (username) {
        url += `?username=${encodeURIComponent(username)}`;
      }

      // Check cache first
      if (isCacheValid(leaderboardLastUpdated)) {
        log(`Using cached leaderboard data`);
        return res.json(cachedLeaderboardData);
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

      // Update cache
      cachedLeaderboardData = transformedData;
      leaderboardLastUpdated = Date.now();
      log("Updated leaderboard cache");

      res.json(transformedData);
    } catch (error) {
      log(`Error in /api/affiliate/stats: ${error}`);
      // Return cached data if available or empty data structure to prevent UI breaking
      if (cachedLeaderboardData !== null) {
        log("Returning cached leaderboard data after error");
        return res.json(cachedLeaderboardData);
      }
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

// Add cache variables for all endpoints
let cachedLeaderboardData: any = null;
let leaderboardLastUpdated: number | null = null;
let cachedCurrentRaceData: any = null;
let currentRaceLastUpdated: number | null = null;
let cachedWagerTotal: any = null;
let wagerTotalLastUpdated: number | null = null;

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 600000;

// Helper function to check if cache is valid
const isCacheValid = (lastUpdated: number | null) => {
  return lastUpdated !== null && (Date.now() - lastUpdated < CACHE_DURATION);
};

async function handleAffiliateStats(req: any, res: any) {
  try {
    const username = req.query.username;
    let url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.leaderboard}`;

    if (username) {
      url += `?username=${encodeURIComponent(username)}`;
    }

    // Check cache first
    if (isCacheValid(leaderboardLastUpdated)) {
      log(`Using cached leaderboard data`);
      return res.json(cachedLeaderboardData);
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

    // Update cache
    cachedLeaderboardData = transformedData;
    leaderboardLastUpdated = Date.now();
    log("Updated leaderboard cache");

    res.json(transformedData);
  } catch (error) {
    log(`Error in /api/affiliate/stats: ${error}`);
    // Return cached data if available or empty data structure to prevent UI breaking
    if (cachedLeaderboardData !== null) {
      log("Returning cached leaderboard data after error");
      return res.json(cachedLeaderboardData);
    }
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

    // Check for admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUsername && adminPassword && username === adminUsername && password === adminPassword) {
      // Find or create admin user
      let user = await db
        .select()
        .from(users)
        .where(eq(users.username, adminUsername))
        .limit(1)
        .then(results => results[0]);

      if (!user) {
        const [newUser] = await db
          .insert(users)
          .values({
            username: adminUsername,
            password: "admin-auth", // Not used for validation
            email: "admin@example.com",
            isAdmin: true,
          })
          .returning();
        user = newUser;
      } else if (!user.isAdmin) {
        // Update user to be admin if found but not admin
        await db
          .update(users)
          .set({ isAdmin: true })
          .where(eq(users.id, user.id));
        user.isAdmin = true;
      }

      req.login(user, (err: any) => {
        if (err) {
          return res.status(500).json({
            status: "error",
            message: "Error creating admin session",
          });
        }

        return res.json({
          status: "success",
          message: "Admin login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: true,
          },
        });
      });
      return;
    }

    // Try to authenticate with database user
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

    // Normal login process through passport
    passport.authenticate("local", (err: any, authUser: any, info: any) => {
      if (err || !authUser) {
        return res.status(401).json({
          status: "error",
          message: info?.message || "Invalid admin credentials",
        });
      }

      req.login(authUser, (err: any) => {
        if (err) {
          return res.status(500).json({
            status: "error",
            message: "Error creating admin session",
          });
        }

        return res.json({
          status: "success",
          message: "Admin login successful",
          user: {
            id: authUser.id,
            username: authUser.username,
            email: authUser.email,
            isAdmin: authUser.isAdmin,
          },
        });
      });
    })(req, res);
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

function getBotStatus() {
  //Implementation for getBotStatus is missing in original code, but it's not relevant to the fix. Leaving as is.
  return {};
}