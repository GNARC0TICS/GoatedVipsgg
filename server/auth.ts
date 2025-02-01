import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import express from 'express';

const scryptAsync = promisify(scrypt);

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "session-secret",
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  // Set up basic middleware
  app.use(express.json());
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.serializeUser((user: any, done) => {
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

  // Simple local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const [hashedPassword, salt] = user.password.split(".");
        const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
        const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;

        const isMatch = timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Auth endpoints
  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          ok: false,
          message: "Invalid input",
        });
      }

      const { username, password, email } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          ok: false,
          message: "Username already exists",
        });
      }

      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      const [user] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          isAdmin: false,
        })
        .returning();

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Login after registration failed",
          });
        }

        res.status(201).json({
          ok: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        ok: false,
        message: "Registration failed",
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({
          ok: false,
          message: "Internal server error",
        });
      }

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: info?.message || "Invalid credentials",
        });
      }

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        res.json({
          ok: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({
        ok: true,
        message: "Already logged out",
      });
    }

    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Logout failed",
        });
      }

      res.json({
        ok: true,
        message: "Logged out successfully",
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        ok: false,
        message: "Not authenticated",
      });
    }

    const user = req.user as any;
    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  });
}