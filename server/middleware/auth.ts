import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../config/auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { users, SelectUser } from "@db/schema/index";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: SelectUser;
    }
  }
}

// Helper middleware to check authentication status
export function isAuthenticated(req: Request): boolean {
  return !!req.user;
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check for session token in cookie first
    const sessionToken = req.cookies?.token;
    // Fallback to Bearer token if no session
    const authHeader = req.headers.authorization;
    const token =
      sessionToken ||
      (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = verifyToken(token);
    
    // Check if this is a standard authentication (userId) or admin authentication (id)
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // For admin routes, verify admin status
    if (decoded.isAdmin && !user.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid authentication token" });
  }
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await requireAuth(req, res, () => {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    });
  } catch (error) {
    return res.status(403).json({ message: "Admin access required" });
  }
};
