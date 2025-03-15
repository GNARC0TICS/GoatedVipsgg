import { Router } from "express";
import { db } from "@/db";
import { supportMessages, supportReadStatus } from "@/db/schema/support";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

/**
 * Get unread support messages count
 */
router.get("/unread-count", async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // If user is admin, get total unread count
    if (req.user?.isAdmin) {
      const count = await db.select({ count: db.fn.count() })
        .from(supportMessages)
        .where(
          eq(supportMessages.read, false)
        );
      
      return res.json({ count: count[0]?.count || 0 });
    }
    
    // For regular users, check their own messages
    const count = await db.select({ count: db.fn.count() })
      .from(supportReadStatus)
      .where(
        and(
          eq(supportReadStatus.userId, userId),
          eq(supportReadStatus.read, false)
        )
      );
    
    return res.json({ count: count[0]?.count || 0 });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get support messages
 */
router.get("/messages", async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // If user is admin, get all messages
    if (req.user?.isAdmin) {
      const messages = await db.select()
        .from(supportMessages)
        .orderBy(desc(supportMessages.createdAt))
        .limit(50);
      
      // Mark all as read
      await db.update(supportMessages)
        .set({ read: true })
        .where(eq(supportMessages.read, false));
      
      return res.json(messages);
    }
    
    // For regular users, get only their messages
    const messages = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.userId, userId))
      .orderBy(desc(supportMessages.createdAt))
      .limit(50);
    
    // Mark user's messages as read
    await db.update(supportReadStatus)
      .set({ read: true })
      .where(
        and(
          eq(supportReadStatus.userId, userId),
          eq(supportReadStatus.read, false)
        )
      );
    
    return res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Send a support message
 */
router.post("/reply", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const newMessage = await db.insert(supportMessages)
      .values({
        userId,
        message,
        username: req.user?.username || "Unknown User",
        read: false,
      })
      .returning();
    
    return res.json(newMessage[0]);
  } catch (error) {
    console.error("Error sending reply:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router; 