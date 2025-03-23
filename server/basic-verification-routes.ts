import { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { log } from "./vite";
import { requireAdmin, requireAuth } from "./middleware/auth";
import { z } from "zod";
import * as schema from "../db/schema";

// Simple schema validation
const goatedVerificationSchema = z.object({
  goatedUsername: z.string().min(3),
  goatedUid: z.string().min(3),
});

const verificationActionSchema = z.object({
  id: z.number(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
});

export function registerBasicVerificationRoutes(app: Express) {
  // Submit Goated.com verification request
  app.post(
    "/api/verify/goated",
    requireAuth,
    async (req: Request, res: Response) => {
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
              eq(
                schema.goatedVerificationRequests.platformUserId,
                req.user!.id,
              ),
              eq(schema.goatedVerificationRequests.status, "pending"),
            ),
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
          .from(schema.goatedVerificationRequests)
          .where(
            and(
              eq(
                schema.goatedVerificationRequests.goatedUsername,
                goatedUsername,
              ),
              eq(schema.goatedVerificationRequests.status, "approved"),
            ),
          )
          .limit(1);

        if (existingVerification) {
          return res.status(400).json({
            status: "error",
            message:
              "This Goated.com username is already verified for another user",
          });
        }

        // Create new verification request
        const [newRequest] = await db
          .insert(schema.goatedVerificationRequests)
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
    },
  );

  // Submit Telegram verification request
  app.post(
    "/api/verify/telegram",
    requireAuth,
    async (req: Request, res: Response) => {
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
          .from(schema.telegramVerificationRequests)
          .where(
            and(
              eq(
                schema.telegramVerificationRequests.platformUserId,
                req.user!.id,
              ),
              eq(schema.telegramVerificationRequests.status, "pending"),
            ),
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
          .from(schema.telegramVerificationRequests)
          .where(
            and(
              eq(schema.telegramVerificationRequests.telegramId, telegramId),
              eq(schema.telegramVerificationRequests.status, "approved"),
            ),
          )
          .limit(1);

        if (existingVerification) {
          return res.status(400).json({
            status: "error",
            message:
              "This Telegram account is already verified for another user",
          });
        }

        // Create new verification request
        const [newRequest] = await db
          .insert(schema.telegramVerificationRequests)
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
    },
  );

  // Get all verification requests (admin only)
  app.get(
    "/api/admin/verification/requests",
    requireAdmin,
    async (_req: Request, res: Response) => {
      try {
        // Get all goated verification requests with user details
        const goatedRequests = await db
          .select({
            id: schema.goatedVerificationRequests.id,
            platformUserId: schema.goatedVerificationRequests.platformUserId,
            goatedUsername: schema.goatedVerificationRequests.goatedUsername,
            goatedUid: schema.goatedVerificationRequests.goatedUid,
            requestedAt: schema.goatedVerificationRequests.requestedAt,
            status: schema.goatedVerificationRequests.status,
            adminNotes: schema.goatedVerificationRequests.adminNotes,
            verifiedAt: schema.goatedVerificationRequests.verifiedAt,
            verifiedBy: schema.goatedVerificationRequests.verifiedBy,
            user: {
              id: schema.users.id,
              username: schema.users.username,
              email: schema.users.email,
            },
          })
          .from(schema.goatedVerificationRequests)
          .leftJoin(
            schema.users,
            eq(
              schema.goatedVerificationRequests.platformUserId,
              schema.users.id,
            ),
          )
          .orderBy(desc(schema.goatedVerificationRequests.requestedAt));

        // Get all telegram verification requests with user details
        const telegramRequests = await db
          .select({
            id: schema.telegramVerificationRequests.id,
            platformUserId: schema.telegramVerificationRequests.platformUserId,
            telegramUsername:
              schema.telegramVerificationRequests.telegramUsername,
            telegramId: schema.telegramVerificationRequests.telegramId,
            requestedAt: schema.telegramVerificationRequests.requestedAt,
            status: schema.telegramVerificationRequests.status,
            adminNotes: schema.telegramVerificationRequests.adminNotes,
            verifiedAt: schema.telegramVerificationRequests.verifiedAt,
            verifiedBy: schema.telegramVerificationRequests.verifiedBy,
            user: {
              id: schema.users.id,
              username: schema.users.username,
              email: schema.users.email,
            },
          })
          .from(schema.telegramVerificationRequests)
          .leftJoin(
            schema.users,
            eq(
              schema.telegramVerificationRequests.platformUserId,
              schema.users.id,
            ),
          )
          .orderBy(desc(schema.telegramVerificationRequests.requestedAt));

        res.json({
          status: "success",
          data: {
            goated: goatedRequests,
            telegram: telegramRequests,
          },
        });
      } catch (error) {
        log(`Error fetching verification requests: ${error}`);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch verification requests",
        });
      }
    },
  );

  // Take action on a Goated verification request (admin only)
  app.post(
    "/api/admin/verification/goated",
    requireAdmin,
    async (req: Request, res: Response) => {
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

        // Verify the request exists
        const [verificationRequest] = await db
          .select()
          .from(schema.goatedVerificationRequests)
          .where(eq(schema.goatedVerificationRequests.id, id))
          .limit(1);

        if (!verificationRequest) {
          return res.status(404).json({
            status: "error",
            message: "Verification request not found",
          });
        }

        // Check if request is already approved or rejected
        if (verificationRequest.status !== "pending") {
          return res.status(400).json({
            status: "error",
            message: `This request has already been ${verificationRequest.status}`,
          });
        }

        // Update the verification request status
        const [updatedRequest] = await db
          .update(schema.goatedVerificationRequests)
          .set({
            status: action === "approve" ? "approved" : "rejected",
            adminNotes: notes || null,
            verifiedAt: new Date(),
            verifiedBy: req.user!.id,
          })
          .where(eq(schema.goatedVerificationRequests.id, id))
          .returning();

        // If approved, update the user's goated account information
        if (action === "approve") {
          await db
            .update(schema.users)
            .set({
              goatedUsername: verificationRequest.goatedUsername,
              goatedUid: verificationRequest.goatedUid,
              isGoatedVerified: true,
              goatedVerifiedAt: new Date(),
            })
            .where(eq(schema.users.id, verificationRequest.platformUserId));
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
    },
  );

  // Take action on a Telegram verification request (admin only)
  app.post(
    "/api/admin/verification/telegram",
    requireAdmin,
    async (req: Request, res: Response) => {
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

        // Verify the request exists
        const [verificationRequest] = await db
          .select()
          .from(schema.telegramVerificationRequests)
          .where(eq(schema.telegramVerificationRequests.id, id))
          .limit(1);

        if (!verificationRequest) {
          return res.status(404).json({
            status: "error",
            message: "Verification request not found",
          });
        }

        // Check if request is already approved or rejected
        if (verificationRequest.status !== "pending") {
          return res.status(400).json({
            status: "error",
            message: `This request has already been ${verificationRequest.status}`,
          });
        }

        // Update the verification request status
        const [updatedRequest] = await db
          .update(schema.telegramVerificationRequests)
          .set({
            status: action === "approve" ? "approved" : "rejected",
            adminNotes: notes || null,
            verifiedAt: new Date(),
            verifiedBy: req.user!.id,
          })
          .where(eq(schema.telegramVerificationRequests.id, id))
          .returning();

        // If approved, update the user's telegram account information
        if (action === "approve") {
          await db
            .update(schema.users)
            .set({
              telegramUsername: verificationRequest.telegramUsername,
              telegramId: verificationRequest.telegramId,
              isTelegramVerified: true,
              telegramVerifiedAt: new Date(),
            })
            .where(eq(schema.users.id, verificationRequest.platformUserId));
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
    },
  );

  // Get user's verification status
  app.get(
    "/api/verify/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // Get user details
        const [user] = await db
          .select({
            id: schema.users.id,
            username: schema.users.username,
            goatedUsername: schema.users.goatedUsername,
            goatedUid: schema.users.goatedUid,
            isGoatedVerified: schema.users.isGoatedVerified,
            goatedVerifiedAt: schema.users.goatedVerifiedAt,
            telegramUsername: schema.users.telegramUsername,
            telegramId: schema.users.telegramId,
            isTelegramVerified: schema.users.isTelegramVerified,
            telegramVerifiedAt: schema.users.telegramVerifiedAt,
          })
          .from(schema.users)
          .where(eq(schema.users.id, req.user!.id))
          .limit(1);

        // Get any pending verification requests
        const [pendingGoatedRequest] = await db
          .select()
          .from(schema.goatedVerificationRequests)
          .where(
            and(
              eq(
                schema.goatedVerificationRequests.platformUserId,
                req.user!.id,
              ),
              eq(schema.goatedVerificationRequests.status, "pending"),
            ),
          )
          .limit(1);

        const [pendingTelegramRequest] = await db
          .select()
          .from(schema.telegramVerificationRequests)
          .where(
            and(
              eq(
                schema.telegramVerificationRequests.platformUserId,
                req.user!.id,
              ),
              eq(schema.telegramVerificationRequests.status, "pending"),
            ),
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
    },
  );

  // Search Goated.com username
  app.get(
    "/api/search/goated",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const username = req.query.username as string;

        if (!username || username.length < 3) {
          return res.status(400).json({
            status: "error",
            message: "Username must be at least 3 characters",
          });
        }

        // Mock response for development since we can't access the real API
        res.json({
          status: "success",
          data: {
            username,
            uid: `UID${Math.floor(Math.random() * 10000)}`,
            avatarUrl: "https://i.pravatar.cc/150?img=3",
          },
        });
      } catch (error) {
        log(`Error searching Goated username: ${error}`);
        res.status(500).json({
          status: "error",
          message: "Failed to search for username",
        });
      }
    },
  );
}
