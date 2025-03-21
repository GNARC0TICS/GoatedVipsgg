import express from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../../db/connection';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

// Schema for profile update validation
const profileUpdateSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  profileColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  telegramUsername: z.string().max(32).optional(),
});

// Get user profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const [userProfile] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        bio: users.bio,
        profileColor: users.profileColor,
        telegramUsername: users.telegramUsername,
        goatedUsername: users.goatedUsername,
        goatedUid: users.goatedUid,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!userProfile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found',
      });
    }
    
    res.json({
      status: 'success',
      data: userProfile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
    });
  }
});

// Update user profile
router.post('/update', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validationResult = profileUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid profile data',
        errors: validationResult.error.errors,
      });
    }
    
    const { username, bio, profileColor, telegramUsername } = validationResult.data;
    
    // Check if username is taken (if username is being updated)
    if (username) {
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUser.length > 0 && existingUser[0].id !== userId) {
        return res.status(400).json({
          status: 'error',
          message: 'Username is already taken',
        });
      }
    }
    
    // Update user profile
    const [updatedProfile] = await db
      .update(users)
      .set({
        username: username,
        bio: bio,
        profileColor: profileColor,
        telegramUsername: telegramUsername,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        bio: users.bio,
        profileColor: users.profileColor,
        telegramUsername: users.telegramUsername,
      });
    
    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
    });
  }
});

// Link Telegram account
router.post('/link-telegram', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { telegramId, telegramUsername } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({
        status: 'error',
        message: 'Telegram ID is required',
      });
    }
    
    // Check if Telegram ID is already linked to another account
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);
    
    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      return res.status(400).json({
        status: 'error',
        message: 'This Telegram account is already linked to another user',
      });
    }
    
    // Update user with Telegram info
    const [updatedUser] = await db
      .update(users)
      .set({
        telegramId: telegramId,
        telegramUsername: telegramUsername,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        telegramId: users.telegramId,
        telegramUsername: users.telegramUsername,
      });
    
    res.json({
      status: 'success',
      message: 'Telegram account linked successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error linking Telegram account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to link Telegram account',
    });
  }
});

// Link Goated account
router.post('/link-goated', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { goatedUid, goatedUsername } = req.body;
    
    if (!goatedUid || !goatedUsername) {
      return res.status(400).json({
        status: 'error',
        message: 'Goated ID and username are required',
      });
    }
    
    // Check if Goated ID is already linked to another account
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.goatedUid, goatedUid))
      .limit(1);
    
    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      return res.status(400).json({
        status: 'error',
        message: 'This Goated account is already linked to another user',
      });
    }
    
    // Update user with Goated info
    const [updatedUser] = await db
      .update(users)
      .set({
        goatedUid: goatedUid,
        goatedUsername: goatedUsername,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        goatedUid: users.goatedUid,
        goatedUsername: users.goatedUsername,
      });
    
    res.json({
      status: 'success',
      message: 'Goated account linked successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error linking Goated account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to link Goated account',
    });
  }
});

export default router;
