
import { db } from "../../db";
import { users } from "../../db/schema";
import { sql } from "drizzle-orm";

async function cleanupDuplicates() {
  console.log("Starting duplicate telegram_id cleanup...");
  
  try {
    // Find duplicates
    const duplicates = await db.execute(sql`
      SELECT telegram_id, COUNT(*) as count 
      FROM users 
      WHERE telegram_id IS NOT NULL 
      GROUP BY telegram_id 
      HAVING COUNT(*) > 1
    `);

    console.log('Found duplicates:', duplicates.rows);
    
    // Keep only the most recently created record for each telegram_id
    if (duplicates.rows.length > 0) {
      for (const dup of duplicates.rows) {
        const [kept] = await db.execute(sql`
          WITH ranked_users AS (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY telegram_id ORDER BY created_at DESC) as rn
            FROM users
            WHERE telegram_id = ${dup.telegram_id}
          )
          DELETE FROM users
          WHERE id IN (
            SELECT id 
            FROM ranked_users 
            WHERE rn > 1
          )
          RETURNING id;
        `);
        console.log(`Cleaned up duplicates for telegram_id: ${dup.telegram_id}`);
      }
    }
    
    console.log("Cleanup completed successfully");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

cleanupDuplicates()
  .catch(console.error)
  .finally(() => process.exit());
