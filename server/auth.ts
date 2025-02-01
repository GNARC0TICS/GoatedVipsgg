import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Basic auth service with core functionality
export const authService = {
  // Create new user
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

  // Login user
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