import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "db";
import * as schema from "../db/schema";
import { eq, sql } from "drizzle-orm";
import express from 'express';
// Import our password utilities from admin middleware
import { hash, verify } from "./middleware/admin";
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Extract what we need from schema to avoid import issues
const { users } = schema;
const insertUserSchema = schema.insertUserSchema;
type SelectUser = schema.SelectUser;

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
    // Make sure the password is properly formatted with salt
    if (!storedPassword || !storedPassword.includes('.')) {
      console.warn('Invalid password format in database, missing salt separator');
      return false;
    }
    
    const [hashedPassword, salt] = storedPassword.split(".");
    
    if (!hashedPassword || !salt) {
      console.warn('Invalid password format in database, missing hash or salt');
      return false;
    }
    
    try {
      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = (await scryptAsync(
        suppliedPassword,
        salt,
        64,
      )) as Buffer;
      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch (error) {
      console.error('Error comparing passwords:', error);
      return false;
    }
  },
};

// This is the structure we're actually using in our application
// It doesn't need all the fields from the database schema
interface AppUser {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  lastLogin?: Date | null;
  password?: string;
  // Add optional fields to prevent TypeScript errors
  goatedUid?: string | null;
  goatedUsername?: string | null;
  isGoatedVerified?: boolean;
  goatedVerifiedAt?: Date | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  isTelegramVerified?: boolean;
  telegramVerifiedAt?: Date | null;
}

// Tell TypeScript that our Express.User will have this structure
declare global {
  namespace Express {
    interface User extends AppUser {}
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
      console.log(`Deserializing user ID: ${id}`);
      // Be explicit about which columns we're selecting to avoid missing column errors
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          lastLogin: users.lastLogin
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!user) {
        console.warn(`Could not deserialize user with ID: ${id}`);
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error(`Error deserializing user: ${error}`);
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

        // Special handling for admin login
        if (adminUsername && adminPassword && sanitizedUsername === adminUsername) {
          // Admin authentication is handled internally by the verify function
          // It has special handling for matching against env variables

          // Create or update admin user
          console.log('Admin login attempt with username:', sanitizedUsername);
          
          // Only select the columns we know exist
          let adminUser = await db
            .select({
              id: users.id,
              username: users.username,
              password: users.password,
              email: users.email,
              isAdmin: users.isAdmin,
              createdAt: users.createdAt,
              lastLogin: users.lastLogin
            })
            .from(users)
            .where(eq(users.username, adminUsername))
            .limit(1)
            .then(results => results[0]);
            
          // Verify admin password
          if (adminUser) {
            // Verify the password using our unified verify function
            const isAdminPasswordValid = await verify(sanitizedPassword, adminUser.password);
            if (!isAdminPasswordValid && sanitizedPassword !== adminPassword) {
              console.log('Admin password mismatch');
              return done(null, false, { message: "Invalid username or password" });
            }
          }

          if (!adminUser) {
            console.log('Admin user not found, creating new admin...');
            // Create new admin user with hashed password
            const hashedPassword = await hash(adminPassword);
            console.log(`Creating admin with hashed password format: ${hashedPassword.includes('.') ? 'valid' : 'invalid'}`);
            
            [adminUser] = await db
              .insert(users)
              .values({
                username: adminUsername,
                password: hashedPassword,
                email: 'admin@goatedvips.com',
                isAdmin: true,
              })
              .returning({
                id: users.id,
                username: users.username,
                password: users.password,
                email: users.email,
                isAdmin: users.isAdmin,
                createdAt: users.createdAt,
                lastLogin: users.lastLogin
              });
            
            console.log('New admin user created successfully');
          } else {
            // Admin exists, but we should update the password if it doesn't match our format
            if (!adminUser.password || !adminUser.password.includes('.')) {
              console.log('Updating admin password to proper hashed format');
              const hashedPassword = await crypto.hash(adminPassword);
              
              [adminUser] = await db
                .update(users)
                .set({ 
                  password: hashedPassword,
                  lastLogin: new Date()
                })
                .where(eq(users.id, adminUser.id))
                .returning({
                  id: users.id,
                  username: users.username,
                  password: users.password,
                  email: users.email,
                  isAdmin: users.isAdmin,
                  createdAt: users.createdAt,
                  lastLogin: users.lastLogin
                });
            }
          }
          
          console.log('Admin login successful with environment variables');
          return done(null, adminUser);
        }

        // Regular user login
        console.log(`Regular login attempt for: ${sanitizedUsername}`);
        
        // Be explicit about which columns we select to avoid missing column errors
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            password: users.password,
            email: users.email,
            isAdmin: users.isAdmin,
            createdAt: users.createdAt,
            lastLogin: users.lastLogin
          })
          .from(users)
          .where(eq(users.username, sanitizedUsername))
          .limit(1);

        if (!user) {
          console.log(`User not found: ${sanitizedUsername}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        // Use the verify function from admin middleware for consistent password checking
        const isMatch = await verify(sanitizedPassword, user.password);
        if (!isMatch) {
          console.log(`Password mismatch for user: ${sanitizedUsername}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log(`Login successful for user: ${user.username}`);
        
        // Update last login time
        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        return done(null, user);
      } catch (err) {
        console.error('Authentication strategy error:', err);
        return done(err);
      }
    }),
  );

  app.post("/api/register", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          status: "error",
          message: "Missing request body",
        });
      }

      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((i: { message: string }) => i.message).join(", ");
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

      const { username, password, email } = validationResult.data;

      // Validate input data
      if (!username || !password || !email) {
        return res.status(400).json({
          status: "error",
          message: "Username, password, and email are required",
        });
      }

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

      // Hash the password using our shared utility function
      const hashedPassword = await hash(password);

      // Execute direct SQL query to avoid schema mismatches
      const queryResult = await db.execute(`
        INSERT INTO users (username, password, email, is_admin) 
        VALUES ('${username}', '${hashedPassword}', '${email}', false)
        RETURNING id, username, email, is_admin as "isAdmin", created_at as "createdAt", last_login as "lastLogin"
      `);
      
      // Extract user from query result
      const newUser = queryResult.rows[0];

      // Properly format the user object for login
      // Cast the database result to a properly formatted user object
      const formattedUser = {
        id: Number(newUser.id),
        username: String(newUser.username),
        email: String(newUser.email),
        isAdmin: Boolean(newUser.isadmin || newUser.isAdmin),
        // Handle different casing in property names from raw SQL
        createdAt: newUser.createdat ? new Date(String(newUser.createdat)) 
                  : newUser.createdAt ? new Date(String(newUser.createdAt))
                  : new Date(),
        lastLogin: new Date()
      };
      
      // Log the user in after registration
      req.login(formattedUser, (err) => {
        if (err) {
          console.error('Login after registration error:', err);
          return res.status(500).json({
            status: "error",
            message: "Registration successful but failed to log in. Please log in manually.",
          });
        }
        return res.json({
          status: "success",
          message: "Registration successful",
          user: {
            id: formattedUser.id,
            username: formattedUser.username,
            email: formattedUser.email,
            isAdmin: formattedUser.isAdmin,
          },
        });
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(500).json({ 
        status: "error",
        message: error.message || "Internal server error during registration",
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