import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const TELEGRAM_ADMIN_ID = "1689953605"; // Constant for Telegram admin override

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Ensure authentication and existence of user info
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || !req.user.id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    // Option 1: Use a type assertion in your middleware
    if ((user as { telegramId?: string })?.telegramId === TELEGRAM_ADMIN_ID) {
      return next();
    }


    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    return next();
  } catch (error) {
    console.error("Error in admin middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Admin credentials from environment
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
export const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_KEY) {
  console.error("Missing required admin environment variables");
}

export async function initializeAdmin(
  username: string = ADMIN_USERNAME!,
  password: string = ADMIN_PASSWORD!,
  adminKey: string = ADMIN_KEY!
) {
  try {
    // Check if required credentials exist
    if (!username || !password || !adminKey) {
      throw new Error("Missing admin credentials");
    }

    // Verify the admin key matches the expected environment variable
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      throw new Error("Invalid admin key");
    }

    // Check if an admin user already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);

    if (existingAdmin) {
      // Don't update username if it already exists
      const [updatedAdmin] = await db
        .update(users)
        .set({
          password,
          email: `${username}@admin.local`,
        })
        .where(eq(users.id, existingAdmin.id))
        .returning();
      return updatedAdmin;
    } else {
      const [newAdmin] = await db
        .insert(users)
        .values({
          username,
          password,
          isAdmin: true,
          email: `${username}@admin.local`,
        })
        .returning();
      return newAdmin;
    }
  } catch (error) {
    console.error("Error initializing admin:", error);
    throw error;
  }
}
