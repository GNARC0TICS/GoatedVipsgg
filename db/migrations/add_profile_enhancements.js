import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from "drizzle-orm";

// This migration script adds the bio and profileColor fields to the users table
// Note: The fields are already defined in the schema, this just ensures they exist in the database

async function addProfileEnhancements() {
  console.log("Starting profile enhancements migration...");
  
  // Create a PostgreSQL connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const db = drizzle(pool);
  
  try {
    // Check if the columns already exist
    const bioColumnExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'bio'
    `);
    
    const profileColorColumnExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'profile_color'
    `);
    
    // Add bio column if it doesn't exist
    if (bioColumnExists.rowCount === 0) {
      console.log("Adding bio column to users table...");
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN bio TEXT
      `);
      console.log("Bio column added successfully.");
    } else {
      console.log("Bio column already exists, skipping...");
    }
    
    // Add profileColor column if it doesn't exist
    if (profileColorColumnExists.rowCount === 0) {
      console.log("Adding profile_color column to users table...");
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN profile_color TEXT
      `);
      console.log("Profile color column added successfully.");
    } else {
      console.log("Profile color column already exists, skipping...");
    }
    
    console.log("Profile enhancements migration completed successfully.");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addProfileEnhancements().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
