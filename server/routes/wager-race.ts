import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getLeaderboardData } from "../utils/leaderboard-cache";
import { log } from "../vite";
import { db } from "../../db/connection";
import { affiliateStats, wagerRaces } from "../../db/schema/affiliate";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { raceRateLimiter } from "../middleware/rate-limiter";

const router = Router();

// Get user's current position in wager race
router.get("/api/wager-race/position", requireAuth, async (req, res) => {
  try {
    const { userId, username } = req.query;

    if (!userId && !username) {
      return res.status(400).json({
        status: "error",
        message: "Either userId or username is required",
      });
    }

    // Get leaderboard data from cache/API
    const leaderboardData = await getLeaderboardData();

    // Find user in monthly data
    const monthlyData = leaderboardData.data.monthly.data;
    const userIndex = monthlyData.findIndex(
      (entry) => entry.uid === userId || entry.name === username
    );

    if (userIndex === -1) {
      return res.status(404).json({
        status: "error",
        message: "User not found in current race",
      });
    }

    const userData = monthlyData[userIndex];

    // Find user in previous data to calculate position change
    const previousData = leaderboardData.data.monthly.data;
    const previousIndex = previousData.findIndex(
      (entry) => entry.uid === userId || entry.name === username
    );

    // Get current date info for race end date
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Return race position data
    res.json({
      position: userIndex + 1,
      totalParticipants: monthlyData.length,
      wagerAmount: userData.wagered.this_month,
      previousPosition: previousIndex !== -1 ? previousIndex + 1 : undefined,
      raceType: "monthly",
      raceTitle: `Monthly Wager Race - ${new Date().toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
      endDate: endOfMonth.toISOString(),
    });
  } catch (error) {
    log(`Error fetching wager race position: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch wager race position",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get current active wager race
router.get("/api/wager-races/current", raceRateLimiter, async (_req, res) => {
  try {
    // Get current date for comparison
    const now = new Date();

    // Try to find an active race in the database
    const activeRaces = await db
      .select()
      .from(wagerRaces)
      .where(
        and(
          lte(wagerRaces.startDate, now),
          gte(wagerRaces.endDate, now),
          eq(wagerRaces.status, 'live')
        )
      )
      .orderBy(desc(wagerRaces.createdAt))
      .limit(1);

    // If we found an active race, return it
    if (activeRaces.length > 0) {
      const race = activeRaces[0];
      
      try {
        // Get participants directly from the database for monthly period
        // This ensures we're using the data that was stored from the Goated.com API
        const participants = await db
          .select({
            uid: affiliateStats.uid,
            name: affiliateStats.name,
            wagered: affiliateStats.wagered
          })
          .from(affiliateStats)
          .where(eq(affiliateStats.period, 'monthly'))
          .orderBy(desc(affiliateStats.wagered))
          .limit(100);
        
        if (participants.length > 0) {
          // Return the race with participants from our database
          return res.json({
            id: race.id.toString(),
            title: "Monthly Wager Race",
            description: "",
            startDate: race.startDate,
            endDate: race.endDate,
            prizePool: race.prizePool,
            participants: participants.map((entry, index) => ({
              position: index + 1,
              uid: entry.uid,
              name: entry.name,
              wager: parseFloat(entry.wagered) || 0
            }))
          });
        } else {
          // Fallback to getting leaderboard data from API if no participants in database
          log("No participants found in database, falling back to API");
          const leaderboardData = await getLeaderboardData();
          
          if (leaderboardData?.data?.monthly?.data?.length > 0) {
            return res.json({
              id: race.id.toString(),
              title: "Monthly Wager Race",
              description: "",
              startDate: race.startDate,
              endDate: race.endDate,
              prizePool: race.prizePool,
              participants: leaderboardData.data.monthly.data.slice(0, 100).map((entry, index) => ({
                position: index + 1,
                uid: entry.uid,
                name: entry.name,
                wager: entry.wagered.this_month
              }))
            });
          }
        }
      } catch (dataError) {
        log(`Error fetching race participant data: ${dataError}`);
        
        // If we can't get participant data, still return the race without participants
        return res.json({
          id: race.id.toString(),
          title: "Monthly Wager Race",
          description: "",
          startDate: race.startDate,
          endDate: race.endDate,
          prizePool: race.prizePool,
          participants: []
        });
      }
    }

    // No active race found
    return res.status(404).json({
      status: "error",
      message: "No active race found - no monthly data available"
    });
  } catch (error) {
    log(`Error fetching current wager race: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch current wager race",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
