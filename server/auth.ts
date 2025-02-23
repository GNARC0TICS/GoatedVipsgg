import { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "@db";
import { users, type SelectUser } from "@db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import connectPg from "connect-pg-simple";
import { log } from "./vite";

const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

// Simple rate limiter for auth attempts
const authLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 15, // 15 minutes
});

// Password utilities
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashedPassword, salt] = stored.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  } catch (error) {
    log(`[Auth] Password comparison error: ${error}`);
    return false;
  }
}

export function setupAuth(app: Express) {
  log("[Auth] Setting up authentication middleware...");

  // Session configuration with PostgreSQL store
  const sessionStore = new PostgresSessionStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
    },
    createTableIfMissing: true,
    tableName: 'user_sessions'
  });

  // Log session store setup
  sessionStore.on('error', (error) => {
    log(`[Auth] Session store error: ${error.message}`);
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "development_secret_key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: 'lax'
      }
    })
  );

  log("[Auth] Session middleware configured");

  app.use(passport.initialize());
  app.use(passport.session());

  // User serialization
  passport.serializeUser((user: Express.User, done) => {
    log(`[Auth] Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`[Auth] Deserializing user: ${id}`);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        log(`[Auth] User not found during deserialization: ${id}`);
        return done(null, false);
      }

      const { password: _, ...safeUser } = user;
      done(null, safeUser);
    } catch (error) {
      log(`[Auth] Error deserializing user: ${error}`);
      done(error);
    }
  });

  // Local strategy setup with enhanced logging
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`[Auth] Attempting authentication for user: ${username}`);

        // Rate limiting check
        try {
          await authLimiter.consume(username);
        } catch (error) {
          log(`[Auth] Rate limit exceeded for user: ${username}`);
          return done(null, false, { message: "Too many attempts. Please try again later." });
        }

        // Find user and verify password
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username.toLowerCase()))
          .limit(1);

        if (!user) {
          log(`[Auth] User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          log(`[Auth] Invalid password for user: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        log(`[Auth] Successfully authenticated user: ${username}`);
        const { password: _, ...safeUser } = user;
        return done(null, safeUser);
      } catch (error) {
        log(`[Auth] Authentication error: ${error}`);
        return done(error);
      }
    })
  );

  log("[Auth] Authentication setup completed");
}

// Export password utilities for use in user routes
export { hashPassword, comparePasswords };