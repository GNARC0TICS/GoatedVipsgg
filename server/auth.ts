/// <reference path="../custom-modules.d.ts" />

import passport from "passport";
import type { IVerifyOptions } from "passport-local";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { Resend } from "resend";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logError, logAction } from "./utils/logger";

const scryptAsync = promisify(scrypt);

// Rate limiter for registration and login attempts
const authLimiter = new RateLimiterMemory({
  points: 20, // 20 attempts
  duration: 60 * 5, // per 5 minutes
  blockDuration: 60 * 2, // Block for 2 minutes
});

// Type alias for Express.User from augmented global namespace
type ExpressUser = Express.User;

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      isAdmin?: boolean;
      email: string;
      createdAt?: Date;
    }
  }
}

export function setupAuth(app: Express) {
  // Added session middleware configuration
  app.use(session({ secret: process.env.SESSION_SECRET || "keyboard cat", resave: false, saveUninitialized: false }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Session serialization
  passport.serializeUser((user: ExpressUser, done: (err: any, id?: number) => void) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done: (err: any, user?: ExpressUser) => void) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Local strategy setup
  passport.use(
    new LocalStrategy(async (username: string, password: string, done: (err: any, user?: ExpressUser | false, info?: IVerifyOptions) => void) => {
      try {
        // For admin login
        if (username === process.env.ADMIN_USERNAME) {
          if (password === process.env.ADMIN_PASSWORD) {
            return done(null, {
              id: 1,
              username: process.env.ADMIN_USERNAME,
              isAdmin: true,
              email: `${process.env.ADMIN_USERNAME}@admin.local`
            });
          } else {
            logError("Admin login failed: incorrect password", { username });
            return done(null, false, { message: "Invalid admin password" });
          }
        }

        if (!username || !password) {
          return done(null, false, { message: "Username and password are required" });
        }

        // Sanitize credentials for non-admin users
        const sanitizedUsername = username.trim().toLowerCase();
        const sanitizedPassword = password.trim();

        if (!sanitizedUsername || !sanitizedPassword) {
          return done(null, false, { message: "Username and password cannot be empty" });
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, sanitizedUsername))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isMatch = await comparePasswords(sanitizedPassword, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Registration endpoint
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        logError("Validation error during registration", result.error);
        const errors = result.error.issues.map((i: any) => i.message).join(", ");
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors,
        });
      }

      // Rate limiting check
      const xForwarded = req.headers['x-forwarded-for'] as string | undefined;
      const ip = typeof req.ip === 'string' ? req.ip : 'unknown';
      const rateLimitKey = xForwarded || ip || 'unknown';
      try {
        await authLimiter.consume(rateLimitKey);
      } catch (error) {
        return res.status(429).json({
          status: "error",
          message: "Too many attempts. Please try again later.",
        });
      }

      const { username, password, email } = result.data;
      const sanitizedUsername = username.trim().toLowerCase();

      // Check for existing username
      const [existingUsername] = await db
        .select()
        .from(users)
        .where(eq(users.username, sanitizedUsername))
        .limit(1);

      if (existingUsername) {
        return res.status(400).json({
          status: "error",
          message: "Username already exists",
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with email verification token
      const emailVerificationToken = randomBytes(32).toString('hex');
      const [newUser] = await db
        .insert(users)
        .values({
          username: sanitizedUsername,
          password: hashedPassword,
          email: email.toLowerCase(),
          isAdmin: false,
          emailVerificationToken,
          emailVerified: false,
        })
        .returning();

      // Send verification email
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'noreply@goatedvips.gg',
        to: email.toLowerCase(),
        subject: 'Verify your GoatedVIPs account',
        html: `
          <h1>Welcome to GoatedVIPs!</h1>
          <p>Click the link below to verify your email address:</p>
          <a href="${process.env.APP_URL}/verify-email/${emailVerificationToken}">
            Verify Email
          </a>
        `
      });

      // Log user in after registration
      req.login(newUser, (err: any) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({
            status: "error",
            message: "Registration successful but login failed",
          });
        }

        return res.status(201).json({
          status: "success",
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
            createdAt: newUser.createdAt,
          },
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      logError("Registration error", error);
      return res.status(500).json({
        status: "error",
        message: "Registration failed",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Login endpoint with rate limiting
  app.post("/api/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const xForwarded = req.headers['x-forwarded-for'] as string | undefined;
      const ip = typeof req.ip === 'string' ? req.ip : 'unknown';
      const rateLimitKey = xForwarded || ip || 'unknown';
      await authLimiter.consume(rateLimitKey);
    } catch (error) {
      return res.status(429).json({
        status: "error",
        message: "Too many login attempts. Please try again later.",
      });
    }

    if (!req.body?.username || !req.body?.password) {
      return res.status(400).json({
        status: "error",
        message: "Username and password are required"
      });
    }

    const authHandler = passport.authenticate(
      "local",
      (err: any, user: Express.User | false, info: IVerifyOptions) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.status(500).json({
            status: "error",
            message: "Internal server error",
          });
        }

        if (!user) {
          return res.status(401).json({
            status: "error",
            message: info.message ?? "Invalid credentials",
          });
        }

        req.login(user, (err: any) => {
          if (err) {
            console.error("Login error:", err);
            return next(err);
          }

          return res.json({
            status: "success",
            message: "Login successful",
          });
        });
      }
    ) as (req: Request, res: Response, next: NextFunction) => void;

    authHandler(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    // Allow logout even if not authenticated
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({
          status: "error",
          message: "Logout failed",
        });
      }

      res.clearCookie('token');
      res.clearCookie('connect.sid');

      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({
            status: "error",
            message: "Logout failed",
          });
        }

        res.json({
          status: "success",
          message: "Logout successful",
        });
      });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        status: "error",
        message: "Not logged in",
      });
    }

    const user = req.user;
    res.json({
      status: "success",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      }
    });
  });
}

// Password utilities
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(
    supplied,
    salt,
    64,
  )) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}