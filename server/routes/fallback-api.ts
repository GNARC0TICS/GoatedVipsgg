import express from "express";
import { log } from "../vite";
import { getFallbackLeaderboardData, getEmptyLeaderboardData } from "../utils/fallback-data";
import { getLeaderboardData } from "../utils/leaderboard-cache";

const router = express.Router();

// Helper function to check if we should serve fallback data
const shouldServeFallbackData = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    log("Not serving explicit fallback data in production mode");
    return false;
  }
  return true;
};

/**
 * Fallback API routes to serve cached data when the main API is unavailable
 * These routes mirror the structure of the main API but serve cached data
 */

// Fallback route for leaderboard data
router.get("/affiliate/stats/fallback", async (req, res) => {
  log("Request for fallback leaderboard data");
  
  if (!shouldServeFallbackData()) {
    return res.status(403).json({
      status: "error",
      message: "Fallback data is disabled in production mode"
    });
  }
  
  log("Serving fallback leaderboard data (using cache if available)");
  
  // Try to get cached data
  try {
    // First try to get data from cache without forcing refresh
    const cachedData = await getLeaderboardData(false);
    
    // Use the cached data as fallback
    const fallbackData = getFallbackLeaderboardData(cachedData);
    
    // Add a small random delay to simulate API call (100-300ms)
    setTimeout(() => {
      res.json(fallbackData);
    }, Math.floor(Math.random() * 200) + 100);
  } catch (error) {
    log(`Error getting fallback data: ${error}`);
    // If anything fails, return empty data structure
    res.json(getEmptyLeaderboardData());
  }
});

// Main route for leaderboard data with query parameters
router.get("/affiliate/stats", async (req, res) => {
  log(`Request for leaderboard data with query params: ${JSON.stringify(req.query)}`);
  
  if (!shouldServeFallbackData()) {
    return res.status(403).json({
      status: "error",
      message: "Fallback data is disabled in production mode"
    });
  }
  
  log(`Serving fallback leaderboard data with query params (using cache if available)`);
  
  // Try to get cached data
  try {
    // First try to get data from cache without forcing refresh
    const cachedData = await getLeaderboardData(false);
    
    // Use the cached data as fallback
    const fallbackData = getFallbackLeaderboardData(cachedData);
    
    // Add a small random delay to simulate API call (100-300ms)
    setTimeout(() => {
      res.json(fallbackData);
    }, Math.floor(Math.random() * 200) + 100);
  } catch (error) {
    log(`Error getting fallback data: ${error}`);
    // If anything fails, return empty data structure
    res.json(getEmptyLeaderboardData());
  }
});

// Fallback route for wager race position
router.get("/wager-race/position/fallback", (req, res) => {
  const { userId, goatedUsername } = req.query;
  log(`Request for fallback wager race position data - userId: ${userId}, goatedUsername: ${goatedUsername}`);
  
  if (!shouldServeFallbackData()) {
    return res.status(403).json({
      status: "error",
      message: "Fallback data is disabled in production mode"
    });
  }
  
  log(`Serving fallback wager race position data (development mode)`);
  
  // Generate a random position between 1 and 20
  const position = Math.floor(Math.random() * 20) + 1;
  
  // Generate a previous position that's slightly different
  const previousPosition = Math.max(1, position + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
  
  // Calculate end date (end of current month)
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Create fallback race position data
  const fallbackData = {
    position,
    totalParticipants: 100,
    wagerAmount: Math.floor(Math.random() * 50000),
    previousPosition,
    raceType: "monthly",
    raceTitle: "Monthly Wager Race",
    endDate: endDate.toISOString(),
    userId,
    username: goatedUsername || `User${userId}`
  };
  
  // Add a small random delay to simulate API call (100-300ms)
  setTimeout(() => {
    res.json(fallbackData);
  }, Math.floor(Math.random() * 200) + 100);
});

// Other wager race routes can be updated similarly with the new approach

export default router;
