import { Router } from "express";
import { db } from "@db";
import { bonusCodes } from "@db/schema/bonus";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { verifyToken, generateTestToken } from "../auth";
import { log } from "../vite";
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = Router();

// Rate limiter setup for public endpoints
const publicLimiter = new RateLimiterMemory({
  points: 60, // Number of requests
  duration: 60, // Per minute
});

// Types for authenticated requests
interface AuthUser {
  id: number;
  username: string;
  password: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
}

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
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
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      log("Authentication failed: No token provided");
      return res.status(401).json({ error: "No token provided" });
    }

    const userData = await verifyToken(token);
    if (!userData) {
      log("Authentication failed: Invalid token");
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = userData;
    log(`User authenticated: ID ${userData.id}, Admin: ${userData.isAdmin}`);
    next();
  } catch (error) {
    log(`Authentication error: ${error}`);
    return res.status(401).json({ error: "Authentication failed" });
  }
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
      // Check if it's a validation error
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
    // Rate limiting
    await publicLimiter.consume(req.ip || 'unknown');

    // Set response headers
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
    if (activeBonusCodes.length > 0) {
      log(`Query result sample: ${JSON.stringify(activeBonusCodes[0])}`);
    }

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
router.get("/admin/bonus-codes", isAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  log("Admin: Fetching all bonus codes");
  try {
    const allBonusCodes = await db
      .select()
      .from(bonusCodes)
      .orderBy(bonusCodes.createdAt);

    log(`Found ${allBonusCodes.length} total bonus codes`);

    if (allBonusCodes.length > 0) {
      log(`Query result sample: ${JSON.stringify(allBonusCodes[0])}`);
    }

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

    const [bonusCode] = await db
      .insert(bonusCodes)
      .values({
        ...result.data,
        currentClaims: 0,
        status: 'active',
        createdBy: req.user!.id,
        expiresAt: new Date(result.data.expiresAt),
      })
      .returning();

    log(`Created bonus code: ${bonusCode.code}`);

    // Notify Telegram users of new bonus code
    try {
      const bot = await initializeBot(); //this function needs to be defined elsewhere and handle bot initialization.
      if (bot) {
        const message = `🎁 NEW BONUS CODE AVAILABLE!\n\nCode: ${bonusCode.code}\nAmount: ${bonusCode.bonusAmount}\nExpires: ${new Date(bonusCode.expiresAt).toLocaleString()}`;
        await bot.sendMessage(process.env.TELEGRAM_GROUP_ID || '', message);
      }
    } catch (error) {
      log(`Failed to send Telegram notification: ${error}`);
    }

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

    const [updated] = await db
      .update(bonusCodes)
      .set({
        ...result.data,
        ...(result.data.expiresAt && { expiresAt: new Date(result.data.expiresAt) }),
        updatedAt: new Date(),
      })
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

// Test endpoint to get admin token (only for testing purposes)
if (process.env.NODE_ENV !== 'production') {
  router.get("/test-token", (_req, res) => {
    log("Test token endpoint called");
    res.setHeader('Content-Type', 'application/json');
    const token = generateTestToken(true); // Generate admin token
    res.json({ token, generated: new Date().toISOString() });
  });
}

export default router;