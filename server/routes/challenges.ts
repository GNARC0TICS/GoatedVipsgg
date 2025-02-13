import { Router } from "express";
import { db } from "@db";
import { challenges, challengeEntries } from "@db/schema/challenges";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

const router = Router();

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};

// Admin Routes
router.get("/admin/challenges", isAdmin, async (req, res) => {
  try {
    const allChallenges = await db.select().from(challenges);
    res.json(allChallenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

router.post("/admin/challenges", isAdmin, async (req, res) => {
  try {
    const newChallenge = {
      ...req.body,
      createdBy: req.user!.id,
      source: "web",
    };
    const [challenge] = await db.insert(challenges).values(newChallenge).returning();
    res.status(201).json(challenge);
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(500).json({ error: "Failed to create challenge" });
  }
});

router.put("/admin/challenges/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [updated] = await db
      .update(challenges)
      .set(req.body)
      .where(eq(challenges.id, parseInt(id)))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating challenge:", error);
    res.status(500).json({ error: "Failed to update challenge" });
  }
});

router.delete("/admin/challenges/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // First delete all entries for this challenge
    await db.delete(challengeEntries).where(eq(challengeEntries.challengeId, parseInt(id)));
    // Then delete the challenge
    const [deleted] = await db
      .delete(challenges)
      .where(eq(challenges.id, parseInt(id)))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    res.json({ message: "Challenge deleted successfully" });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    res.status(500).json({ error: "Failed to delete challenge" });
  }
});

// Public Routes
router.get("/challenges", async (req, res) => {
  try {
    const activeChallenges = await db
      .select()
      .from(challenges)
      .where(eq(challenges.status, "active"));
    res.json(activeChallenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

// Challenge Entries Routes
router.post("/challenges/:id/entries", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const { id } = req.params;
  const { betLink } = req.body;
  
  try {
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, parseInt(id)))
      .limit(1);
      
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    const entry = {
      challengeId: parseInt(id),
      userId: req.user.id,
      betLink,
      status: "pending",
    };
    
    const [newEntry] = await db.insert(challengeEntries).values(entry).returning();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Error submitting challenge entry:", error);
    res.status(500).json({ error: "Failed to submit challenge entry" });
  }
});

export default router;
