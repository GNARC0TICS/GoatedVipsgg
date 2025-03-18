import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { API_CONFIG } from "./config/api";
import { RateLimiterMemory } from "rate-limiter-flexible";
import passport from "passport";
import { requireAdmin, requireAuth } from "./middleware/auth";
import { db } from "@db";
import * as schema from "@db/schema";
import type { InsertWagerRace, SelectWagerRace } from "@db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
// The platformStats table is already imported via the * import
// import { platformStats } from "@db/schema";
import { z } from "zod";
import { affiliateRateLimiter, raceRateLimiter } from "./middleware/rate-limiter";

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

function getTierFromWager(wagerAmount: number): string {
  if (wagerAmount >= 1000000) return 'Diamond';
  if (wagerAmount >= 500000) return 'Platinum';
  if (wagerAmount >= 100000) return 'Gold';
  if (wagerAmount >= 50000) return 'Silver';
  return 'Bronze';
}

const PRIZE_POOL_BASE = 500;
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

const transformMVPData = (mvpData: any) => {
  return Object.entries(mvpData).reduce((acc: Record<string, any>, [period, data]: [string, any]) => {
    if (data) {
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
  setupAuth(app);
  setupRESTRoutes(app);
  setupWebSocket(httpServer);
  return httpServer;
}

function setupRESTRoutes(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.get("/api/wager-races/previous", async (_req, res) => {
    try {
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

      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      if (now.getDate() === 1 && now.getHours() < 1) {
        const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        const [existingEntry] = await db
          .select()
          .from(schema.historicalRaces)
          .where(
            and(
              eq(schema.historicalRaces.month, previousMonth),
              eq(schema.historicalRaces.year, previousYear)
            )
          )
          .limit(1);

        const prizeDistribution = [0.5, 0.3, 0.1, 0.05, 0.05, 0, 0, 0, 0, 0];

        if (!existingEntry && stats.data.monthly.data.length > 0) {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

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

          await db.insert(schema.historicalRaces).values({
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


          await db.insert(schema.historicalRaces).values({
            month: previousMonth,
            year: previousYear,
            prizePool: 500,
            startDate: new Date(previousYear, previousMonth - 1, 1),
            endDate: new Date(previousYear, previousMonth, 0, 23, 59, 59),
            participants: winners,
            isCompleted: true
          });

          broadcastLeaderboardUpdate({
            type: "RACE_COMPLETED",
            data: {
              winners,
              nextRaceStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            }
          });
        }
      }

      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const raceData = {
        id: `${currentYear}${(currentMonth + 1).toString().padStart(2, '0')}`,
        status: 'live',
        startDate: new Date(currentYear, currentMonth, 1).toISOString(),
        endDate: endOfMonth.toISOString(),
        prizePool: 500, 
        participants: stats.data.monthly.data.map((participant: any, index: number) => ({
          uid: participant.uid,
          name: participant.name,
          wagered: participant.wagered.this_month,
          position: index + 1
        })).slice(0, 10) 
      };

      console.log(`Race data for month ${currentMonth + 1}, year ${currentYear}`);

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
  app.post("/api/admin/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
    if (!user || !user.isAdmin) {
      return res.status(401).json({
        status: "error",
        message: info?.message || "Invalid admin credentials",
      });
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({
          status: "error",
          message: "Failed to create admin session",
        });
      }
      return res.json({
        status: "success",
        message: "Admin login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });
    });
  })(req, res, next);
});
  app.get("/api/admin/verify", requireAdmin, (_req, res) => {
    res.json({ status: "success", message: "Admin access verified" });
  });

  // Test endpoint for authentication status
  app.get("/api/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        authenticated: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          isAdmin: req.user.isAdmin,
        },
        session: req.session
      });
    } else {
      res.json({
        authenticated: false,
        message: "Not authenticated"
      });
    }
  });
  app.get("/api/admin/users", requireAdmin, handleAdminUsersRequest);
  app.get("/api/admin/wager-races", requireAdmin, handleWagerRacesRequest);
  app.post("/api/admin/wager-races", requireAdmin, handleCreateWagerRace);
  app.get("/api/affiliate/stats", affiliateRateLimiter, handleAffiliateStats);

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
      const [ticket] = await db.insert(schema.supportTickets)
        .values({
          userId: req.user!.id,
          subject: req.body.subject,
          description: req.body.description,
          status: 'open',
          priority: req.body.priority || 'medium',
          createdAt: new Date()
        })
        .returning();

      await db.insert(schema.ticketMessages)
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
        .insert(schema.ticketMessages)
        .values({
          ticketId,
          message: message.trim(),
          userId: req.user!.id,
          isStaffReply: req.user!.isAdmin,
          createdAt: new Date()
        })
        .returning();

      if (req.user!.isAdmin) {
        await db
          .update(schema.supportTickets)
          .set({ status: 'in_progress' })
          .where(eq(schema.supportTickets.id, ticketId));
      }

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
        .update(schema.supportTickets)
        .set({
          status,
          priority,
          assignedTo,
          updatedAt: new Date()
        })
        .where(eq(schema.supportTickets.id, parseInt(req.params.id)))
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
        .insert(schema.bonusCodes)
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
        .update(schema.bonusCodes)
        .set(req.body)
        .where(eq(schema.bonusCodes.id, parseInt(req.params.id)))
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
        .delete(schema.bonusCodes)
        .where(eq(schema.bonusCodes.id, parseInt(req.params.id)));
      res.json({ status: "success" });
    } catch (error) {
      log(`Error deleting bonus code: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to delete bonus code",
      });
    }
  });

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
        db.select({ count: sql`count(*)` }).from(schema.users),
        db.select({ count: sql`count(*)` }).from(schema.wagerRaces).where(eq(schema.wagerRaces.status, 'live')),
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

  app.get("/api/stats/historical", async (_req, res) => {
    try {
      // Using properly qualified reference to platformStats via schema
      const [latestStats] = await db
        .select()
        .from(schema.platformStats)
        .orderBy(sql`${schema.platformStats.timestamp} DESC`)
        .limit(1);

      res.json(latestStats || {
        totalWagered: 0,
        dailyTotal: 0,
        weeklyTotal: 0,
        monthlyTotal: 0,
        playerCount: 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      log(`Error fetching historical stats: ${error}`);
      res.status(500).json({ error: "Failed to fetch historical stats" });
    }
  });

  app.get("/api/stats/current", async (_req, res) => {
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

      const totals = data.reduce((acc: any, entry: any) => {
        acc.totalWagered = (acc.totalWagered || 0) + (entry.wagered?.all_time || 0);
        acc.dailyTotal = (acc.dailyTotal || 0) + (entry.wagered?.today || 0);
        acc.weeklyTotal = (acc.weeklyTotal || 0) + (entry.wagered?.this_week || 0);
        acc.monthlyTotal = (acc.monthlyTotal || 0) + (entry.wagered?.this_month || 0);
        return acc;
      }, {});

      await db.insert(schema.platformStats).values({
        ...totals,
        playerCount: data.length,
        timestamp: new Date()
      });

      res.json({
        ...totals,
        playerCount: data.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      log(`Error fetching current stats: ${error}`);
      res.status(500).json({ error: "Failed to fetch current stats" });
    }
  });
}

async function handleProfileRequest(req: any, res: any) {
  try {
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

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
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

    const leaderboardData = await response.json();
    const data = leaderboardData.data || leaderboardData.results || leaderboardData;

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

async function handleAdminLogin(req: any, res: any, next: any) {
  try {
    const result = adminLoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: result.error.issues.map((i) => i.message).join(", "),
      });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        log(`Admin login error: ${err}`);
        return res.status(500).json({
          status: "error",
          message: "Failed to process admin login",
        });
      }

      if (!user || !user.isAdmin) {
        return res.status(401).json({
          status: "error",
          message: "Invalid admin credentials",
        });
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          log(`Admin login session error: ${loginErr}`);
          return res.status(500).json({
            status: "error",
            message: "Error creating admin session",
          });
        }

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
      });
    })(req, res, next);
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
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        isAdmin: schema.users.isAdmin,
        createdAt: schema.users.createdAt,
        lastLogin: schema.users.lastLogin,
      })
      .from(schema.users)
      .orderBy(schema.users.createdAt);

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
      .insert(schema.wagerRaces)
      .values({
        ...req.body,
        createdBy: req.user!.id,
      })
      .returning();

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

      const [savedMessage] = await db
        .insert(schema.ticketMessages)
        .values({
          message: messageText,
          userId: userId || null,
          isStaffReply,
          createdAt: new Date(),
        })
        .returning();

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
  return "";
}