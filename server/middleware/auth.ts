import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token-manager";
import { db } from "@db/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { log } from "../vite";

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
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        message: "Authentication required",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({
        ok: false,
        message: "Invalid or expired token",
      });
    }

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .then((rows) => rows[0]);

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "User not found",
      });
    }

    // Attach user to request
    req.user = user;

    // Continue
    next();
  } catch (error) {
    log(`Authentication error: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "Authentication error",
    });
  }
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // First check if user is authenticated
    await requireAuth(req, res, () => {
      // Check if user is admin
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          ok: false,
          message: "Admin privileges required",
        });
      }

      // User is admin, continue
      next();
    });
  } catch (error) {
    log(`Admin authentication error: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "Authentication error",
    });
  }
};