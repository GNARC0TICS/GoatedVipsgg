
/**
 * @fileoverview Bonus Challenges Router
 * Handles all bonus code and challenge related routes including creation, 
 * management and redemption of bonus codes. Includes rate limiting and 
 * authentication middleware.
 */

import { Router } from "express";
import { db } from "@db";
import { bonusCodes } from "@db/schema/bonus";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { log } from "../vite";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { SelectUser } from "@db/schema";

const router = Router();

// Rate limiter configuration for public endpoints
// Restricts to 60 requests per minute per IP address
const publicLimiter = new RateLimiterMemory({
  points: 60, // Number of requests allowed
  duration: 60, // Time window in seconds
});

// Extended Request interface to include authenticated user
interface AuthenticatedRequest extends Request {
  user?: SelectUser;
}

// Validation schemas for bonus code operations
const createBonusCodeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  bonusAmount: z.string().min(1, "Bonus amount is required"),
  requiredWager: z.string().optional(),
  totalClaims: z.number().int().positive("Total claims must be a positive number"),
  expiresAt: z.string().datetime("Invalid expiration date"),
  source: z.string().default('web'),
});

const updateBonusCodeSchema = z.object({
  description: z.string().optional(),
  bonusAmount: z.string().optional(),
  requiredWager: z.string().optional(),
  totalClaims: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
});

/**
 * Authentication middleware
 * Verifies user is authenticated before proceeding
 */
const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    log("Authentication failed: User not authenticated");
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

/**
 * Admin authorization middleware
 * Checks if authenticated user has admin privileges
 */
const isAdmin = [authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    log(`Unauthorized admin access attempt by user ID: ${req.user?.id}`);
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
}];

/**
 * Error handling middleware wrapper
 * Provides consistent error handling for async routes
 */
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      log(`Error in route handler: ${error}`);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: error.errors.map(err => err.message)
        });
      }
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error"
      });
    });
  };
};

/**
 * GET /bonus-codes
 * Public endpoint to fetch active bonus codes
 * Includes rate limiting and caching headers
 */
router.get("/bonus-codes", asyncHandler(async (req, res) => {
  log("Fetching active bonus codes - Starting query...");
  try {
    await publicLimiter.consume(req.ip || 'unknown');

    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-RateLimit-Limit', publicLimiter.points);
    res.setHeader('X-RateLimit-Remaining', (await publicLimiter.get(req.ip || 'unknown'))?.remainingPoints || 0);

    const now = new Date();
    log(`Current time for comparison: ${now.toISOString()}`);

    // Query active bonus codes
    const activeBonusCodes = await db
      .select()
      .from(bonusCodes)
      .where(
        and(
          eq(bonusCodes.status, 'active'),
          gt(bonusCodes.expiresAt, now)
        )
      );

    log(`Found ${activeBonusCodes.length} active bonus codes`);

    return res.json({
      status: "success",
      count: activeBonusCodes.length,
      data: activeBonusCodes,
      _meta: {
        timestamp: now.toISOString(),
        filters: {
          status: 'active',
          expiresAfter: now.toISOString()
        }
      }
    });
  } catch (error) {
    log(`Error fetching bonus codes: ${error}`);
    throw error;
  }
}));

/**
 * GET /admin/bonus-codes
 * Admin endpoint to fetch all bonus codes
 * Requires admin authentication
 */
router.get("/admin/bonus-codes", isAdmin, asyncHandler(async (_req: AuthenticatedRequest, res) => {
  log("Admin: Fetching all bonus codes");
  try {
    const allBonusCodes = await db
      .select()
      .from(bonusCodes)
      .orderBy(bonusCodes.createdAt);

    log(`Found ${allBonusCodes.length} total bonus codes`);
    res.json(allBonusCodes);
  } catch (error) {
    log(`Error fetching all bonus codes: ${error}`);
    throw error;
  }
}));

/**
 * POST /admin/bonus-codes
 * Admin endpoint to create new bonus codes
 * Validates input and enforces business rules
 */
router.post("/admin/bonus-codes", isAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  log("Admin: Creating new bonus code");
  try {
    const result = createBonusCodeSchema.safeParse(req.body);
    if (!result.success) {
      log(`Validation failed: ${JSON.stringify(result.error.issues)}`);
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: result.error.issues.map(i => i.message)
      });
    }

    const { code, description, bonusAmount, requiredWager, totalClaims, expiresAt, source } = result.data;
    const [bonusCode] = await db
      .insert(bonusCodes)
      .values({
        code,
        description,
        bonusAmount,
        requiredWager,
        totalClaims,
        expiresAt: new Date(expiresAt),
        source,
        createdBy: req.user!.id,
        currentClaims: 0,
      })
      .returning();

    log(`Created bonus code: ${bonusCode.code}`);
    res.status(201).json(bonusCode);
  } catch (error) {
    log(`Error creating bonus code: ${error}`);
    throw error;
  }
}));

/**
 * PUT /admin/bonus-codes/:id
 * Admin endpoint to update existing bonus codes
 * Validates input and handles partial updates
 */
router.put("/admin/bonus-codes/:id", isAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  log(`Admin: Updating bonus code ${id}`);
  try {
    const result = updateBonusCodeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: result.error.issues.map(i => i.message)
      });
    }

    const updateData = {
      ...result.data,
      updatedAt: new Date()
    };

    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    }

    const [updated] = await db
      .update(bonusCodes)
      .set(updateData)
      .where(eq(bonusCodes.id, parseInt(id)))
      .returning();

    if (!updated) {
      log(`Bonus code ${id} not found`);
      return res.status(404).json({ error: "Bonus code not found" });
    }

    log(`Updated bonus code: ${updated.code}`);
    res.json(updated);
  } catch (error) {
    log(`Error updating bonus code ${id}: ${error}`);
    throw error;
  }
}));

/**
 * DELETE /admin/bonus-codes/:id
 * Admin endpoint to deactivate bonus codes
 * Soft deletes by setting status to inactive
 */
router.delete("/admin/bonus-codes/:id", isAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  log(`Admin: Deactivating bonus code ${id}`);
  try {
    const [deactivated] = await db
      .update(bonusCodes)
      .set({
        status: 'inactive',
        updatedAt: new Date()
      })
      .where(eq(bonusCodes.id, parseInt(id)))
      .returning();

    if (!deactivated) {
      log(`Bonus code ${id} not found`);
      return res.status(404).json({ error: "Bonus code not found" });
    }

    log(`Deactivated bonus code: ${deactivated.code}`);
    res.json({ message: "Bonus code deactivated successfully" });
  } catch (error) {
    log(`Error deactivating bonus code ${id}: ${error}`);
    throw error;
  }
}));

export default router;
