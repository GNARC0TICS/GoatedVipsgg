/**
 * Authentication routes
 */
import { Router, Request, Response } from "express";
import * as bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "@db/connection";
import { users, userSessions } from "@db/schema";
import { eq, or } from "drizzle-orm";
import { log } from "../vite";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, validateRefreshTokenInDb, rotateRefreshToken, revokeRefreshToken } from "../utils/token-manager";
import { emailService } from "../utils/email-service";

// Create router
const router = Router();

// Middleware to grab the current user from the session
const getCurrentUserMiddleware = async (req: Request, res: Response, next: Function) => {
  if (req.user) {
    next();
  } else {
    return res.status(401).json({
      status: "error",
      message: "Not logged in"
    });
  }
};

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string(),
  rememberMe: z.boolean().optional().default(false),
}).refine(data => data.username || data.email, {
  message: "Either username or email must be provided",
  path: ["username"],
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

// Register new user
router.post("/register", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        ok: false,
        errors: validationResult.error.errors,
      });
    }

    const { username, email, password } = validationResult.data;

    // Check if username or email already exists
    const existingUser = await db.select()
      .from(users)
      .where(
        or(
          eq(users.username, username),
          eq(users.email, email)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      if (existingUser[0].username === username) {
        return res.status(400).json({
          ok: false,
          errors: {
            username: "Username already exists",
          },
        });
      } else {
        return res.status(400).json({
          ok: false,
          errors: {
            email: "Email already exists",
          },
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [createdUser] = await db.insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        isAdmin: false,
        createdAt: new Date(),
        isEmailVerified: false,
      })
      .returning();

    // Send verification email
    await emailService.sendVerificationEmail(
      createdUser.id,
      createdUser.email,
      createdUser.username
    );

    // Return success
    return res.status(201).json({
      ok: true,
      message: "User registered successfully. Please check your email to verify your account.",
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        isAdmin: createdUser.isAdmin,
        isEmailVerified: createdUser.isEmailVerified,
      },
    });
  } catch (error) {
    log(`Error registering user: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while registering user",
    });
  }
});

// Login user
router.post("/login", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        ok: false,
        errors: validationResult.error.errors,
      });
    }

    const { username, email, password, rememberMe } = validationResult.data;

    // Find user by username or email
    let user;
    if (username) {
      [user] = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
    } else {
      [user] = await db.select()
        .from(users)
        .where(eq(users.email, email!))
        .limit(1);
    }

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Invalid credentials",
      });
    }

    // Check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        ok: false,
        message: "Invalid credentials",
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        ok: false,
        message: "Please verify your email before logging in",
      });
    }

    // Create access token
    const accessToken = generateAccessToken(user.id, user.username, user.isAdmin);

    // Create refresh token
    const refreshToken = await generateRefreshToken(
      user.id,
      req.headers['user-agent'],
      req.ip,
      rememberMe
    );

    // Update user's last login
    await db.update(users)
      .set({
        lastLogin: new Date(),
        lastLoginIp: req.ip,
      })
      .where(eq(users.id, user.id));

    // Set cookies
    const refreshTokenMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: refreshTokenMaxAge,
      sameSite: "strict",
    });

    // Return success
    return res.status(200).json({
      ok: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      token: accessToken,
    });
  } catch (error) {
    log(`Error logging in: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while logging in",
    });
  }
});

// Logout user
router.post("/logout", async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    // If no refresh token, nothing to do
    if (!refreshToken) {
      return res.status(200).json({
        ok: true,
        message: "Logged out successfully",
      });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded && decoded.tokenId) {
      // Revoke token
      await revokeRefreshToken(decoded.tokenId);
    }

    // Clear cookies
    res.clearCookie("refreshToken");

    // Return success
    return res.status(200).json({
      ok: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    log(`Error logging out: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while logging out",
    });
  }
});

// Refresh access token
router.post("/refresh-token", async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    // If no refresh token, return error
    if (!refreshToken) {
      return res.status(401).json({
        ok: false,
        message: "Refresh token is required",
      });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.tokenId) {
      res.clearCookie("refreshToken");
      return res.status(401).json({
        ok: false,
        message: "Invalid refresh token",
      });
    }

    // Validate token in database
    const isValid = await validateRefreshTokenInDb(decoded.tokenId);
    if (!isValid) {
      res.clearCookie("refreshToken");
      return res.status(401).json({
        ok: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Get user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      res.clearCookie("refreshToken");
      return res.status(401).json({
        ok: false,
        message: "User not found",
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.username, user.isAdmin);

    // Rotate refresh token
    const newRefreshToken = await rotateRefreshToken(
      refreshToken,
      req.headers['user-agent'],
      req.ip
    );

    if (!newRefreshToken) {
      res.clearCookie("refreshToken");
      return res.status(500).json({
        ok: false,
        message: "Failed to refresh token",
      });
    }

    // Get token record to check if it's a "remember me" token
    const [tokenRecord] = await db.select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // Set cookies with appropriate expiry
    const refreshTokenMaxAge = tokenRecord && tokenRecord.rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: refreshTokenMaxAge,
      sameSite: "strict",
    });

    // Return success
    return res.status(200).json({
      ok: true,
      message: "Token refreshed successfully",
      token: accessToken,
    });
  } catch (error) {
    log(`Error refreshing token: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while refreshing token",
    });
  }
});

// Verify email
router.get("/verify-email", async (req: Request, res: Response) => {
  try {
    // Get token from query params
    const { token } = req.query;
    
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        ok: false,
        message: "Verification token is required",
      });
    }

    // Verify email
    const result = await emailService.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        message: result.message,
      });
    }

    // Redirect to frontend with success message
    return res.redirect(`/?verified=true&message=${encodeURIComponent(result.message)}`);
  } catch (error) {
    log(`Error verifying email: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while verifying email",
    });
  }
});

// Resend verification email
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Email is required",
      });
    }

    // Find user by email
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // If user not found or already verified, return success for security
    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        ok: true,
        message: "If your email is registered and not verified, a new verification email has been sent.",
      });
    }

    // Resend verification email
    await emailService.sendVerificationEmail(
      user.id,
      user.email,
      user.username
    );

    // Return success
    return res.status(200).json({
      ok: true,
      message: "If your email is registered and not verified, a new verification email has been sent.",
    });
  } catch (error) {
    log(`Error resending verification email: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while resending verification email",
    });
  }
});

// Request password reset
router.post("/request-password-reset", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = resetPasswordRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        ok: false,
        errors: validationResult.error.errors,
      });
    }

    const { email } = validationResult.data;

    // Send password reset email
    await emailService.sendPasswordResetEmail(email);

    // Always return success for security
    return res.status(200).json({
      ok: true,
      message: "If your email is registered, you will receive a password reset link shortly.",
    });
  } catch (error) {
    log(`Error requesting password reset: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while requesting password reset",
    });
  }
});

// Get current user
router.get("/user", getCurrentUserMiddleware, (req: Request, res: Response) => {
  // Since the middleware has already checked for a valid user,
  // we can just return the user object from the request
  return res.status(200).json({
    id: req.user?.id,
    username: req.user?.username,
    email: req.user?.email,
    isAdmin: req.user?.isAdmin,
    isEmailVerified: req.user?.isEmailVerified,
    createdAt: req.user?.createdAt,
    lastLogin: req.user?.lastLogin
  });
});

// Reset password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        ok: false,
        errors: validationResult.error.errors,
      });
    }

    const { token, password } = validationResult.data;

    // Validate token
    const validation = await emailService.validatePasswordResetToken(token);
    if (!validation.success || !validation.userId) {
      return res.status(400).json({
        ok: false,
        message: validation.message,
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    await db.update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      })
      .where(eq(users.id, validation.userId));

    // Return success
    return res.status(200).json({
      ok: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    log(`Error resetting password: ${error}`);
    return res.status(500).json({
      ok: false,
      message: "An error occurred while resetting password",
    });
  }
});

export default router;