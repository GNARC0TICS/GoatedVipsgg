import { Router } from "express";
import { db } from "@db";
import { bonusCodes } from "@db/schema/challenges";
import { users } from "@db/schema/users";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Types for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    isAdmin: boolean;
  } | null;
}

// Validation schemas
const createBonusCodeSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional(),
  bonusAmount: z.string().min(1),
  requiredWager: z.string().optional(),
  totalClaims: z.number().int().positive(),
  expiresAt: z.string().datetime(),
});

const updateBonusCodeSchema = z.object({
  description: z.string().optional(),
  bonusAmount: z.string().optional(),
  requiredWager: z.string().optional(),
  totalClaims: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
});

// Middleware to check if user is admin
const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
};

// Error handling middleware
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Get active bonus codes (public)
router.get("/bonus-codes", asyncHandler(async (_req, res) => {
  const activeBonusCodes = await db
    .select()
    .from(bonusCodes)
    .where(
      and(
        eq(bonusCodes.status, "active"),
        gte(bonusCodes.expiresAt, new Date())
      )
    );
  res.json(activeBonusCodes);
}));

// Get all bonus codes (admin only)
router.get("/admin/bonus-codes", isAdmin, asyncHandler(async (_req, res) => {
  const allBonusCodes = await db
    .select({
      id: bonusCodes.id,
      code: bonusCodes.code,
      description: bonusCodes.description,
      bonusAmount: bonusCodes.bonusAmount,
      requiredWager: bonusCodes.requiredWager,
      totalClaims: bonusCodes.totalClaims,
      currentClaims: bonusCodes.currentClaims,
      expiresAt: bonusCodes.expiresAt,
      status: bonusCodes.status,
      source: bonusCodes.source,
      createdAt: bonusCodes.createdAt,
      createdBy: bonusCodes.createdBy,
      creatorName: users.name,
    })
    .from(bonusCodes)
    .leftJoin(users, eq(bonusCodes.createdBy, users.id))
    .orderBy(bonusCodes.createdAt);
  res.json(allBonusCodes);
}));

// Create bonus code (admin only)
router.post("/admin/bonus-codes", isAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const data = createBonusCodeSchema.parse(req.body);

  const [bonusCode] = await db
    .insert(bonusCodes)
    .values({
      code: data.code,
      description: data.description,
      bonusAmount: data.bonusAmount,
      requiredWager: data.requiredWager,
      totalClaims: data.totalClaims,
      expiresAt: new Date(data.expiresAt),
      status: "active",
      createdBy: req.user!.id,
      source: "web",
    })
    .returning();

  res.status(201).json(bonusCode);
}));

// Update bonus code (admin only)
router.put("/admin/bonus-codes/:id", isAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const data = updateBonusCodeSchema.parse(req.body);

  const [updated] = await db
    .update(bonusCodes)
    .set({
      ...(data.description !== undefined && { description: data.description }),
      ...(data.bonusAmount !== undefined && { bonusAmount: data.bonusAmount }),
      ...(data.requiredWager !== undefined && { requiredWager: data.requiredWager }),
      ...(data.totalClaims !== undefined && { totalClaims: data.totalClaims }),
      ...(data.expiresAt !== undefined && { expiresAt: new Date(data.expiresAt) }),
      ...(data.status !== undefined && { status: data.status }),
      updatedAt: new Date(),
    })
    .where(eq(bonusCodes.id, parseInt(id)))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Bonus code not found" });
  }

  res.json(updated);
}));

// Deactivate bonus code (admin only)
router.delete("/admin/bonus-codes/:id", isAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const [deleted] = await db
    .update(bonusCodes)
    .set({
      status: "inactive",
      updatedAt: new Date(),
    })
    .where(eq(bonusCodes.id, parseInt(id)))
    .returning();

  if (!deleted) {
    return res.status(404).json({ error: "Bonus code not found" });
  }

  res.json({ message: "Bonus code deactivated successfully" });
}));

export default router;