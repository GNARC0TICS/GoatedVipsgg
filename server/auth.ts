
import express from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAuth } from './middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6)
});

// Auth service with core functionality
export const authService = {
  async register(username: string, password: string, email: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        isAdmin: false,
      })
      .returning();
    return user;
  },

  async login(username: string, password: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid password');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { user, token };
  }
};

// Setup auth routes
export function setupAuth(app: express.Express) {
  app.post('/api/register', async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: result.error.issues
        });
      }

      const { username, password, email } = result.data;
      const user = await authService.register(username, password, email);
      res.json({ status: 'success', data: { user } });
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: error.message || 'Registration failed'
      });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: result.error.issues
        });
      }

      const { user, token } = await authService.login(
        result.data.username,
        result.data.password
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
          },
          token
        }
      });
    } catch (error: any) {
      res.status(401).json({
        status: 'error',
        message: error.message || 'Authentication failed'
      });
    }
  });

  app.post('/api/logout', requireAuth, (req, res) => {
    res.clearCookie('token');
    res.json({ status: 'success', message: 'Logged out successfully' });
  });

  app.get('/api/user', requireAuth, (req, res) => {
    res.json(req.user);
  });
}
