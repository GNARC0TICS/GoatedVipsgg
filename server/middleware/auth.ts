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
  console.log('[Auth Middleware] Starting auth check for path:', req.path);

  try {
    const token = extractToken(req);
    console.log('[Auth Middleware] Token present:', !!token);

    if (!token) {
      console.log('[Auth Middleware] No token found');
      return res.status(401).json({ 
        message: ERROR_MESSAGES.AUTH_REQUIRED,
        isAuthenticated: false,
        debug: { path: req.path, headers: req.headers }
      });
    }

    console.log('[Auth Middleware] Validating token');
    const user = await validateAndGetUser(token);
    console.log('[Auth Middleware] User found:', !!user);

    if (!user) {
      console.log('[Auth Middleware] No user found for token');
      return res.status(401).json({ 
        message: ERROR_MESSAGES.USER_NOT_FOUND,
        isAuthenticated: false,
        debug: { 
          tokenPresent: true,
          tokenDecoded: decoded,
          userLookupAttempted: true
        }
      });
    }

    req.user = user;
    console.log('[Auth Middleware] Auth successful for user:', user.id);
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(401).json({ 
      message: ERROR_MESSAGES.INVALID_TOKEN,
      isAuthenticated: false,
      debug: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);
    if (token) {
      const user = await validateAndGetUser(token);
      if (user) {
        req.user = user;
      }
    }
    // Add debugging log
    console.log(`[Auth Debug] User state:`, {
      hasToken: !!token,
      hasUser: !!req.user,
      path: req.path
    });
    next();
  } catch (error) {
    // Don't fail on auth errors for optional auth
    console.log(`[Auth Debug] Optional auth error:`, error);
    next();
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