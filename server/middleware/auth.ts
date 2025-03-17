import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../config/auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { users } from "@db/schema";
import { type SessionData } from "express-session";
import passport from "passport";

// Extend Express Request type with Session
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: typeof users.$inferSelect;
      logIn(user: Express.User, done: (err: any) => void): void;
      logOut(done: (err: any) => void): void;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }
  next();
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.isAuthenticated() || !req.user?.isAdmin) {
    return res.status(401).json({
      status: "error",
      message: "Admin access required",
    });
  }
  next();
};
