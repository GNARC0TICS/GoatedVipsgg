import { Router } from "express";
import { validateApiKey } from "../middleware/api-auth";
import { getLeaderboardData } from "../utils/leaderboard-cache";

/**
 * Telegram API Router
 * 
 * This router provides API endpoints for the standalone Telegram bot.
 * These are placeholder implementations that will be replaced with
 * actual implementations when the Telegram bot is created.
 * 
 * See telegrambotcreationguide.md for details on how to implement
 * the actual Telegram bot.
 */

const router = Router();

// Apply API key validation to all routes
router.use(validateApiKey);

// User verification endpoints
router.post("/verify", (req, res) => {
  res.status(501).json({
    success: false,
    error: "Not implemented yet"
  });
});

router.get("/user/:telegramId", (req, res) => {
  res.status(501).json({
    success: false,
    error: "Not implemented yet"
  });
});

// Stats and leaderboard endpoints
router.get("/stats/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    // Get stats from leaderboard cache
    const leaderboardData = await getLeaderboardData();
    
    // Find user in the leaderboard data
    const userData = leaderboardData.data.all_time.data.find(
      (entry: any) => entry.name.toLowerCase() === username.toLowerCase()
    );
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: "Not found: User not found in leaderboard data"
      });
    }
    
    // Format user statistics in the expected structure
    const userStats = {
      username: userData.name,
      stats: {
        daily: userData.wagered?.today || 0,
        weekly: userData.wagered?.this_week || 0,
        monthly: userData.wagered?.this_month || 0,
        allTime: userData.wagered?.all_time || 0
      },
      rank: {
        daily: leaderboardData.data.today.data.findIndex(
          (entry: any) => entry.uid === userData.uid
        ) + 1 || 0,
        weekly: leaderboardData.data.weekly.data.findIndex(
          (entry: any) => entry.uid === userData.uid
        ) + 1 || 0,
        monthly: leaderboardData.data.monthly.data.findIndex(
          (entry: any) => entry.uid === userData.uid
        ) + 1 || 0
      }
    };
    
    return res.json({
      success: true,
      data: userStats
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const type = (req.query.type as string) || "monthly";
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get leaderboard data from cache
    const leaderboardData = await getLeaderboardData();
    
    // Get the appropriate leaderboard data based on type
    let data: any[] = [];
    
    switch (type) {
      case "daily":
        data = leaderboardData.data.today.data;
        break;
      case "weekly":
        data = leaderboardData.data.weekly.data;
        break;
      case "monthly":
        data = leaderboardData.data.monthly.data;
        break;
      case "all-time":
        data = leaderboardData.data.all_time.data;
        break;
      default:
        data = leaderboardData.data.monthly.data;
    }
    
    // Format the leaderboard data
    const formattedData = data.slice(0, limit).map((entry: any, index: number) => ({
      rank: index + 1,
      username: entry.name,
      amount: entry.wagered[type === "daily" ? "today" : 
               type === "weekly" ? "this_week" : 
               type === "monthly" ? "this_month" : "all_time"] || 0
    }));
    
    return res.json({
      success: true,
      data: {
        type,
        timestamp: new Date().toISOString(),
        entries: formattedData
      }
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

router.get("/race/position/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    // Get leaderboard data from cache
    const leaderboardData = await getLeaderboardData();
    
    // Find user in the monthly leaderboard data
    const userData = leaderboardData.data.monthly.data.find(
      (entry: any) => entry.name.toLowerCase() === username.toLowerCase()
    );
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: "Not found: User not found in leaderboard data"
      });
    }
    
    // Get user's position in the leaderboard
    const position = leaderboardData.data.monthly.data.findIndex(
      (entry: any) => entry.name.toLowerCase() === username.toLowerCase()
    ) + 1;
    
    // Get next position user (if not first)
    let nextPosition = null;
    
    if (position > 1) {
      const nextUser = leaderboardData.data.monthly.data[position - 2];
      nextPosition = {
        position: position - 1,
        username: nextUser.name,
        amount: nextUser.wagered.this_month,
        difference: nextUser.wagered.this_month - userData.wagered.this_month
      };
    }
    
    // Get current month's info
    const now = new Date();
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );
    
    return res.json({
      success: true,
      data: {
        username: userData.name,
        position,
        amount: userData.wagered.this_month,
        nextPosition,
        raceInfo: {
          name: `${now.toLocaleString('default', { month: 'long' })} Monthly Race`,
          endTime: endOfMonth.toISOString(),
          totalPrize: 500 // Default prize pool
        }
      }
    });
  } catch (error) {
    console.error("Error fetching race position:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Admin endpoints
router.get("/verification-requests", (req, res) => {
  res.status(501).json({
    success: false,
    error: "Not implemented yet"
  });
});

router.post("/verification-requests/:requestId/approve", (req, res) => {
  res.status(501).json({
    success: false,
    error: "Not implemented yet"
  });
});

router.post("/verification-requests/:requestId/reject", (req, res) => {
  res.status(501).json({
    success: false,
    error: "Not implemented yet"
  });
});

router.post("/broadcast", (req, res) => {
  res.status(501).json({
    success: false,
    error: "Not implemented yet"
  });
});

export default router;
