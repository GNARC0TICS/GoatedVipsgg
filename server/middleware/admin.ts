import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
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
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
export const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_KEY) {
  console.error('Missing required admin environment variables');
}

export async function initializeAdmin(
  username: string = ADMIN_USERNAME,
  password: string = ADMIN_PASSWORD,
  adminKey: string = ADMIN_KEY,
) {
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    throw new Error("Invalid admin key");
  }

  try {
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);

    if (existingAdmin) {
      throw new Error("Admin user already exists");
    }

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
  } catch (error) {
    console.error("Error initializing admin:", error);
    throw error;
  }
}
