import { db } from "../db";
import {
  users,
  telegramUsers,
  verificationRequests,
  verificationHistory,
} from "../db/schema";
import { sql } from "drizzle-orm";
import { log } from "./vite";

async function migrateVerificationData() {
  try {
    // Start transaction to ensure data consistency
    await db.transaction(async (tx) => {
      // 1. Get all existing verification requests
      const existingRequests = await tx
        .select()
        .from(verificationRequests)
        .execute();

      // 2. Insert all existing requests into verification history
      for (const request of existingRequests) {
        if (request) {
          await tx.insert(verificationHistory).values({
            telegramId: request.telegramId,
            userId: request.userId,
            status: request.status || 'pending',
            goatedUsername: request.goatedUsername || null,
            verifiedBy: request.verifiedBy || null,
            verifiedAt: request.verifiedAt || null,
            adminNotes: request.adminNotes || null,
            createdAt: request.requestedAt || new Date()
          });
        }
      }

      // 3. Get the latest verification status for each telegram user
      const latestStatuses = await tx.execute(sql`
        WITH ranked_requests AS (
          SELECT 
            *,
            ROW_NUMBER() OVER (PARTITION BY "telegram_id" ORDER BY "requested_at" DESC) as rn
          FROM verification_requests
          WHERE status = 'approved'
        )
        SELECT * FROM ranked_requests WHERE rn = 1
      `);

      // 4. Clear existing verification requests
      await tx.execute(sql`TRUNCATE TABLE verification_requests`);

      // 5. Insert only the latest status for each user
      if (Array.isArray(latestStatuses)) {
        for (const status of latestStatuses) {
          if (status) {
            await tx.insert(verificationRequests).values({
              telegramId: status.telegram_id,
              userId: status.user_id,
              status: 'approved',
              goatedUsername: status.goated_username || null,
              requestedAt: status.requested_at || new Date(),
              verifiedAt: status.verified_at || null,
              verifiedBy: status.verified_by || null,
              adminNotes: status.admin_notes || null,
              telegramUsername: status.telegram_username || null,
              updatedAt: new Date()
            });
          }
        }
      }

      // 6. Update telegram_users table with latest verification status
      if (Array.isArray(latestStatuses)) {
        for (const status of latestStatuses) {
          if (status && status.telegram_id) {
            await tx
              .update(telegramUsers)
              .set({
                isVerified: true,
                verifiedAt: status.verified_at || new Date(),
                verifiedBy: status.verified_by || null,
                updatedAt: new Date()
              })
              .where(sql`telegram_id = ${status.telegram_id}`);
          }
        }
      }
    });

    log("Verification data migration completed successfully");
  } catch (error) {
    log(`Error migrating verification data: ${error}`);
    throw error;
  }
}

// Only run if executed directly
if (require.main === module) {
  migrateVerificationData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateVerificationData };