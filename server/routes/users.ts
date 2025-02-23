import { Router } from "express";
import { db } from "@db";
import { users, type SelectUser, type InsertUser } from "@db/schema";
import { like, desc, eq } from "drizzle-orm";
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from "zod";
import { createTransport } from 'nodemailer';
import { supportTickets } from "@db/schema/challenges";
import passport from "passport";
import { hashPassword } from "../auth";
import { log } from "../vite";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Rate limiter middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication routes
router.post("/register", loginLimiter, async (req, res) => {
  try {
    log("[Users] Registration attempt");
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if username already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      log(`[Users] Registration failed: Username ${username} already exists`);
      return res.status(400).json({ error: "Username already exists" });
    }

    // Create new user
    const [user] = await db.insert(users)
      .values({
        username: username.toLowerCase(),
        password: await hashPassword(password),
        email: email.toLowerCase(),
        isAdmin: false,
        createdAt: new Date(),
        emailVerified: false
      })
      .returning();

    log(`[Users] User registered successfully: ${username}`);

    // Log in the user after registration
    req.login(user, (err) => {
      if (err) {
        log(`[Users] Login after registration failed: ${err}`);
        return res.status(500).json({ error: "Failed to login after registration" });
      }
      const { password: _, ...safeUser } = user;
      return res.status(201).json({ user: safeUser });
    });
  } catch (error) {
    log(`[Users] Registration error: ${error}`);
    res.status(500).json({ error: "Failed to register user" });
  }
});

router.post("/login", loginLimiter, passport.authenticate("local"), (req, res) => {
  log(`[Users] Login successful: ${req.user?.username}`);
  res.json({ user: req.user });
});

router.post("/logout", (req, res) => {
  const username = req.user?.username;
  req.logout((err) => {
    if (err) {
      log(`[Users] Logout error for ${username}: ${err}`);
      return res.status(500).json({ error: "Logout failed" });
    }
    log(`[Users] Logout successful: ${username}`);
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    log("[Users] Unauthenticated user request");
    return res.status(401).json({ error: "Not authenticated" });
  }
  log(`[Users] Current user request: ${req.user?.username}`);
  res.json({ user: req.user });
});

// User search endpoint with proper type checking
router.get("/search", async (req, res) => {
  const { username } = req.query;
  const isAdminView = req.headers['x-admin-view'] === 'true';

  if (typeof username !== "string" || username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }

  try {
    const results = await db
      .select()
      .from(users)
      .where(like(users.username, `%${username}%`))
      .orderBy(desc(users.createdAt))
      .limit(10);

    const mappedResults = results.map((user: ExtendedUser) => {
      const baseUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      };

      if (isAdminView && isExtendedUser(user)) {
        return {
          ...baseUser,
          telegramId: user.telegramId,
          lastLoginIp: user.lastLoginIp,
          registrationIp: user.registrationIp,
          country: user.country,
          city: user.city,
          lastActive: user.lastActive,
          ipHistory: user.ipHistory || [],
          loginHistory: user.loginHistory || [],
          twoFactorEnabled: user.twoFactorEnabled,
          suspiciousActivity: user.suspiciousActivity,
          activityLogs: user.activityLogs || [],
        };
      }

      return baseUser;
    });

    res.json(mappedResults);
  } catch (error) {
    console.error("Error in user search:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// Profile image handling route
router.post('/profile/image', upload.single('image'), async (req, res) => {
  try {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    // TODO: Implement image processing and storage
    res.json({ message: 'Image upload successful' });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Configure email transport
const emailTransport = createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.SUPPORT_EMAIL,
    pass: process.env.SUPPORT_EMAIL_PASSWORD
  }
});

// Support email response endpoint
router.post("/support/email/respond", async (req, res) => {
  const { userEmail, subject, message, ticketId } = req.body;

  if (!userEmail || !message) {
    return res.status(400).json({ error: "Email and message are required" });
  }

  try {
    await emailTransport.sendMail({
      from: process.env.SUPPORT_EMAIL,
      to: userEmail,
      subject: `Re: ${subject || 'Support Ticket #' + ticketId}`,
      html: getEmailTemplate(message)
    });

    // Update ticket status if ticketId provided
    if (ticketId) {
      await db.update(supportTickets)
        .set({ status: 'responded' })
        .where(eq(supportTickets.id, ticketId));
    }

    res.json({ success: true, message: "Support response sent successfully" });
  } catch (error) {
    console.error("Failed to send support email:", error);
    res.status(500).json({ error: "Failed to send support email" });
  }
});

// User preferences route
router.put('/api/profile/preferences', async (req, res) => {
    try {
        const { preferences } = req.body;
        // Update user preferences in the database
        await updateUserPreferences(req.user.id, preferences); 
        res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
        console.error("Preference update error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Added quick stats endpoint without authentication
router.get('/users/:userId/quick-stats', async (req, res) => {
    const userId = req.params.userId;
    try {
        const user = await db.select().from(users).where(users.id.equals(userId)).limit(1).then(r => r[0]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        //Return relevant user data (customize as needed)
        res.json({ username: user.username,  email: user.email,  createdAt: user.createdAt });
    } catch (error) {
        console.error("Error fetching quick stats:", error);
        res.status(500).json({ error: 'Failed to fetch quick stats' });
    }
});


// Helper functions
function getEmailTemplate(message: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <img src="${process.env.SITE_URL}/images/Goated%20Logo%20-%20Yellow.png" alt="GoatedVIPs Logo" style="max-width: 200px; margin-bottom: 20px;"/>
      <div style="padding: 20px; background: #1A1B21; color: #ffffff; border-radius: 8px;">
        ${message}
      </div>
      <p style="color: #8A8B91; font-size: 12px; margin-top: 20px;">
        This is a response to your support inquiry. If you need further assistance, please reply to this email.
      </p>
    </div>
  `;
}

async function updateUserPreferences(userId: number, preferences: Record<string, any>) {
  // Implement user preference update logic
  await db.update(users)
    .set({ preferences })
    .where(eq(users.id, userId));
}

// Extended user interface to include all properties
interface ExtendedUser extends SelectUser {
  lastLoginIp?: string;
  registrationIp?: string;
  country?: string;
  city?: string;
  lastActive?: Date;
  ipHistory?: string[];
  loginHistory?: any[];
  twoFactorEnabled?: boolean;
  suspiciousActivity?: boolean;
  activityLogs?: any[];
}

// Type guard for ExtendedUser
function isExtendedUser(user: any): user is ExtendedUser {
  return user && typeof user.id === 'number';
}

export default router;