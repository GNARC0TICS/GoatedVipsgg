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

const scryptAsync = promisify(scrypt);

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

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Validate and sanitize credentials
        const sanitizedUsername = username?.trim();
        const sanitizedPassword = password?.trim();
        
        if (!sanitizedUsername || !sanitizedPassword) {
          return done(null, false, { message: "Username and password are required" });
        }

        // Trim whitespace
        username = username.trim();
        password = password.trim();

        if (!username || !password) {
          return done(null, false, { message: "Username and password cannot be empty" });
        }

        // Check if this is an admin login attempt
        if (username === process.env.ADMIN_USERNAME && 
            password === process.env.ADMIN_PASSWORD) {
          const [adminUser] = await db
            .select()
            .from(users)
            .where(eq(users.isAdmin, true))
            .limit(1);

          if (adminUser) {
            return done(null, adminUser);
          }
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
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
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
    } catch (err) {
      done(err);
    }
  });

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
      const registrationAttempts = await rateLimiter.get(ipAddress);
      if (registrationAttempts > 5) {
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
          return next(err);
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
      // Handle database-level errors
      if (error.code === "23505") {
        // Unique constraint violation
        return res.status(400).json({
          status: "error",
          message: "Username or email already exists",
        });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({
        status: "error",
        message: "Username and password are required"
      });
    }

    passport.authenticate(
      "local",
      (err: any, user: Express.User | false, info: IVerifyOptions) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.status(400).json({
            status: "error",
            message: info.message ?? "Login failed",
          });
        }

        req.logIn(user, (err) => {
          if (err) {
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