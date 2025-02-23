
import { db } from "../db";
import { users } from "../db/schema";
import { sql } from "drizzle-orm";

async function cleanupDuplicateTelegramIds() {
  // Find duplicates
  const duplicates = await db.execute(sql`
    SELECT telegram_id, COUNT(*) 
    FROM users 
    WHERE telegram_id IS NOT NULL 
    GROUP BY telegram_id 
    HAVING COUNT(*) > 1
  `);

  // Keep the most recent record for each telegram_id
  await db.execute(sql`
    UPDATE users SET telegram_id = NULL
    WHERE id IN (
      SELECT id FROM (
        SELECT id, telegram_id,
        ROW_NUMBER() OVER (PARTITION BY telegram_id ORDER BY created_at DESC) as rn
        FROM users
        WHERE telegram_id IS NOT NULL
      ) t
      WHERE t.rn > 1
    )
  `);

  console.log('Duplicate cleanup completed');
}

cleanupDuplicateTelegramIds();
