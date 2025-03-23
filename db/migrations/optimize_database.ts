import { sql } from "drizzle-orm";
import { db } from "../connection";
import { neon } from '@neondatabase/serverless';

// Define a generic Row type for database results
interface DbRow {
  [key: string]: any;
}

/**
 * Migration to optimize database performance by adding indexes
 * and enhancing table structures for better leaderboard and wager race performance
 */
export async function optimizeDatabase() {
  console.log("Running migration: optimize_database");

  try {
    // Get list of existing tables
    const neonSql = neon(process.env.DATABASE_URL!);
    const tablesResult = await neonSql`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `;
    
    const existingTables = tablesResult.map((row: DbRow) => row.tablename as string);
    console.log("Existing tables:", existingTables);
    
    // Helper function to create index if table exists
    async function createIndexIfTableExists(tableName: string, indexQuery: string) {
      if (existingTables.includes(tableName)) {
        await db.execute(sql`${sql.raw(indexQuery)}`);
        console.log(`Created index on ${tableName}`);
      } else {
        console.log(`Skipping index creation for non-existent table: ${tableName}`);
      }
    }
    
    // User-related indexes
    if (existingTables.includes('users')) {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_goated_uid ON users(goated_uid);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);`);
      console.log("Created user indexes");
    }

    // Wager race indexes - Enhanced for better performance
    await createIndexIfTableExists('wager_race_participants', 
      'CREATE INDEX IF NOT EXISTS idx_wager_race_participants_race_id ON wager_race_participants(race_id)');
    await createIndexIfTableExists('wager_race_participants', 
      'CREATE INDEX IF NOT EXISTS idx_wager_race_participants_user_id ON wager_race_participants(user_id)');
    await createIndexIfTableExists('wager_race_participants', 
      'CREATE INDEX IF NOT EXISTS idx_wager_race_participants_wagered ON wager_race_participants(wagered DESC)');
    await createIndexIfTableExists('wager_race_participants', 
      'CREATE INDEX IF NOT EXISTS idx_wager_race_participants_position ON wager_race_participants(position)');
    await createIndexIfTableExists('wager_races', 
      'CREATE INDEX IF NOT EXISTS idx_wager_races_status ON wager_races(status)');
    await createIndexIfTableExists('wager_races', 
      'CREATE INDEX IF NOT EXISTS idx_wager_races_dates ON wager_races(start_date, end_date)');
    await createIndexIfTableExists('wager_races', 
      'CREATE INDEX IF NOT EXISTS idx_wager_races_created_at ON wager_races(created_at DESC)');

    // Affiliate stats indexes - Enhanced for leaderboard performance
    await createIndexIfTableExists('affiliate_stats', 
      'CREATE INDEX IF NOT EXISTS idx_affiliate_stats_user_id ON affiliate_stats("user_id")');
    await createIndexIfTableExists('affiliate_stats', 
      'CREATE INDEX IF NOT EXISTS idx_affiliate_stats_timestamp ON affiliate_stats(timestamp)');
    await createIndexIfTableExists('affiliate_stats', 
      'CREATE INDEX IF NOT EXISTS idx_affiliate_stats_period ON affiliate_stats(period)');
    await createIndexIfTableExists('affiliate_stats', 
      'CREATE INDEX IF NOT EXISTS idx_affiliate_stats_wagered ON affiliate_stats(wagered DESC)');
    await createIndexIfTableExists('affiliate_stats', 
      'CREATE INDEX IF NOT EXISTS idx_affiliate_stats_uid ON affiliate_stats(uid)');
    await createIndexIfTableExists('affiliate_stats',
      'CREATE INDEX IF NOT EXISTS idx_affiliate_stats_period_wagered ON affiliate_stats(period, wagered DESC)');

    // API keys indexes
    await createIndexIfTableExists('api_keys', 
      'CREATE INDEX IF NOT EXISTS idx_api_keys_name ON api_keys(name)');
    await createIndexIfTableExists('api_keys', 
      'CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)');
    await createIndexIfTableExists('api_key_usage', 
      'CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(key_id)');
    await createIndexIfTableExists('api_key_usage', 
      'CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp)');
    
    // Support system indexes
    await createIndexIfTableExists('support_tickets', 
      'CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id)');
    await createIndexIfTableExists('support_tickets', 
      'CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)');
    await createIndexIfTableExists('ticket_messages', 
      'CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id)');

    // Composite indexes for better query performance
    await createIndexIfTableExists('wager_race_participants', 
      'CREATE INDEX IF NOT EXISTS idx_wager_race_participants_composite ON wager_race_participants(race_id, user_id)');
    await createIndexIfTableExists('wager_race_participants', 
      'CREATE INDEX IF NOT EXISTS idx_wager_race_participants_race_pos ON wager_race_participants(race_id, position)');
    await createIndexIfTableExists('wager_race_participants', 
      'CREATE INDEX IF NOT EXISTS idx_wager_race_participants_race_wager ON wager_race_participants(race_id, wagered DESC)');
      
    // Add materialized view for fast leaderboard queries
    if (existingTables.includes('affiliate_stats')) {
      // Check if materialized view exists
      const viewResult = await neonSql`
        SELECT 1 FROM pg_class WHERE relname = 'leaderboard_summary' AND relkind = 'm';
      `;
      
      if (viewResult.length === 0) {
        // Create materialized view
        await db.execute(sql`
          CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_summary AS
          SELECT 
            uid,
            name,
            period,
            max(wagered) as wagered,
            max(updated_at) as last_updated
          FROM affiliate_stats
          GROUP BY uid, name, period
          ORDER BY wagered DESC;
          
          CREATE UNIQUE INDEX idx_leaderboard_summary_composite 
          ON leaderboard_summary(uid, period);
        `);
        
        // Create refresh function for the materialized view
        await db.execute(sql`
          CREATE OR REPLACE FUNCTION refresh_leaderboard_summary()
          RETURNS TRIGGER AS $$
          BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_summary;
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql;
          
          DROP TRIGGER IF EXISTS refresh_leaderboard_summary_trigger ON affiliate_stats;
          
          CREATE TRIGGER refresh_leaderboard_summary_trigger
          AFTER INSERT OR UPDATE OR DELETE ON affiliate_stats
          FOR EACH STATEMENT
          EXECUTE FUNCTION refresh_leaderboard_summary();
        `);
        
        console.log("Created materialized view and refresh trigger for leaderboard");
      } else {
        console.log("Leaderboard materialized view already exists");
      }
    }
    
    // Performance settings tuning
    await db.execute(sql`
      -- Set reasonable values for work_mem to improve sort operations
      SET work_mem = '8MB';
      
      -- Increase shared_buffers if possible
      -- SET shared_buffers = '128MB';
      
      -- For writes optimization, especially for the leaderboard/race data
      SET synchronous_commit = 'off';
      
      -- Autovacuum settings for tables with frequent updates
      ALTER TABLE affiliate_stats SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      );
      
      ALTER TABLE wager_race_participants SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      );
    `);
    
    console.log("Migration completed: optimize_database");
    return true;
  } catch (error) {
    console.error("Error in optimize_database migration:", error);
    throw error;
  }
}
