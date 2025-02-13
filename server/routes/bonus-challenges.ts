import { Router } from "express";
import { db } from "@db";
import { bonusCodes, challenges, challengeEntries } from "@db/schema/challenges";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";

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
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};

// Bonus Code Routes
router.get("/api/bonus-codes", async (req, res) => {
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

router.post("/api/bonus-codes", isAdmin, async (req, res) => {
  try {
    const data = createBonusCodeSchema.parse(req.body);
    const [bonusCode] = await db
      .insert(bonusCodes)
      .values({
        ...data,
        createdBy: req.user.id,
      })
      .returning();
    res.status(201).json(bonusCode);
  } catch (error) {
    console.error("Error creating bonus code:", error);
    res.status(400).json({ error: "Invalid bonus code data" });
  }
});

// Challenge Routes
router.get("/api/challenges", async (req, res) => {
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

router.post("/api/challenges", isAdmin, async (req, res) => {
  try {
    const data = createChallengeSchema.parse(req.body);
    const [challenge] = await db
      .insert(challenges)
      .values({
        ...data,
        createdBy: req.user.id,
      })
      .returning();
    res.status(201).json(challenge);
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(400).json({ error: "Invalid challenge data" });
  }
});

// Challenge Entry Routes
router.post("/api/challenges/:challengeId/entries", async (req, res) => {
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
      })
      .returning();

    res.status(201).json(entry);
  } catch (error) {
    console.error("Error submitting challenge entry:", error);
    res.status(500).json({ error: "Failed to submit challenge entry" });
  }
});

export default router;
