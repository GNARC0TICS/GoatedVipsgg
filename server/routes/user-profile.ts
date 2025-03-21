import { Router } from "express";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = Router();

// Schema for validating profile update requests
const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  telegramUsername: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  profileColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().nullable(),
});

// Update user profile
router.post("/api/user/update", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    
    // Validate request body
    const result = updateProfileSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid request data",
        errors: result.error.format(),
      });
    }
    
    const { username, telegramUsername, bio, profileColor } = result.data;
    
    // Check if username is already taken (if changing username)
    if (username) {
      const existingUsers = await db.execute(sql`
        SELECT * FROM users 
        WHERE username = ${username} 
        LIMIT 1
      `);
      
      const existingUser = existingUsers[0];
      
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          status: "error",
          message: "Username is already taken",
        });
      }
    }
    
    // Build the update query dynamically
    let updateFields = [];
    
    if (username) {
      updateFields.push(sql`username = ${username}`);
    }
    
    if (telegramUsername !== undefined) {
      updateFields.push(sql`telegram_username = ${telegramUsername}`);
    }
    
    if (bio !== undefined) {
      updateFields.push(sql`bio = ${bio}`);
    }
    
    if (profileColor !== undefined) {
      updateFields.push(sql`profile_color = ${profileColor}`);
    }
    
    // If no fields to update, return the current user
    if (updateFields.length === 0) {
      const currentUsers = await db.execute(sql`
        SELECT * FROM users 
        WHERE id = ${userId} 
        LIMIT 1
      `);
      
      const currentUser = currentUsers[0];
      
      return res.json({
        status: "success",
        data: {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          telegramUsername: currentUser.telegram_username,
          bio: currentUser.bio,
          profileColor: currentUser.profile_color,
        },
      });
    }
    
    // Join all updates with commas
    const setClause = sql.join(updateFields, sql`, `);
    
    // Execute the update
    const updatedUsers = await db.execute(sql`
      UPDATE users 
      SET ${setClause} 
      WHERE id = ${userId} 
      RETURNING *
    `);
    
    const updatedUser = updatedUsers[0];
    
    return res.json({
      status: "success",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        telegramUsername: updatedUser.telegram_username,
        bio: updatedUser.bio,
        profileColor: updatedUser.profile_color,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
