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
  username: string = ADMIN_USERNAME ?? '',
  password: string = ADMIN_PASSWORD ?? '',
  adminKey: string = ADMIN_KEY ?? '',
) {
  try {
    // Check if required credentials exist
    if (!username || !password || !adminKey) {
      console.warn("Skipping admin initialization - missing credentials");
      return null;
    }

    // Verify admin key
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      console.warn("Skipping admin initialization - invalid admin key");
      return null;
    }

    // First check if admin user exists
    try {
      // Only select specific fields to avoid column errors with new schema
      const [existingAdmin] = await db
        .select({
          id: users.id,
          username: users.username,
          isAdmin: users.isAdmin
        })
        .from(users)
        .where(eq(users.isAdmin, true))
        .limit(1);

      if (existingAdmin) {
        // Only update if username matches to avoid duplicate key error
        if (existingAdmin.username === username) {
          const [updatedAdmin] = await db
            .update(users)
            .set({
              password,
              email: `${username}@admin.local`,
            })
            .where(eq(users.id, existingAdmin.id))
            .returning();
          console.log("Admin user updated successfully");
          return updatedAdmin;
        }
        console.log("Admin user already exists with different username");
        return existingAdmin;
      }
    } catch (e) {
      console.warn("Error checking for existing admin, will try to create a new one", e);
      // Continue with creating a new admin
    }

    // Check if username is already taken by non-admin
    try {
      const [existingUser] = await db
        .select({
          id: users.id,
          username: users.username
        })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.warn(`Username ${username} already exists as non-admin user`);
        return null;
      }
    } catch (e) {
      console.warn("Error checking for existing user", e);
    }

    // Create new admin user with minimal required fields
    try {
      const [newAdmin] = await db
        .insert(users)
        .values({
          username,
          password,
          isAdmin: true,
          email: `${username}@admin.local`,
        })
        .returning();

      console.log("New admin user created successfully");
      return newAdmin;
    } catch (e) {
      console.error("Failed to create admin user", e);
      return null;
    }
  } catch (error) {
    console.error("Error initializing admin:", error);
    // Don't throw, just return null to allow application to continue
    return null;
  }
}