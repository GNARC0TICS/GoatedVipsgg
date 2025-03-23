import express from "express";
import { log } from "../vite";
import { getLeaderboardData, invalidateLeaderboardCache } from "../utils/leaderboard-cache";
import { testRedisConnection } from "../utils/redis-client";

const router = express.Router();

// Create auth for cron jobs to prevent unauthorized access
const validateCronRequest = (req: express.Request) => {
  // In production, Vercel adds an Authorization header with a secret
  // Check if this is a Vercel cron job request
  const isVercelCron = process.env.VERCEL === '1' && 
                       req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;

  // Also allow local development testing
  const isDev = process.env.NODE_ENV !== 'production';

  return isVercelCron || isDev;
};

// Endpoint to manually refresh leaderboard data
router.get("/refresh-leaderboard", async (req, res) => {
  // Validate that this is an authorized cron request
  if (!validateCronRequest(req)) {
    log("Unauthorized cron job access attempt");
    return res.status(401).json({
      status: "error",
      message: "Unauthorized"
    });
  }

  log("Cron job: Refreshing leaderboard data");
  
  try {
    // Check Redis connection if configured
    const redisConnected = await testRedisConnection();
    if (redisConnected) {
      log("Redis connection successful, using Redis for cache");
    } else {
      log("Redis not connected, falling back to in-memory cache");
    }

    // Invalidate the cache to ensure fresh data
    await invalidateLeaderboardCache();
    
    // Force a refresh of the leaderboard data
    const data = await getLeaderboardData(true);
    
    return res.json({
      status: "success",
      message: "Leaderboard data refreshed successfully",
      timestamp: new Date().toISOString(),
      totalUsers: data.metadata.totalUsers,
      redis: redisConnected ? "connected" : "not used"
    });
  } catch (error) {
    log(`Error in cron job to refresh leaderboard data: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to refresh leaderboard data",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Health check endpoint for cron verification
router.get("/health", async (req, res) => {
  // Basic health check that doesn't require authorization
  return res.json({
    status: "success",
    message: "Cron service is healthy",
    timestamp: new Date().toISOString()
  });
});

export default router;
