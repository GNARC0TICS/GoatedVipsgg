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
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const scryptAsync = promisify(scrypt);

// JWT secret key - in production this should be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Rate limiter for registration
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 60, // per hour
});

// Token verification function
export const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      username: string;
      email: string;
      isAdmin: boolean;
      createdAt: string;
    };
    return decoded;
  } catch (error) {
    return null;
  }
};

// Generate token for testing
export const generateTestToken = (isAdmin: boolean = false) => {
  return jwt.sign({ 
    id: 1,
    username: 'test',
    email: 'test@example.com',
    isAdmin,
    createdAt: new Date().toISOString()
  }, JWT_SECRET, { expiresIn: '1h' });
};

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
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "goated-rewards",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = { secure: true };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Session configuration
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
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        if (!username || !password) {
          return done(null, false, { message: "Username and password are required" });
        }

        // Sanitize credentials
        const sanitizedUsername = username.trim();
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
        const isMatch = await crypto.compare(sanitizedPassword, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Non-blocking authentication middleware
  const optionalAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        const userData = await verifyToken(token);
        if (userData) {
          (req as any).user = userData;
        }
      }
      next();
    } catch (error) {
      next();
    }
  };

  app.post("/api/register", async (req, res, next) => {
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
      const ipAddress = req.ip;
      try {
        await rateLimiter.consume(ipAddress);
      } catch (error) {
        return res.status(429).json({
          status: "error",
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
          status: "error",
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
          status: "error",
          message: "Email already registered",
        });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          isAdmin: false,
        })
        .returning();

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          isAdmin: newUser.isAdmin,
          createdAt: newUser.createdAt.toISOString()
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.json({
          status: "success",
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
            createdAt: newUser.createdAt,
          },
          token,
        });
      });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(400).json({
          status: "error",
          message: "Username or email already exists",
        });
      }
      if (error.errors) {
        return res.status(400).json({ 
          ok: false,
          message: "Validation failed",
          errors: error.errors
        });
      }
      return res.status(400).json({ 
        ok: false,
        message: error.message || "Invalid request",
      });
    }
  });

  app.post("/api/login", express.json(), (req, res, next) => {
    if (!req.body || !req.body.username || !req.body.password) {
      return res.status(400).json({
        status: "error",
        message: "Username and password are required"
      });
    }

    passport.authenticate(
      "local",
      (err: any, user: Express.User | false, info: IVerifyOptions) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            status: "error",
            message: "Internal server error",
          });
        }

        if (!user) {
          return res.status(401).json({
            ok: false,
            status: "error",
            message: info.message ?? "Invalid credentials",
          });
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          // Generate JWT token
          const token = jwt.sign(
            { 
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: user.isAdmin,
              createdAt: user.createdAt.toISOString()
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

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
            token,
          });
        });
      },
    )(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
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

  app.get("/api/user", optionalAuth, (req, res) => {
    if (req.isAuthenticated() || req.user) {
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      });
    }
    res.status(401).json({
      status: "error",
      message: "Not logged in",
    });
  });

  // Add the optional auth middleware to all routes
  app.use(optionalAuth);
}