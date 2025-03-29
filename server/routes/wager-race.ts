import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getLeaderboardData } from "../utils/leaderboard-cache";
import { log } from "../vite";

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

export default router;
