import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../config/auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { users } from "@db/schema";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
    }
  }
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
    const token = sessionToken || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = verifyToken(token);

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
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
      if (!req.user?.isAdmin && req.user?.username !== process.env.ADMIN_USERNAME) {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    });
  } catch (error) {
    return res.status(403).json({ message: "Admin access required" });
  }
};