
import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../config/auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { users } from "@db/schema";

// Type definitions
declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
    }
  }
}

// Constants
const ERROR_MESSAGES = {
  AUTH_REQUIRED: "Authentication required",
  INVALID_TOKEN: "Invalid authentication token",
  USER_NOT_FOUND: "User not found"
} as const;

/**
 * Authentication middleware
 * Verifies user token and attaches user to request
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ message: ERROR_MESSAGES.AUTH_REQUIRED });
    }

    const user = await validateAndGetUser(token);
    
    if (!user) {
      return res.status(401).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: ERROR_MESSAGES.INVALID_TOKEN });
  }
};

/**
 * Extract token from request
 * Checks both cookie and Authorization header
 */
function extractToken(req: Request): string | null {
  const sessionToken = req.cookies?.token;
  const authHeader = req.headers.authorization;
  return sessionToken || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);
}

/**
 * Validate token and fetch associated user
 */
async function validateAndGetUser(token: string) {
  const decoded = verifyToken(token);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, decoded.userId))
    .limit(1);
  
  return user;
}
