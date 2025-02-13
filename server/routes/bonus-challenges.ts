import { Router } from "express";
import { db } from "@db";
import { bonusCodes, challenges, challengeEntries } from "@db/schema/challenges";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";
import type { Request, Response } from "express";

const router = Router();

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

const createChallengeSchema = z.object({
  game: z.string().min(1),
  minBet: z.string().min(1),
  multiplier: z.string().optional(),
  prizeAmount: z.string().min(1),
  maxWinners: z.number().int().positive(),
  timeframe: z.string().datetime(),
  description: z.string().optional(),
  bonusCode: z.string().optional(),
});

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};

// Bonus Code Routes
router.get("/bonus-codes", async (_req, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching bonus codes:", error);
    res.status(500).json({ error: "Failed to fetch bonus codes" });
  }
});

router.get("/admin/bonus-codes", isAdmin, async (_req, res) => {
  try {
    const allBonusCodes = await db
      .select()
      .from(bonusCodes)
      .orderBy(bonusCodes.createdAt);
    res.json(allBonusCodes);
  } catch (error) {
    console.error("Error fetching all bonus codes:", error);
    res.status(500).json({ error: "Failed to fetch bonus codes" });
  }
});

router.post("/admin/bonus-codes", isAdmin, async (req: Request & { user: { id: number, isAdmin: boolean } }, res) => {
  try {
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
        createdBy: req.user.id,
        source: "web",
      })
      .returning();
    res.status(201).json(bonusCode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid bonus code data", details: error.errors });
    }
    console.error("Error creating bonus code:", error);
    res.status(500).json({ error: "Failed to create bonus code" });
  }
});

router.put("/admin/bonus-codes/:id", isAdmin, async (req: Request & { user: { id: number, isAdmin: boolean } }, res) => {
  try {
    const { id } = req.params;
    const data = updateBonusCodeSchema.parse(req.body);

    const [updated] = await db
      .update(bonusCodes)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedBy: req.user.id,
      })
      .where(eq(bonusCodes.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Bonus code not found" });
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid update data", details: error.errors });
    }
    console.error("Error updating bonus code:", error);
    res.status(500).json({ error: "Failed to update bonus code" });
  }
});

router.delete("/admin/bonus-codes/:id", isAdmin, async (req: Request & { user: { id: number, isAdmin: boolean } }, res) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .update(bonusCodes)
      .set({
        status: "inactive",
        updatedAt: new Date(),
        updatedBy: req.user.id,
      })
      .where(eq(bonusCodes.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Bonus code not found" });
    }

    res.json({ message: "Bonus code deactivated successfully" });
  } catch (error) {
    console.error("Error deactivating bonus code:", error);
    res.status(500).json({ error: "Failed to deactivate bonus code" });
  }
});

// Challenge Routes
router.get("/challenges", async (_req, res) => {
  try {
    const activeChallenges = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.status, "active"),
          gte(challenges.timeframe, new Date())
        )
      );
    res.json(activeChallenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

router.post("/admin/challenges", isAdmin, async (req: Request & { user: { id: number, isAdmin: boolean } }, res) => {
  try {
    const data = createChallengeSchema.parse(req.body);
    const [challenge] = await db
      .insert(challenges)
      .values({
        game: data.game,
        minBet: data.minBet,
        multiplier: data.multiplier,
        prizeAmount: data.prizeAmount,
        maxWinners: data.maxWinners,
        timeframe: new Date(data.timeframe),
        description: data.description,
        bonusCode: data.bonusCode,
        status: "active",
        createdBy: req.user.id,
        source: "web"
      })
      .returning();
    res.status(201).json(challenge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid challenge data", details: error.errors });
    }
    console.error("Error creating challenge:", error);
    res.status(500).json({ error: "Failed to create challenge" });
  }
});

// Challenge Entry Routes
router.post("/challenges/:challengeId/entries", async (req: Request & { user: { id: number } }, res) => {
  try {
    const { challengeId } = req.params;
    const { betLink } = req.body;

    if (!betLink) {
      return res.status(400).json({ error: "Bet link is required" });
    }

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.id, parseInt(challengeId)),
          eq(challenges.status, "active"),
          gte(challenges.timeframe, new Date())
        )
      );

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found or expired" });
    }

    const [entry] = await db
      .insert(challengeEntries)
      .values({
        challengeId: parseInt(challengeId),
        userId: req.user.id,
        betLink,
        status: "pending"
      })
      .returning();

    res.status(201).json(entry);
  } catch (error) {
    console.error("Error submitting challenge entry:", error);
    res.status(500).json({ error: "Failed to submit challenge entry" });
  }
});

// Admin verification of challenge entries
router.put("/admin/challenges/entries/:entryId", isAdmin, async (req: Request & { user: { id: number, isAdmin: boolean } }, res) => {
  try {
    const { entryId } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [entry] = await db
      .update(challengeEntries)
      .set({
        status,
        verifiedAt: new Date(),
        verifiedBy: req.user.id
      })
      .where(eq(challengeEntries.id, parseInt(entryId)))
      .returning();

    if (!entry) {
      return res.status(404).json({ error: "Challenge entry not found" });
    }

    res.json(entry);
  } catch (error) {
    console.error("Error verifying challenge entry:", error);
    res.status(500).json({ error: "Failed to verify challenge entry" });
  }
});

export default router;