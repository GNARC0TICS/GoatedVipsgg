
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
    const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

// Session configuration
const configureSession = (app: Express) => {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "goated-rewards",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({ checkPeriod: 86400000 }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = { secure: true };
  }

  return sessionSettings;
};

// Passport configuration
const configurePassport = () => {
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) return done(null, false, { message: "Incorrect username." });
      
      const isMatch = await crypto.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: "Incorrect password." });
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

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
};

// Authentication routes
const setupAuthRoutes = (app: Express) => {
  app.post("/api/register", handleRegister);
  app.post("/api/login", handleLogin);
  app.post("/api/logout", handleLogout);
  app.get("/api/user", handleGetUser);
};

const handleRegister = async (req: any, res: any, next: any) => {
  try {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
    }

    const { username, password } = result.data;
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) return res.status(400).send("Username already exists");

    const hashedPassword = await crypto.hash(password);
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        isAffiliate: false,
      })
      .returning();

    req.login(newUser, (err: any) => {
      if (err) return next(err);
      return res.json({
        message: "Registration successful",
        user: { id: newUser.id, username: newUser.username },
      });
    });
  } catch (error) {
    next(error);
  }
};

const handleLogin = (req: any, res: any, next: any) => {
  const result = insertUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
  }

  passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
    if (err) return next(err);
    if (!user) return res.status(400).send(info.message ?? "Login failed");

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({
        message: "Login successful",
        user: { id: user.id, username: user.username },
      });
    });
  })(req, res, next);
};

const handleLogout = (req: any, res: any) => {
  req.logout((err: any) => {
    if (err) return res.status(500).send("Logout failed");
    res.json({ message: "Logout successful" });
  });
};

const handleGetUser = (req: any, res: any) => {
  if (req.isAuthenticated()) return res.json(req.user);
  res.status(401).send("Not logged in");
};

export function setupAuth(app: Express) {
  const sessionSettings = configureSession(app);
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  configurePassport();
  setupAuthRoutes(app);
}
