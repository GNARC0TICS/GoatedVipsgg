import { Router } from 'express';
import { z } from 'zod';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

const goatedLinkSchema = z.object({
  goatedUsername: z.string(),
});

// Helper to create JWT token
const createToken = (userId: number) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Verify Telegram authentication
const verifyTelegramAuth = (authData: any) => {
  const { hash, ...data } = authData;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  // Create data check string
  const dataCheckArr = Object.keys(data)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n');

  // Create secret key
  const secretKey = crypto
    .createHash('sha256')
    .update(botToken)
    .digest();

  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckArr)
    .digest('hex');

  return calculatedHash === hash;
};

// Username availability check
router.get('/check-username', async (req, res) => {
  const username = req.query.username as string;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existingUser) {
    return res.status(409).json({ error: 'Username is already taken' });
  }

  res.json({ available: true });
});

// Email availability check
router.get('/check-email', async (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  res.json({ available: true });
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const token = createToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return user without sensitive data
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username or email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingEmail) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    // Hash password and create user
    const hashedPassword = await hash(password, 10);
    const result = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
    }).returning();

    const user = result[0];
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// Telegram authentication callback
router.post('/telegram/callback', async (req, res) => {
  try {
    const telegramData = telegramAuthSchema.parse(req.body);

    // Verify Telegram authentication
    if (!verifyTelegramAuth(telegramData)) {
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramData.id.toString()),
    });

    if (!user) {
      // Create new user
      const result = await db.insert(users).values({
        username: telegramData.username || `tg_${telegramData.id}`,
        password: await hash(crypto.randomBytes(32).toString('hex'), 10),
        email: `${telegramData.id}@telegram.user`,
        telegramId: telegramData.id.toString(),
        telegramVerified: true,
      }).returning();
      user = result[0];
    }

    // Create session
    const token = createToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return user without sensitive data
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(400).json({ error: 'Invalid Telegram authentication request' });
  }
});

// Link Goated account
router.post('/link-goated', async (req, res) => {
  try {
    const { goatedUsername } = goatedLinkSchema.parse(req.body);
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: number };

    // Update user with Goated username
    const result = await db
      .update(users)
      .set({
        goatedUsername,
        goatedVerified: true,
      })
      .where(eq(users.id, decoded.userId))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = result[0];
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Goated link error:', error);
    res.status(400).json({ error: 'Failed to link Goated account' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Get current user
router.get('/user', async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: number };
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Return user without sensitive data
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;