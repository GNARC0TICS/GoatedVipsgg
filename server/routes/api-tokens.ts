import express from "express";
import { requireAdmin } from "../middleware/auth";
import { requireAdminDomain } from "../middleware/domain-router";
import { TokenService } from "../utils/token-service";
import { log } from "../vite";

const router = express.Router();
const tokenService = new TokenService();

/**
 * GET /api/admin/api-tokens/goated
 * 
 * Get the Goated.com API token metadata for the admin dashboard
 */
router.get("/goated", requireAdminDomain, requireAdmin, async (_req, res) => {
  try {
    const metadata = await tokenService.getTokenMetadata();
    res.json(metadata);
  } catch (error) {
    log(`Error fetching token metadata: ${error}`);
    res.status(500).json({ 
      error: "Failed to fetch token metadata",
      details: String(error)
    });
  }
});

/**
 * POST /api/admin/api-tokens/goated
 * 
 * Save a new Goated.com API token
 */
router.post("/goated", requireAdminDomain, requireAdmin, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    
    // Validate token format (basic check for JWT structure)
    const jwtRegex = /^[A-Za-z0-9\-_\.]+\.[A-Za-z0-9\-_\.]+\.[A-Za-z0-9\-_\.]+$/;
    if (!jwtRegex.test(token)) {
      return res.status(400).json({ error: "Invalid token format" });
    }
    
    // Save the token
    const success = await tokenService.saveGoatedApiToken(token);
    
    if (success) {
      // Log the action but don't log the actual token
      log(`Admin ${req.user?.username || "Unknown"} updated the Goated.com API token`);
      
      res.json({ 
        success: true,
        message: "Token saved successfully"
      });
    } else {
      res.status(500).json({ error: "Failed to save token" });
    }
  } catch (error) {
    log(`Error saving token: ${error}`);
    res.status(500).json({ 
      error: "Failed to save token",
      details: String(error)
    });
  }
});

/**
 * POST /api/admin/api-tokens/test
 * 
 * Test the current API token
 */
router.post("/test", requireAdminDomain, requireAdmin, async (_req, res) => {
  try {
    // Get the current token
    const token = await tokenService.getGoatedApiToken();
    
    if (!token) {
      return res.status(404).json({ 
        success: false,
        message: "No token found" 
      });
    }
    
    // Test the token with a simple API request
    const testResponse = await fetch(`${process.env.API_BASE_URL}/health`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    if (testResponse.ok) {
      res.json({ 
        success: true,
        message: "Token is valid and working" 
      });
    } else {
      res.status(testResponse.status).json({ 
        success: false,
        message: `Token test failed with status: ${testResponse.status}` 
      });
    }
  } catch (error) {
    log(`Error testing token: ${error}`);
    res.status(500).json({ 
      success: false,
      error: "Failed to test token",
      details: String(error)
    });
  }
});

export default router;
