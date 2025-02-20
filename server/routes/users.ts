import { Router } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import type { SelectUser } from "../db/schema";
import { like, desc } from "drizzle-orm";
import rateLimit from 'express-rate-limit';
import type { IpHistoryEntry, LoginHistoryEntry, ActivityLogEntry } from "../db/schema/users";

const router = Router();

// Rate limiter middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// User search endpoint with enhanced analytics for admins
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
      .orderBy(desc(users.lastActive))
      .limit(10);

    // Map results based on admin view access
    const mappedResults = results.map((user: SelectUser) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      // Only include sensitive data for admin view
      ...(isAdminView && {
        // Telegram related fields
        telegramId: user.telegramId,
        telegramVerifiedAt: user.telegramVerifiedAt,
        // Location and activity fields
        lastLoginIp: user.lastLoginIp,
        registrationIp: user.registrationIp,
        country: user.country,
        city: user.city,
        lastActive: user.lastActive,
        // Analytics fields
        ipHistory: (user.ipHistory || []) as IpHistoryEntry[],
        loginHistory: (user.loginHistory || []) as LoginHistoryEntry[],
        // Security fields
        twoFactorEnabled: user.twoFactorEnabled,
        suspiciousActivity: user.suspiciousActivity,
        activityLogs: (user.activityLogs || []) as ActivityLogEntry[]
      })
    }));

    res.json(mappedResults);
  } catch (error) {
    console.error("Error in user search:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// Authentication routes 
router.post("/login", loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        // Implement login logic here, including secure password handling
        // and potentially using JWT for authentication.
        const user = await authenticateUser(username, password); // Placeholder function
        if (user) {
            // Generate and send JWT or other authentication token
            const token = generateToken(user); // Placeholder function
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Profile image handling route
router.post('/api/profile/image', upload.single('image'), async (req, res) => {
    //Handle profile image upload.  Requires multer or similar middleware
    try {
        // Save image to storage (e.g., cloudinary, local storage)
        const imageUrl = await saveProfileImage(req.file); // Placeholder function
        res.json({ imageUrl });
    } catch (error) {
        console.error("Image upload error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User preferences route
router.put('/api/profile/preferences', async (req, res) => {
    try {
        const { preferences } = req.body;
        // Update user preferences in the database
        await updateUserPreferences(req.user.id, preferences); // Placeholder function
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


// Placeholder functions (replace with actual implementation)
async function authenticateUser(username, password) {
    // Implement authentication logic here
    return null; // Replace with user object or null if authentication fails
}

function generateToken(user) {
    // Implement JWT token generation or other authentication token generation here
    return null; // Replace with generated token
}

async function saveProfileImage(file) {
    // Implement image saving logic (e.g., cloudinary, local storage)
    return null; // Replace with image URL
}

async function updateUserPreferences(userId, preferences) {
    // Implement user preference update logic
    return null; // Replace with successful operation or error handling
}

function getVerificationEmailTemplate(verificationCode) {
    // Implement your themed email template generation here.  This should return an HTML string.
    // Example:
    return `<!DOCTYPE html>
    <html>
    <head>
        <title>Verification Email</title>
    </head>
    <body>
        <h1>Verify Your GoatedVIPs Account</h1>
        <p>Your verification code is: ${verificationCode}</p>
    </body>
    </html>`;
}


export default router;
import { createTransport } from 'nodemailer';

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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="${process.env.SITE_URL}/images/Goated%20Logo%20-%20Yellow.png" alt="GoatedVIPs Logo" style="max-width: 200px; margin-bottom: 20px;"/>
          <div style="padding: 20px; background: #1A1B21; color: #ffffff; border-radius: 8px;">
            ${message}
          </div>
          <p style="color: #8A8B91; font-size: 12px; margin-top: 20px;">
            This is a response to your support inquiry. If you need further assistance, please reply to this email.
          </p>
        </div>
      `
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