import { Router } from "express";
import { db } from "@db";
import * as schema from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

/**
 * Get unread support tickets count
 */
router.get("/unread-count", async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // If user is admin, get total unread count
    if (req.user?.isAdmin) {
      const result = await db.select({ count: sql`count(*)` })
        .from(schema.supportTickets)
        .where(
          eq(schema.supportTickets.status, "open")
        );
      
      return res.json({ count: Number(result[0]?.count) || 0 });
    }
    
    // For regular users, check their own tickets
    const result = await db.select({ count: sql`count(*)` })
      .from(schema.supportTickets)
      .where(
        and(
          eq(schema.supportTickets.userId, userId),
          eq(schema.supportTickets.status, "open")
        )
      );
    
    return res.json({ count: Number(result[0]?.count) || 0 });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get support tickets and messages
 */
router.get("/tickets", async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // If user is admin, get all tickets
    if (req.user?.isAdmin) {
      const tickets = await db.select()
        .from(schema.supportTickets)
        .orderBy(desc(schema.supportTickets.createdAt))
        .limit(50);
      
      return res.json(tickets);
    }
    
    // For regular users, get only their tickets
    const tickets = await db.select()
      .from(schema.supportTickets)
      .where(eq(schema.supportTickets.userId, userId))
      .orderBy(desc(schema.supportTickets.createdAt))
      .limit(50);
    
    return res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get messages for a specific ticket
 */
router.get("/tickets/:ticketId/messages", async (req, res) => {
  try {
    const userId = req.user?.id;
    const ticketId = parseInt(req.params.ticketId);
    
    if (!userId || isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid request" });
    }
    
    // Check if user has access to this ticket
    const ticket = await db.select()
      .from(schema.supportTickets)
      .where(eq(schema.supportTickets.id, ticketId))
      .limit(1);
    
    if (ticket.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    // Only allow access if user is admin or ticket owner
    if (!req.user?.isAdmin && ticket[0].userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Get messages for this ticket
    const messages = await db.select()
      .from(schema.ticketMessages)
      .where(eq(schema.ticketMessages.ticketId, ticketId))
      .orderBy(desc(schema.ticketMessages.createdAt));
    
    return res.json(messages);
  } catch (error) {
    console.error("Error fetching ticket messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Create a new support ticket
 */
router.post("/tickets", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { subject, description } = req.body;
    
    if (!userId || !subject || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const newTicket = await db.insert(schema.supportTickets)
      .values({
        userId,
        subject,
        description,
        status: "open",
        priority: "medium",
      })
      .returning();
    
    return res.json(newTicket[0]);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Add a message to an existing ticket
 */
router.post("/tickets/:ticketId/reply", async (req, res) => {
  try {
    const userId = req.user?.id;
    const ticketId = parseInt(req.params.ticketId);
    const { message } = req.body;
    
    if (!userId || isNaN(ticketId) || !message) {
      return res.status(400).json({ error: "Invalid request" });
    }
    
    // Check if ticket exists and user has access
    const ticket = await db.select()
      .from(schema.supportTickets)
      .where(eq(schema.supportTickets.id, ticketId))
      .limit(1);
    
    if (ticket.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    // Only allow access if user is admin or ticket owner
    if (!req.user?.isAdmin && ticket[0].userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Add the message
    const newMessage = await db.insert(schema.ticketMessages)
      .values({
        ticketId,
        userId,
        message,
        isStaffReply: req.user?.isAdmin || false,
      })
      .returning();
    
    // Update the ticket's updated_at timestamp
    await db.update(schema.supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(schema.supportTickets.id, ticketId));
    
    return res.json(newMessage[0]);
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Update ticket status (admin only)
 */
router.patch("/tickets/:ticketId/status", async (req, res) => {
  try {
    const userId = req.user?.id;
    const ticketId = parseInt(req.params.ticketId);
    const { status } = req.body;
    
    if (!userId || isNaN(ticketId) || !status) {
      return res.status(400).json({ error: "Invalid request" });
    }
    
    // Only admins can update ticket status
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Update the ticket status
    const updatedTicket = await db.update(schema.supportTickets)
      .set({ 
        status,
        updatedAt: new Date(),
        assignedTo: userId // Assign to the admin who updated it
      })
      .where(eq(schema.supportTickets.id, ticketId))
      .returning();
    
    if (updatedTicket.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    return res.json(updatedTicket[0]);
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
