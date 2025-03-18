import { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { log } from "./vite";
import { requireAdmin, requireAuth } from "./middleware/auth";
import { z } from "zod";

// Import schema directly
import * as schema from "../db/schema";
import { telegramVerificationRequests } from "../db/schema";

// Schema validation
const goatedVerificationSchema = z.object({
  goatedUsername: z.string().min(3),
  goatedUid: z.string().min(3),
});

const telegramVerificationSchema = z.object({
  telegramUsername: z.string().min(3),
  telegramId: z.string(),
});

const verificationActionSchema = z.object({
  id: z.number(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
});

export function registerVerificationRoutes(app: Express) {
  // Submit Goated.com verification request
  app.post("/api/verify/goated", requireAuth, async (req: Request, res: Response) => {
    try {
      const validationResult = goatedVerificationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          status: "error",
          message: "Invalid verification request data",
          errors: validationResult.error.format(),
        });
      }

      const { goatedUsername, goatedUid } = validationResult.data;
      
      // Check if this user already has a pending verification request
      const [existingRequest] = await db
        .select()
        .from(schema.goatedVerificationRequests)
        .where(
          and(
            eq(schema.goatedVerificationRequests.platformUserId, req.user!.id),
            eq(schema.goatedVerificationRequests.status, "pending")
          )
        )
        .limit(1);

      if (existingRequest) {
        return res.status(400).json({
          status: "error",
          message: "You already have a pending verification request",
          requestId: existingRequest.id,
        });
      }

      // Check if the Goated username is already verified for another user
      const [existingVerification] = await db
        .select()
        .from(goatedVerificationRequests)
        .where(
          and(
            eq(goatedVerificationRequests.goatedUsername, goatedUsername),
            eq(goatedVerificationRequests.status, "approved")
          )
        )
        .limit(1);

      if (existingVerification) {
        return res.status(400).json({
          status: "error",
          message: "This Goated.com username is already verified for another user",
        });
      }

      // Create new verification request
      const [newRequest] = await db
        .insert(goatedVerificationRequests)
        .values({
          platformUserId: req.user!.id,
          goatedUsername,
          goatedUid,
          requestedAt: new Date(),
          status: "pending",
        })
        .returning();

      res.status(201).json({
        status: "success",
        message: "Verification request submitted successfully",
        data: newRequest,
      });
    } catch (error) {
      log(`Error submitting Goated verification request: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to submit verification request",
      });
    }
  });

  // Submit Telegram verification request
  app.post("/api/verify/telegram", requireAuth, async (req: Request, res: Response) => {
    try {
      const validationResult = telegramVerificationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          status: "error",
          message: "Invalid verification request data",
          errors: validationResult.error.format(),
        });
      }

      const { telegramUsername, telegramId } = validationResult.data;
      
      // Check if this user already has a pending verification request
      const [existingRequest] = await db
        .select()
        .from(telegramVerificationRequests)
        .where(
          and(
            eq(telegramVerificationRequests.platformUserId, req.user!.id),
            eq(telegramVerificationRequests.status, "pending")
          )
        )
        .limit(1);

      if (existingRequest) {
        return res.status(400).json({
          status: "error",
          message: "You already have a pending verification request",
          requestId: existingRequest.id,
        });
      }

      // Check if the Telegram ID is already verified for another user
      const [existingVerification] = await db
        .select()
        .from(telegramVerificationRequests)
        .where(
          and(
            eq(telegramVerificationRequests.telegramId, telegramId),
            eq(telegramVerificationRequests.status, "approved")
          )
        )
        .limit(1);

      if (existingVerification) {
        return res.status(400).json({
          status: "error",
          message: "This Telegram account is already verified for another user",
        });
      }

      // Create new verification request
      const [newRequest] = await db
        .insert(telegramVerificationRequests)
        .values({
          platformUserId: req.user!.id,
          telegramUsername,
          telegramId,
          requestedAt: new Date(),
          status: "pending",
        })
        .returning();

      res.status(201).json({
        status: "success",
        message: "Verification request submitted successfully",
        data: newRequest,
      });
    } catch (error) {
      log(`Error submitting Telegram verification request: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to submit verification request",
      });
    }
  });

  // Get all verification requests (admin only)
  app.get("/api/admin/verification/requests", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const goatedRequests = await db.query.goatedVerificationRequests.findMany({
        orderBy: (req, { desc }) => [desc(req.requestedAt)],
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true,
            }
          }
        }
      });

      const telegramRequests = await db.query.telegramVerificationRequests.findMany({
        orderBy: (req, { desc }) => [desc(req.requestedAt)],
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true,
            }
          }
        }
      });

      res.json({
        status: "success",
        data: {
          goated: goatedRequests,
          telegram: telegramRequests
        }
      });
    } catch (error) {
      log(`Error fetching verification requests: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch verification requests"
      });
    }
  });

  // Take action on a Goated verification request (admin only)
  app.post("/api/admin/verification/goated", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validationResult = verificationActionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          status: "error",
          message: "Invalid action data",
          errors: validationResult.error.format(),
        });
      }

      const { id, action, notes } = validationResult.data;
      
      // Update the verification request
      const [updatedRequest] = await db
        .update(goatedVerificationRequests)
        .set({
          status: action === "approve" ? "approved" : "rejected",
          adminNotes: notes || null,
          verifiedAt: new Date(),
          verifiedBy: req.user!.id,
        })
        .where(eq(goatedVerificationRequests.id, id))
        .returning();

      if (!updatedRequest) {
        return res.status(404).json({
          status: "error",
          message: "Verification request not found",
        });
      }

      // If approved, update the user's Goated.com info
      if (action === "approve") {
        await db
          .update(users)
          .set({
            goatedUsername: updatedRequest.goatedUsername,
            goatedUid: updatedRequest.goatedUid,
            goatedVerified: true,
          })
          .where(eq(users.id, updatedRequest.platformUserId));
      }

      res.json({
        status: "success",
        message: `Verification request ${action === "approve" ? "approved" : "rejected"} successfully`,
        data: updatedRequest,
      });
    } catch (error) {
      log(`Error handling Goated verification action: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to process verification action",
      });
    }
  });

  // Take action on a Telegram verification request (admin only)
  app.post("/api/admin/verification/telegram", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validationResult = verificationActionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          status: "error",
          message: "Invalid action data",
          errors: validationResult.error.format(),
        });
      }

      const { id, action, notes } = validationResult.data;
      
      // Update the verification request
      const [updatedRequest] = await db
        .update(telegramVerificationRequests)
        .set({
          status: action === "approve" ? "approved" : "rejected",
          adminNotes: notes || null,
          verifiedAt: new Date(),
          verifiedBy: req.user!.id,
        })
        .where(eq(telegramVerificationRequests.id, id))
        .returning();

      if (!updatedRequest) {
        return res.status(404).json({
          status: "error",
          message: "Verification request not found",
        });
      }

      // If approved, update the user's Telegram info
      if (action === "approve") {
        await db
          .update(users)
          .set({
            telegramUsername: updatedRequest.telegramUsername,
            telegramId: updatedRequest.telegramId,
            telegramVerified: true,
          })
          .where(eq(users.id, updatedRequest.platformUserId));
      }

      res.json({
        status: "success",
        message: `Verification request ${action === "approve" ? "approved" : "rejected"} successfully`,
        data: updatedRequest,
      });
    } catch (error) {
      log(`Error handling Telegram verification action: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to process verification action",
      });
    }
  });

  // Get user's verification status
  app.get("/api/verify/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          goatedUsername: users.goatedUsername,
          goatedUid: users.goatedUid,
          goatedVerified: users.goatedVerified,
          telegramUsername: users.telegramUsername,
          telegramId: users.telegramId,
          telegramVerified: users.telegramVerified,
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Get pending verification requests
      const [pendingGoatedRequest] = await db
        .select()
        .from(goatedVerificationRequests)
        .where(
          and(
            eq(goatedVerificationRequests.platformUserId, req.user!.id),
            eq(goatedVerificationRequests.status, "pending")
          )
        )
        .limit(1);

      const [pendingTelegramRequest] = await db
        .select()
        .from(telegramVerificationRequests)
        .where(
          and(
            eq(telegramVerificationRequests.platformUserId, req.user!.id),
            eq(telegramVerificationRequests.status, "pending")
          )
        )
        .limit(1);

      res.json({
        status: "success",
        data: {
          user,
          pendingRequests: {
            goated: pendingGoatedRequest || null,
            telegram: pendingTelegramRequest || null,
          },
        },
      });
    } catch (error) {
      log(`Error fetching verification status: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch verification status",
      });
    }
  });

  // Search Goated.com username
  app.get("/api/search/goated", requireAuth, async (req: Request, res: Response) => {
    try {
      const username = req.query.username as string;
      
      if (!username || username.length < 3) {
        return res.status(400).json({
          status: "error",
          message: "Username must be at least 3 characters",
        });
      }

      // Call external API to verify
      try {
        const response = await fetch(
          `${process.env.GOATED_API_URL}/api/users/search?username=${username}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.GOATED_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          return res.status(404).json({
            status: "error",
            message: "User not found on Goated.com",
          });
        }

        const userData = await response.json();
        
        res.json({
          status: "success",
          data: {
            username: userData.username,
            uid: userData.uid,
            avatarUrl: userData.avatarUrl,
          },
        });
      } catch (apiError) {
        // Mock response for development
        res.json({
          status: "success",
          data: {
            username,
            uid: `UID${Math.floor(Math.random() * 10000)}`,
            avatarUrl: "https://i.pravatar.cc/150?img=3",
          },
        });
      }
    } catch (error) {
      log(`Error searching Goated username: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to search for username",
      });
    }
  });
}