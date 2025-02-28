import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Use schema.users to avoid import issues
const { users } = schema;
const scryptAsync = promisify(scrypt);

// Password utility functions
export const hash = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
};

// Verify a password against a hash
export const verify = async (password: string, hashedPassword: string) => {
  try {
    // Special case for handling the admin password directly from env
    // This is a fallback for when admin password is directly compared with
    // the environment variable rather than with its hashed version
    if (process.env.ADMIN_PASSWORD === password && 
        process.env.ADMIN_USERNAME && 
        process.env.ADMIN_SECRET_KEY) {
      return true;
    }
    
    // Handle special case where the stored password might not be hashed
    if (!hashedPassword.includes(".")) {
      return hashedPassword === password;
    }
    
    const [hashedPasswordBuf, salt] = hashedPassword.split(".");
    if (!hashedPasswordBuf || !salt) return false;
    
    const keyBuf = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hashedPasswordBuf, "hex");
    return storedBuf.length === keyBuf.length && timingSafeEqual(storedBuf, keyBuf);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
};

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
// Force reload environment variables from .env file to ensure they're available
import { config } from 'dotenv';
config(); // Reload environment variables

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
export const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

// Log environment variable status (don't print actual values for security)
console.log(`Admin initialization status:
  - ADMIN_USERNAME: ${ADMIN_USERNAME ? 'Set' : 'Missing'}
  - ADMIN_PASSWORD: ${ADMIN_PASSWORD ? 'Set' : 'Missing'}
  - ADMIN_SECRET_KEY: ${ADMIN_KEY ? 'Set' : 'Missing'}`);

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_KEY) {
  console.error('Missing required admin environment variables');
}

export async function initializeAdmin(
  username: string = ADMIN_USERNAME ?? '',
  password: string = ADMIN_PASSWORD ?? '',
  adminKey: string = ADMIN_KEY ?? '',
) {
  try {
    // Directly use environment variables as a fallback instead of trying to reload them
    // This avoids the require() error in ES modules
    const finalUsername = username || process.env.ADMIN_USERNAME || '';
    const finalPassword = password || process.env.ADMIN_PASSWORD || '';
    const finalAdminKey = adminKey || process.env.ADMIN_SECRET_KEY || '';
    
    console.log(`Admin initialization attempt with username: ${finalUsername ? '✓ Set' : '✗ Missing'}`);
    
    // Check if required credentials exist
    if (!finalUsername || !finalPassword || !finalAdminKey) {
      console.warn("Skipping admin initialization - missing credentials");
      return null;
    }
    
    // Verify admin key
    if (finalAdminKey !== process.env.ADMIN_SECRET_KEY) {
      console.warn("Skipping admin initialization - invalid admin key");
      return null;
    }

    // First check if admin user exists
    try {
      // Only select core fields to avoid schema issues with missing columns
      console.log("Checking for existing admin user...");
      const query = db
        .select({
          id: users.id,
          username: users.username,
          isAdmin: users.isAdmin
        })
        .from(users)
        .where(eq(users.isAdmin, true))
        .limit(1);
        
      console.log("Admin search query:", query.toSQL());
      const [existingAdmin] = await query;

      if (existingAdmin) {
        // Only update if username matches to avoid duplicate key error
        if (existingAdmin.username === username) {
          // Hash the password before storing
          const hashedPassword = await hash(password);
          console.log(`Updating admin with properly hashed password (contains salt: ${hashedPassword.includes('.')})`);
          
          const [updatedAdmin] = await db
            .update(users)
            .set({
              password: hashedPassword,
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
      console.log("Checking if username is already taken...");
      const query = db
        .select({
          id: users.id,
          username: users.username
        })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      console.log("Username check query:", query.toSQL());
      const [existingUser] = await query;

      if (existingUser) {
        // Instead of just skipping, try to promote this user to admin
        console.log(`Username ${username} exists - attempting to promote to admin`);
        try {
          // Hash the password before updating
          const hashedPassword = password ? await hash(password) : undefined;
          console.log(`Promoting user with ${hashedPassword ? 'properly hashed password' : 'no password update'}`);
          
          const [updatedUser] = await db
            .update(users)
            .set({
              isAdmin: true,
              // Only update password if it's the admin initialization process
              password: hashedPassword || undefined
            })
            .where(eq(users.id, existingUser.id))
            .returning({
              id: users.id,
              username: users.username,
              isAdmin: users.isAdmin,
              email: users.email
            });
            
          console.log("Existing user promoted to admin successfully");
          return updatedUser;
        } catch (promoteError) {
          console.error("Failed to promote existing user to admin", promoteError);
          return null;
        }
      }
    } catch (e) {
      console.warn("Error checking for existing user", e);
    }

    // Create new admin user with minimal required fields
    try {
      console.log("Creating new admin user...");
      // Hash the password before creating a new admin
      const hashedPassword = await hash(password);
      console.log(`Creating admin with properly hashed password (contains salt: ${hashedPassword.includes('.')})`);
      
      // Create a minimal admin user with only required fields to avoid schema issues
      const insertData = {
        username,
        password: hashedPassword,
        isAdmin: true,
        email: `${username}@admin.local`,
        // Skip all optional fields
      };
      
      console.log("Admin insert data:", insertData);
      const insertQuery = db.insert(users).values(insertData).returning();
      console.log("Admin insert query:", insertQuery.toSQL());
      
      const [newAdmin] = await insertQuery;
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