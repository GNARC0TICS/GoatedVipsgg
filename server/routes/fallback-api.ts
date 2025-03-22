import express from "express";
import { log } from "../vite";
import { createEnhancedFallbackData } from "../utils/fallback-data";

const router = express.Router();

/**
 * Fallback API routes to serve static data when the main API is unavailable
 * These routes mirror the structure of the main API but serve static data
 */

// Fallback route for leaderboard data
router.get("/affiliate/stats/fallback", (req, res) => {
  log("Serving fallback leaderboard data");
  
  // Generate fallback data
  const fallbackData = createEnhancedFallbackData();
  
  // Add a small random delay to simulate API call (100-500ms)
  setTimeout(() => {
    res.json(fallbackData);
  }, Math.floor(Math.random() * 400) + 100);
});

// Main route for leaderboard data with query parameters
router.get("/affiliate/stats", (req, res) => {
  log(`Serving leaderboard data with query params: ${JSON.stringify(req.query)}`);
  
  // Generate fallback data
  const fallbackData = createEnhancedFallbackData();
  
  // Add a small random delay to simulate API call (100-500ms)
  setTimeout(() => {
    res.json(fallbackData);
  }, Math.floor(Math.random() * 400) + 100);
});

// Fallback route for wager race position
router.get("/wager-race/position/fallback", (req, res) => {
  log("Serving fallback wager race position data");
  
  const { userId, goatedUsername } = req.query;
  log(`Fallback request for user: ${userId}, goatedUsername: ${goatedUsername}`);
  
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
    endDate: endDate.toISOString()
  };
  
  // Add a small random delay to simulate API call (100-500ms)
  setTimeout(() => {
    res.json(fallbackData);
  }, Math.floor(Math.random() * 400) + 100);
});

// Fallback route for current wager race
router.get("/wager-races/current", (req, res) => {
  log("Serving fallback current wager race data");
  
  // Calculate end date (end of current month)
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Generate participants
  const participants = Array.from({ length: 10 }, (_, i) => ({
    uid: `sample-${i}`,
    name: `Player${i + 1}`,
    wagered: Math.floor(Math.random() * 500000),
    position: i + 1
  }));
  
  // Create fallback race data
  const fallbackData = {
    id: `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`,
    status: "live",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    prizePool: 500,
    title: "Monthly Wager Race",
    participants
  };
  
  // Add a small random delay to simulate API call (100-500ms)
  setTimeout(() => {
    res.json(fallbackData);
  }, Math.floor(Math.random() * 400) + 100);
});

// Fallback route for previous wager race
router.get("/wager-races/previous", (req, res) => {
  log("Serving fallback previous wager race data");
  
  // Calculate dates for previous month
  const now = new Date();
  const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const startDate = new Date(previousYear, previousMonth, 1);
  const endDate = new Date(previousYear, previousMonth + 1, 0, 23, 59, 59);
  
  // Generate participants
  const participants = Array.from({ length: 10 }, (_, i) => ({
    uid: `sample-${i}`,
    name: `Player${i + 1}`,
    wagered: Math.floor(Math.random() * 500000),
    position: i + 1
  }));
  
  // Create fallback race data
  const fallbackData = {
    id: `${previousYear}${(previousMonth + 1).toString().padStart(2, "0")}`,
    status: "ended",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    prizePool: 500,
    title: "Previous Monthly Race",
    participants
  };
  
  // Add a small random delay to simulate API call (100-500ms)
  setTimeout(() => {
    res.json(fallbackData);
  }, Math.floor(Math.random() * 400) + 100);
});

// Main route for wager race position with query parameters
router.get("/wager-race/position", (req, res) => {
  log(`Serving wager race position data with query params: ${JSON.stringify(req.query)}`);
  
  const { userId, goatedUsername } = req.query;
  log(`Request for user: ${userId}, goatedUsername: ${goatedUsername}`);
  
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
    endDate: endDate.toISOString()
  };
  
  // Add a small random delay to simulate API call (100-500ms)
  setTimeout(() => {
    res.json(fallbackData);
  }, Math.floor(Math.random() * 400) + 100);
});

export default router;
