import { Router } from "express";
import { db } from "@db";
import { bonusCodes } from "@db/schema/challenges";
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
router.get("/admin/bonus-codes", isAdmin, async (req, res) => {
  try {
    const codes = await db.select().from(bonusCodes);
    res.json(codes);
  } catch (error) {
    console.error("Error fetching bonus codes:", error);
    res.status(500).json({ error: "Failed to fetch bonus codes" });
  }
});

router.post("/admin/bonus-codes", isAdmin, async (req, res) => {
  try {
    const newCode = {
      ...req.body,
      createdBy: req.user!.id,
      source: "web",
    };
    const [code] = await db.insert(bonusCodes).values(newCode).returning();
    res.status(201).json(code);
  } catch (error) {
    console.error("Error creating bonus code:", error);
    res.status(500).json({ error: "Failed to create bonus code" });
  }
});

router.put("/admin/bonus-codes/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [updated] = await db
      .update(bonusCodes)
      .set(req.body)
      .where(eq(bonusCodes.id, parseInt(id)))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Bonus code not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating bonus code:", error);
    res.status(500).json({ error: "Failed to update bonus code" });
  }
});

router.delete("/admin/bonus-codes/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [deleted] = await db
      .delete(bonusCodes)
      .where(eq(bonusCodes.id, parseInt(id)))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Bonus code not found" });
    }
    res.json({ message: "Bonus code deleted successfully" });
  } catch (error) {
    console.error("Error deleting bonus code:", error);
    res.status(500).json({ error: "Failed to delete bonus code" });
  }
});

// Public Routes
router.get("/bonus-codes", async (req, res) => {
  try {
    const codes = await db
      .select()
      .from(bonusCodes)
      .where(eq(bonusCodes.status, "active"));
    res.json(codes);
  } catch (error) {
    console.error("Error fetching bonus codes:", error);
    res.status(500).json({ error: "Failed to fetch bonus codes" });
  }
});

export default router;
