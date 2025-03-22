/**
 * Test route for verifying fallback data behavior in different environments
 */
import { Router } from "express";
import { isFallbackDataAllowed, createEnhancedFallbackData, createFallbackWagerRacePosition } from "../utils/fallback-data";

const router = Router();

router.get("/test-fallback", (req, res) => {
  // Get requested environment from query param or use current
  const env = req.query.env as string || process.env.NODE_ENV;
  
  // Temporarily set NODE_ENV for this request
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  
  // Test fallback data functionality
  const results = {
    environment: env,
    isFallbackDataAllowed: isFallbackDataAllowed(),
    createEnhancedFallbackData: {
      status: createEnhancedFallbackData().status,
      isEmpty: createEnhancedFallbackData().data.today.data.length === 0
    },
    createFallbackWagerRacePosition: createFallbackWagerRacePosition(1) ? 'returns data' : 'returns null'
  };
  
  // Restore original NODE_ENV
  process.env.NODE_ENV = originalEnv;
  
  res.json(results);
});

export default router;