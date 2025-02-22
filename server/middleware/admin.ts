import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error in admin middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Initialize the first admin user on startup
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
export const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

export async function initializeAdmin() {
  try {
    // Check if required credentials exist
    if (!ADMIN_KEY) {
      console.warn("Missing ADMIN_SECRET_KEY environment variable");
      return null;
    }

    // First, check if any admin user exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);

    if (existingAdmin) {
      console.log("Admin user already exists, skipping initialization");
      return existingAdmin;
    }

    // Create new admin if none exists
    const [newAdmin] = await db
      .insert(users)
      .values({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        email: `${ADMIN_USERNAME}@admin.local`,
        isAdmin: true,
        emailVerified: true,
      })
      .onConflictDoNothing()
      .returning();

    if (newAdmin) {
      console.log("Successfully created admin user");
      return newAdmin;
    } else {
      console.log("Admin user already exists (conflict detected)");
      return null;
    }
  } catch (error) {
    console.error("Error initializing admin:", error);
    // Don't throw, just log and return null
    return null;
  }
}