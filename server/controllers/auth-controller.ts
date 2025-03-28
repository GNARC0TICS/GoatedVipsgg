/**
 * Authentication controller for handling user signup, login, and session management
 */
import { Request, Response } from "express";
import { db } from "@db/connection";
import { users, userSessions } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { log } from "../vite";
import { emailService } from "../utils/email-service";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, rotateRefreshToken, revokeAllUserTokens } from "../utils/token-manager";

// Crypto utility functions
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = scryptSync(password, salt, 64);
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = scryptSync(suppliedPassword, salt, 64);
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

/**
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Username, email and password are required",
      });
    }

    // Check if username or email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .or(eq(users.email, email));

    if (existingUser.length > 0) {
      // Check if username exists
      if (existingUser.some(user => user.username === username)) {
        return res.status(400).json({
          status: "error",
          message: "Username already exists",
        });
      }
      // Check if email exists
      if (existingUser.some(user => user.email === email)) {
        return res.status(400).json({
          status: "error",
          message: "Email already exists",
        });
      }
    }

    // Hash the password
    const hashedPassword = await crypto.hash(password);

    // Create the new user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        isAdmin: false,
        isEmailVerified: false, // User needs to verify email
      })
      .returning();

    // Send verification email
    await emailService.sendVerificationEmail(newUser.id, email, username);

    // Create access token
    const accessToken = generateAccessToken(newUser.id, newUser.username, newUser.isAdmin);
    
    // Create refresh token
    const refreshToken = await generateRefreshToken(
      newUser.id, 
      req.headers["user-agent"], 
      req.ip,
      false // Default to not remember me for new registrations
    );

    // Set tokens in cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/refresh", // Only send on refresh token requests
    });

    // Create session record
    await db.insert(userSessions).values({
      userId: newUser.id,
      sessionToken: accessToken,
      userAgent: req.headers["user-agent"] as string,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      rememberMe: false,
    });

    // Return success response
    return res.status(201).json({
      status: "success",
      message: "Registration successful. Please verify your email.",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        isEmailVerified: newUser.isEmailVerified,
      },
    });
  } catch (error) {
    log(`Registration error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Login an existing user
 */
export async function login(req: Request, res: Response) {
  try {
    const { username, password, rememberMe = false } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: "error",
        message: "Username and password are required",
      });
    }

    // Find user by username or email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .or(eq(users.email, username));

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Verify password
    const passwordMatch = await crypto.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Create access token
    const accessToken = generateAccessToken(user.id, user.username, user.isAdmin);
    
    // Create refresh token based on remember me preference
    const refreshToken = await generateRefreshToken(
      user.id, 
      req.headers["user-agent"], 
      req.ip,
      rememberMe
    );

    // Set token expiry based on remember me preference
    const accessTokenExpiry = 60 * 60 * 1000; // 1 hour
    const refreshTokenExpiry = rememberMe 
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days

    // Set tokens in cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: accessTokenExpiry,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: refreshTokenExpiry,
      path: "/api/refresh", // Only send on refresh token requests
    });

    // Create session record
    await db.insert(userSessions).values({
      userId: user.id,
      sessionToken: accessToken,
      userAgent: req.headers["user-agent"] as string,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + accessTokenExpiry),
      rememberMe: rememberMe,
    });

    // Update last login
    await db.update(users)
      .set({
        lastLogin: new Date(),
        lastLoginIp: req.ip,
      })
      .where(eq(users.id, user.id));

    // Return success response
    return res.json({
      status: "success",
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    log(`Login error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Logout current user
 */
export async function logout(req: Request, res: Response) {
  try {
    // Get access token from cookie
    const accessToken = req.cookies.accessToken;
    
    if (accessToken) {
      // Decode token to get user id
      const decoded = verifyAccessToken(accessToken);
      
      if (decoded && decoded.userId) {
        // Update session
        await db.update(userSessions)
          .set({
            isActive: false,
          })
          .where(eq(userSessions.sessionToken, accessToken));
      }
      
      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken", { path: "/api/refresh" });
    }
    
    // Always return success even if no token
    // This prevents information leakage
    return res.json({
      status: "success",
      message: "Logout successful",
    });
  } catch (error) {
    log(`Logout error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Get current user from token
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // Get access token from cookie or authorization header
    const accessToken = req.cookies.accessToken || 
      (req.headers.authorization && req.headers.authorization.startsWith("Bearer ") 
        ? req.headers.authorization.split(" ")[1] 
        : null);
    
    if (!accessToken) {
      return res.status(401).json({
        status: "error",
        message: "Not logged in",
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(accessToken);
    if (!decoded) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }
    
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId));
    
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }
    
    // Return user data
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      profileColor: user.profileColor,
    });
  } catch (error) {
    log(`Get current user error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Refresh the access token using a refresh token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        status: "error",
        message: "No refresh token",
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      // Clear the invalid cookie
      res.clearCookie("refreshToken", { path: "/api/refresh" });
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired refresh token",
      });
    }
    
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId));
    
    if (!user) {
      // Clear cookies
      res.clearCookie("refreshToken", { path: "/api/refresh" });
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.username, user.isAdmin);
    
    // Rotate refresh token
    const newRefreshToken = await rotateRefreshToken(
      refreshToken,
      req.headers["user-agent"],
      req.ip
    );
    
    if (!newRefreshToken) {
      // Clear cookies
      res.clearCookie("refreshToken", { path: "/api/refresh" });
      return res.status(401).json({
        status: "error",
        message: "Failed to rotate refresh token",
      });
    }
    
    // Get session duration from existing sessions (to preserve remember me preference)
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, user.id))
      .orderBy({ lastActive: "desc" });
    
    const rememberMe = session?.rememberMe || false;
    
    // Set new tokens in cookies
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: rememberMe 
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/refresh",
    });
    
    // Create new session
    await db.insert(userSessions).values({
      userId: user.id,
      sessionToken: newAccessToken,
      userAgent: req.headers["user-agent"] as string,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      rememberMe: rememberMe,
    });
    
    // Return success
    return res.json({
      status: "success",
      message: "Token refreshed",
    });
  } catch (error) {
    log(`Refresh token error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Invalid token",
      });
    }
    
    const result = await emailService.verifyEmail(token);
    
    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.message,
      });
    }
    
    return res.json({
      status: "success",
      message: result.message,
    });
  } catch (error) {
    log(`Verify email error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(req: Request, res: Response) {
  try {
    // Assuming req.user is populated by middleware
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Not logged in",
      });
    }
    
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    
    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        status: "error",
        message: "Email already verified",
      });
    }
    
    // Send verification email
    const result = await emailService.sendVerificationEmail(user.id, user.email, user.username);
    
    if (!result.success) {
      return res.status(500).json({
        status: "error",
        message: result.message,
      });
    }
    
    return res.json({
      status: "success",
      message: "Verification email sent",
    });
  } catch (error) {
    log(`Resend verification email error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }
    
    // Send password reset email
    // Note: we don't check if email exists for security reasons
    const result = await emailService.sendPasswordResetEmail(email);
    
    return res.json({
      status: "success",
      message: result.message,
    });
  } catch (error) {
    log(`Request password reset error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        status: "error",
        message: "Token and password are required",
      });
    }
    
    // Validate token
    const validation = await emailService.validatePasswordResetToken(token);
    
    if (!validation.success || !validation.userId) {
      return res.status(400).json({
        status: "error",
        message: validation.message,
      });
    }
    
    // Hash the new password
    const hashedPassword = await crypto.hash(password);
    
    // Update password and clear reset token
    await db.update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      })
      .where(eq(users.id, validation.userId));
    
    // Revoke all refresh tokens for security
    await revokeAllUserTokens(validation.userId);
    
    return res.json({
      status: "success",
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    log(`Reset password error: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}