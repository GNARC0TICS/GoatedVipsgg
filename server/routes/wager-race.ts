import { Router, Request } from "express";
import { requireAuth } from "../middleware/auth";
import { getLeaderboardData } from "../utils/leaderboard-cache";
import { log } from "../vite";
import { db } from "../../db/connection";
import { affiliateStats, users, wagerRaces } from "../../db/schema/tables";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { raceRateLimiter } from "../middleware/rate-limiter";
import { 
  RacePosition, 
  ActiveWagerRace, 
  WagerRaceEntry,
  APIResponse 
} from "../../client/src/types/api";

const router = Router();

interface WagerRaceQuery extends Record<string, string | undefined> {
  userId?: string;
  username?: string;
}

interface WagerRaceParams {}
interface WagerRaceBody {}

type WagerRaceRequest = Request<
  WagerRaceParams,
  APIResponse<RacePosition>,
  WagerRaceBody,
  WagerRaceQuery
>;

// Get user's current position in wager race
router.get("/api/wager-race/position", requireAuth, async (req: WagerRaceRequest, res) => {
  try {
    const { userId, username } = req.query;

    if (!userId && !username) {
      return res.status(400).json({
        status: "error",
        message: "Either userId or username is required",
        code: "MISSING_IDENTIFIER"
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
        code: "USER_NOT_FOUND"
      });
    }

    const userData = monthlyData[userIndex];
    if (!userData) {
      return res.status(404).json({
        status: "error",
        message: "User data not found",
        code: "USER_DATA_NOT_FOUND"
      });
    }

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
      status: "success",
      data: {
        position: userIndex + 1,
        totalParticipants: monthlyData.length,
        wagerAmount: userData.wagered.this_month,
        previousPosition: previousIndex !== -1 ? previousIndex + 1 : null,
        raceType: "monthly",
        raceTitle: `Monthly Wager Race - ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
        endDate: endOfMonth.toISOString(),
      }
    });
  } catch (error) {
    log(`Error fetching wager race position: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch wager race position",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
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
      if (!race) {
        throw new Error("Race data is undefined");
      }
      
      try {
        // Get participants directly from the database for monthly period
        const participants = await db
          .select({
            userId: users.id,
            username: users.username,
            totalWager: affiliateStats.totalWager
          })
          .from(affiliateStats)
          .innerJoin(users, eq(affiliateStats.userId, users.id))
          .where(sql`EXTRACT(MONTH FROM ${affiliateStats.timestamp}) = EXTRACT(MONTH FROM CURRENT_DATE)`)
          .orderBy(desc(affiliateStats.totalWager))
          .limit(100);
        
        if (participants.length > 0) {
          // Return the race with participants from our database
          const raceData: ActiveWagerRace = {
            id: race.id.toString(),
            title: "Monthly Wager Race",
            description: "",
            startDate: race.startDate.toISOString(),
            endDate: race.endDate.toISOString(),
            prizePool: Number(race.prizePool),
            participants: participants.map((entry, index) => ({
              position: index + 1,
              uid: entry.userId.toString(),
              name: entry.username || 'Unknown',
              wager: Number(entry.totalWager) || 0
            }))
          };

          return res.json({
            status: "success",
            data: raceData
          });
        } else {
          // Fallback to getting leaderboard data from API if no participants in database
          log("No participants found in database, falling back to API");
          const leaderboardData = await getLeaderboardData();
          
          if (leaderboardData?.data?.monthly?.data?.length > 0) {
            const raceData: ActiveWagerRace = {
              id: race.id.toString(),
              title: "Monthly Wager Race",
              description: "",
              startDate: race.startDate.toISOString(),
              endDate: race.endDate.toISOString(),
              prizePool: Number(race.prizePool),
              participants: leaderboardData.data.monthly.data.slice(0, 100).map((entry, index) => ({
                position: index + 1,
                uid: entry.uid,
                name: entry.name,
                wager: entry.wagered.this_month
              }))
            };

            return res.json({
              status: "success",
              data: raceData
            });
          }
        }
      } catch (dataError) {
        log(`Error fetching race participant data: ${dataError}`);
        
        // If we can't get participant data, still return the race without participants
        const raceData: ActiveWagerRace = {
          id: race.id.toString(),
          title: "Monthly Wager Race",
          description: "",
          startDate: race.startDate.toISOString(),
          endDate: race.endDate.toISOString(),
          prizePool: Number(race.prizePool),
          participants: []
        };

        return res.json({
          status: "success",
          data: raceData
        });
      }
    }

    // No active race found
    return res.status(404).json({
      status: "error",
      message: "No active race found - no monthly data available",
      code: "NO_ACTIVE_RACE"
    });
  } catch (error) {
    log(`Error fetching current wager race: ${error}`);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch current wager race",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
