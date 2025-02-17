import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import express from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Resend } from 'resend'

const scryptAsync = promisify(scrypt);

// Rate limiter for registration and login attempts
const authLimiter = new RateLimiterMemory({
  points: 20, // 20 attempts
  duration: 60 * 5, // per 5 minutes
  blockDuration: 60 * 2, // Block for 2 minutes
});

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  // Session serialization
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      // Handle anonymous users
      if (id === -1) {
        return done(null, { id: -1, isAnonymous: true });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        // If user not found, treat as anonymous
        return done(null, { id: -1, isAnonymous: true });
      }

      done(null, user);
    } catch (error) {
      console.error("Deserialize error:", error);
      // On error, default to anonymous user
      done(null, { id: -1, isAnonymous: true });
    }
  });

  // Local strategy setup with more relaxed authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // For admin login
        if (username === process.env.ADMIN_USERNAME) {
          if (password === process.env.ADMIN_PASSWORD) {
            return done(null, {
              id: 1,
              username: process.env.ADMIN_USERNAME,
              isAdmin: true,
              email: `${process.env.ADMIN_USERNAME}@admin.local`,
              password: '',
              telegramId: null,
              telegramVerified: null,
              createdAt: new Date(),
              emailVerified: true
            });
          } else {
            return done(null, false, { message: "Invalid admin password" });
          }
        }

        // Allow anonymous access if no credentials
        if (!username || !password) {
          return done(null, { id: -1, isAnonymous: true });
        }

        // Sanitize credentials for non-admin users
        const sanitizedUsername = username.trim().toLowerCase();
        const sanitizedPassword = password.trim();

        if (!sanitizedUsername || !sanitizedPassword) {
          return done(null, { id: -1, isAnonymous: true });
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, sanitizedUsername))
          .limit(1);

        if (!user) {
          return done(null, { id: -1, isAnonymous: true });
        }

        const isMatch = await comparePasswords(sanitizedPassword, user.password);
        if (!isMatch) {
          return done(null, { id: -1, isAnonymous: true });
        }

        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(null, { id: -1, isAnonymous: true });
      }
    }),
  );

  // Registration endpoint remains unchanged
  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const errors = result.error.issues.map((i) => i.message).join(", ");
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors,
        });
      }

      // Rate limiting check
      try {
        await authLimiter.consume(req.ip || 'unknown');
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
      req.login(newUser, (err) => {
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
      return res.status(500).json({
        status: "error",
        message: "Registration failed",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Login endpoint with relaxed authentication
  app.post("/api/login", async (req, res, next) => {
    try {
      await authLimiter.consume(req.ip || 'unknown');
    } catch (error) {
      return res.status(429).json({
        status: "error",
        message: "Too many login attempts. Please try again later.",
      });
    }

    passport.authenticate(
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
          // Instead of failing, create an anonymous session
          req.login({ id: -1, isAnonymous: true }, (err) => {
            if (err) {
              console.error("Anonymous login error:", err);
              return next(err);
            }
            return res.json({
              status: "success",
              message: "Anonymous access granted",
              user: { id: -1, isAnonymous: true }
            });
          });
          return;
        }

        req.login(user, (err) => {
          if (err) {
            console.error("Login error:", err);
            return next(err);
          }

          return res.json({
            status: "success",
            message: "Login successful",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: user.isAdmin,
              createdAt: user.createdAt,
            },
          });
        });
      },
    )(req, res, next);
  });

  // Logout endpoint with anonymous fallback
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({
          status: "error",
          message: "Logout failed",
        });
      }

      // After logout, create an anonymous session
      req.login({ id: -1, isAnonymous: true }, (err) => {
        if (err) {
          console.error("Anonymous session creation error:", err);
          return res.status(500).json({
            status: "error",
            message: "Failed to create anonymous session",
          });
        }

        res.json({
          status: "success",
          message: "Logged out successfully",
        });
      });
    });
  });

  // Get current user endpoint with anonymous support
  app.get("/api/user", (req, res) => {
    const user = req.user || { id: -1, isAnonymous: true };
    res.json({
      status: "success",
      data: user.isAnonymous ?
        { id: -1, isAnonymous: true } :
        {
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