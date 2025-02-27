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

// Set up rate limiter
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 min
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

        // Check if this is an admin login attempt
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (adminUsername && adminPassword && 
            sanitizedUsername === adminUsername && 
            sanitizedPassword === adminPassword) {

          // Create or update admin user
          let adminUser = await db
            .select()
            .from(users)
            .where(eq(users.username, adminUsername))
            .limit(1)
            .then(results => results[0]);

          if (!adminUser) {
            // Create new admin user
            [adminUser] = await db
              .insert(users)
              .values({
                username: adminUsername,
                password: await crypto.hash(adminPassword),
                email: 'admin@goatedvips.com',
                isAdmin: true,
              })
              .returning();
          }
          return done(null, adminUser);
        }

        // Regular user login
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

        // Update last login time
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

      // Apply rate limiting
      try {
        const ipAddress = req.ip || 'unknown';
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

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({
            status: "error",
            message: "Error logging in after registration",
          });
        }
        return res.json({
          status: "success",
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
          },
        });
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(500).json({ 
        status: "error",
        message: "Internal server error",
      });
    }
  });

  app.post("/api/login", express.json(), (req, res, next) => {
    try {
      if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).json({
          status: "error",
          message: "Username and password are required"
        });
      }

      // Validate and sanitize input 
      const username = String(req.body.username).trim();
      const password = String(req.body.password).trim();

      if (!username || !password) {
        return res.status(400).json({
          status: "error",
          message: "Username and password cannot be empty"
        });
      }

      passport.authenticate(
        "local",
        (err: any, user: Express.User | false, info: IVerifyOptions) => {
          if (err) {
            console.error('Login error:', err);
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

          req.logIn(user, (err) => {
            if (err) {
              console.error('Login session error:', err);
              return res.status(500).json({
                status: "error",
                message: "Error creating login session",
              });
            }

            // Update last login time
            db.update(users)
              .set({ lastLogin: new Date() })
              .where(eq(users.id, user.id))
              .then(() => {
                // Return user data after successful login
                return res.json({
                  status: "success",
                  message: "Login successful",
                  user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin,
                  },
                });
              })
              .catch(error => {
                // Still return success even if last login update fails
                console.error('Error updating last login:', error);
                return res.json({
                  status: "success",
                  message: "Login successful",
                  user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin,
                  },
                });
              });
          });
        },
      )(req, res, next);
    } catch (error) {
      console.error('Unexpected login error:', error);
      return res.status(500).json({
        status: "error",
        message: "An unexpected error occurred"
      });
    }
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

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      });
    }
    res.status(401).json({
      status: "error",
      message: "Not logged in",
    });
  });
}