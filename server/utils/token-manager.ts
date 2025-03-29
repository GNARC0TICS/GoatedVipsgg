/**
 * Token manager for creating and validating access and refresh tokens
 */
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../db/connection';
import { eq, and, sql } from 'drizzle-orm';
import { users } from '../../db/schema/tables';
import { refreshTokens } from '../../db/schema/auth';
import { log } from '../vite';

// Secret keys
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_token_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_token_secret';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_TOKEN_EXPIRY_REMEMBER_ME = '30d'; // 30 days

/**
 * Generate a new access token
 * @param userId User ID
 * @param username Username
 * @param isAdmin Whether the user is an admin
 * @returns The generated access token
 */
export function generateAccessToken(userId: number, username: string, isAdmin: boolean): string {
  return jwt.sign(
    {
      userId,
      username,
      isAdmin,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
}

/**
 * Verify an access token
 * @param token The access token to verify
 * @returns The decoded token or null if invalid
 */
interface JwtTokenBase {
  iat: number;
  exp: number;
}

interface AccessTokenPayload extends JwtTokenBase {
  userId: number;
  username: string;
  isAdmin: boolean;
}

interface RefreshTokenPayload extends JwtTokenBase {
  tokenId: string;
  userId: number;
  type: 'refresh';
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload & {
      userId: number;
      username: string;
      isAdmin: boolean;
    };
    
    if (!decoded.iat || !decoded.exp) {
      return null;
    }

    return {
      userId: decoded.userId,
      username: decoded.username,
      isAdmin: decoded.isAdmin,
      iat: decoded.iat,
      exp: decoded.exp
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate a new refresh token
 * @param userId User ID
 * @param userAgent User agent string
 * @param ipAddress IP address
 * @param rememberMe Whether this is a long-term session
 * @returns The generated refresh token
 */
export async function generateRefreshToken(
  userId: number,
  userAgent?: string,
  ipAddress?: string,
  rememberMe: boolean = false
): Promise<string> {
  try {
    // Generate a unique token ID
    const tokenId = crypto.randomBytes(16).toString('hex');
    
    // Create expiration date
    const expiresAt = new Date();
    if (rememberMe) {
      // Add 30 days for "remember me"
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      // Add 7 days by default
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    // Save token in database
    await db.insert(refreshTokens)
      .values({
        token: tokenId,
        userId,
        userAgent: userAgent || 'Unknown',
        ipAddress: ipAddress || 'Unknown',
        expiresAt,
        createdAt: new Date(),
        isRevoked: false,
        rememberMe,
      });

    // Create token payload
    const payload = {
      tokenId,
      userId,
      type: 'refresh'
    };

    // Sign JWT
    return jwt.sign(
      payload,
      REFRESH_TOKEN_SECRET,
      {
        expiresIn: rememberMe ? REFRESH_TOKEN_EXPIRY_REMEMBER_ME : REFRESH_TOKEN_EXPIRY,
      }
    );
  } catch (error) {
    log(`Error generating refresh token: ${error}`);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify a refresh token
 * @param token The refresh token to verify
 * @returns The decoded token payload or null if invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload & {
      tokenId: string;
      userId: number;
      type: 'refresh';
    };
    
    if (!decoded.iat || !decoded.exp) {
      return null;
    }

    return {
      tokenId: decoded.tokenId,
      userId: decoded.userId,
      type: 'refresh',
      iat: decoded.iat,
      exp: decoded.exp
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validate a refresh token against the database
 * @param tokenId The token ID to validate
 * @returns If the token is valid and not revoked
 */
export async function validateRefreshTokenInDb(tokenId: string): Promise<boolean> {
  try {
    // Find token in database
    const tokenRecord = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, tokenId),
          eq(refreshTokens.isRevoked, false),
          sql`${refreshTokens.expiresAt} > NOW()`
        )
      )
      .then(rows => rows[0]);

    return !!tokenRecord;
  } catch (error) {
    log(`Error validating refresh token: ${error}`);
    return false;
  }
}

/**
 * Rotate a refresh token (revoke old one and create new one)
 * @param oldToken The old refresh token
 * @param userAgent User agent string
 * @param ipAddress IP address
 * @returns The new refresh token or null if rotation failed
 */
export async function rotateRefreshToken(
  oldToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string | null> {
  try {
    // Verify old token
    const decoded = verifyRefreshToken(oldToken);
    if (!decoded || !decoded.tokenId || !decoded.userId) {
      return null;
    }

    // Check if token is valid in database
    const isValid = await validateRefreshTokenInDb(decoded.tokenId);
    if (!isValid) {
      return null;
    }

    // Revoke old token
    await revokeRefreshToken(decoded.tokenId);

    // Get token record to check if it was a "remember me" token
    const tokenRecord = await db.select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, decoded.tokenId))
      .then(rows => rows[0]);

    const rememberMe = !!tokenRecord?.rememberMe;

    // Generate new token
    return await generateRefreshToken(
      decoded.userId,
      userAgent,
      ipAddress,
      rememberMe
    );
  } catch (error) {
    log(`Error rotating refresh token: ${error}`);
    return null;
  }
}

/**
 * Revoke a specific refresh token
 * @param tokenId The token ID to revoke
 * @returns Success status
 */
export async function revokeRefreshToken(tokenId: string): Promise<boolean> {
  try {
    await db.update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date()
      })
      .where(eq(refreshTokens.token, tokenId));
    
    return true;
  } catch (error) {
    log(`Error revoking refresh token: ${error}`);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 * @param userId The user ID
 * @returns Success status
 */
export async function revokeAllUserTokens(userId: number): Promise<boolean> {
  try {
    await db.update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date()
      })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false)
        )
      );
    
    return true;
  } catch (error) {
    log(`Error revoking all user tokens: ${error}`);
    return false;
  }
}

/**
 * Cleanup expired or revoked tokens
 * This should be run periodically
 */
export async function cleanupTokens(): Promise<void> {
  try {
    // Delete tokens that have been revoked for more than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await db.delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.isRevoked, true),
          sql`${refreshTokens.revokedAt} < ${sevenDaysAgo}`
        )
      );

    // Delete expired tokens
    await db.delete(refreshTokens)
      .where(sql`${refreshTokens.expiresAt} < NOW()`);

    log('Token cleanup completed successfully');
  } catch (error) {
    log(`Error cleaning up tokens: ${error}`);
  }
}
