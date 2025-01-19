import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Validation schemas
export const googleTokenSchema = z.object({
  token: z.string(),
});

export const jwtPayloadSchema = z.object({
  userId: z.number(),
  email: z.string().email(),
  isAdmin: z.boolean(),
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const JWT_EXPIRES_IN = '7d';

// Google OAuth Configuration
export const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/api/auth/google/callback`,
});

// JWT Utilities
export const generateToken = (payload: z.infer<typeof jwtPayloadSchema>) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = jwtPayloadSchema.safeParse(decoded);
    if (!result.success) {
      throw new Error('Invalid token payload');
    }
    return result.data;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Google OAuth Utilities
export const verifyGoogleToken = async (token: string) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token payload');
    }
    
    return {
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
    };
  } catch (error) {
    throw new Error('Failed to verify Google token');
  }
};
