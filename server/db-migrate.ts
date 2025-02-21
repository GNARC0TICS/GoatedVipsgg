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
        await tx.insert(verificationHistory).values({
          telegramId: request.telegramId,
          userId: request.userId,
          status: request.status,
          goatedUsername: request.goatedUsername,
          verifiedBy: request.verifiedBy,
          verifiedAt: request.verifiedAt,
          adminNotes: request.adminNotes,
          createdAt: request.requestedAt
        });
      }

      // 3. Get the latest verification status for each telegram user
      const latestStatuses = await tx.execute(sql`
        WITH ranked_requests AS (
          SELECT 
            *,
            ROW_NUMBER() OVER (PARTITION BY telegram_id ORDER BY requested_at DESC) as rn
          FROM verification_requests
        )
        SELECT * FROM ranked_requests WHERE rn = 1
      `);

      // 4. Clear existing verification requests
      await tx.execute(sql`TRUNCATE TABLE verification_requests`);

      // 5. Insert only the latest status for each user
      for (const status of latestStatuses) {
        await tx.insert(verificationRequests).values({
          telegramId: status.telegram_id,
          userId: status.user_id,
          status: status.status,
          goatedUsername: status.goated_username,
          requestedAt: status.requested_at,
          verifiedAt: status.verified_at,
          verifiedBy: status.verified_by,
          adminNotes: status.admin_notes,
          telegramUsername: status.telegram_username,
          updatedAt: status.updated_at
        });
      }

      // 6. Update telegram_users table with latest verification status
      for (const status of latestStatuses) {
        if (status.status === 'approved') {
          await tx
            .update(telegramUsers)
            .set({
              isVerified: true,
              verifiedAt: status.verified_at,
              verifiedBy: status.verified_by,
              updatedAt: new Date()
            })
            .where(sql`telegram_id = ${status.telegram_id}`);
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
