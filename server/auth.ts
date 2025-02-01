import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import express from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const scryptAsync = promisify(scrypt);

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 60, // per hour
});

// Crypto utilities
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64,
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  // Session configuration with secure settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "goated-rewards",
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  // Middleware setup
  app.use(express.json());
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Local strategy setup
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        if (!username || !password) {
          return done(null, false, { message: "Username and password are required" });
        }

        // Sanitize credentials
        username = username.trim();
        password = password.trim();

        if (!username || !password) {
          return done(null, false, { message: "Username and password cannot be empty" });
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Update last login timestamp
        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Authentication endpoints
  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          ok: false,
          message: "Validation failed",
          errors: result.error.issues.map((i) => i.message),
        });
      }

      // Rate limiting check
      try {
        await rateLimiter.consume(req.ip || req.socket.remoteAddress || '');
      } catch (err) {
        return res.status(429).json({
          ok: false,
          message: "Too many registration attempts. Please try again later.",
        });
      }

      const { username, password, email } = result.data;

      // Check for existing username
      const [existingUsername] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUsername) {
        return res.status(400).json({
          ok: false,
          message: "Username already exists",
        });
      }

      // Check for existing email
      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail) {
        return res.status(400).json({
          ok: false,
          message: "Email already registered",
        });
      }

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: await crypto.hash(password),
          email,
          isAdmin: false,
        })
        .returning();

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Failed to login after registration",
          });
        }
        return res.status(201).json({
          ok: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
          },
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        message: error.message || "Registration failed",
      });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      await rateLimiter.consume(req.ip || req.socket.remoteAddress || '');
    } catch (err) {
      return res.status(429).json({
        ok: false,
        message: "Too many login attempts. Please try again later.",
      });
    }

    passport.authenticate(
      "local",
      (err: any, user: Express.User | false, info: IVerifyOptions) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Internal server error",
          });
        }

        if (!user) {
          return res.status(401).json({
            ok: false,
            message: info.message ?? "Invalid credentials",
          });
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          return res.status(200).json({
            ok: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: user.isAdmin,
            },
          });
        });
      },
    )(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Logout failed",
        });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Session destruction failed",
          });
        }
        res.clearCookie('sid');
        res.status(200).json({
          ok: true,
          message: "Logged out successfully",
        });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      return res.status(200).json({
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });
    }
    res.status(401).json({
      ok: false,
      message: "Not authenticated",
    });
  });
}