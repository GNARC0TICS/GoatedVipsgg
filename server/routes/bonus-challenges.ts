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

// Rate limiter setup for public endpoints
const publicLimiter = new RateLimiterMemory({
  points: 60, // Number of requests
  duration: 60, // Per minute
});

// Types for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: SelectUser;
}

// Validation schemas
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

// Authentication middleware with enhanced logging
const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    log("Authentication failed: User not authenticated");
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Admin middleware
const isAdmin = [authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    log(`Unauthorized admin access attempt by user ID: ${req.user?.id}`);
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
}];

// Error handling middleware
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

// Get active bonus codes (public)
router.get("/bonus-codes", asyncHandler(async (req, res) => {
  log("Fetching active bonus codes - Starting query...");
  try {
    await publicLimiter.consume(req.ip || 'unknown');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-RateLimit-Limit', publicLimiter.points);
    res.setHeader('X-RateLimit-Remaining', (await publicLimiter.get(req.ip || 'unknown'))?.remainingPoints || 0);

    const now = new Date();
    log(`Current time for comparison: ${now.toISOString()}`);

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

// Get all bonus codes (admin only)
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

// Create bonus code (admin only)
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

// Update bonus code (admin only)
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

// Deactivate bonus code (admin only)
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