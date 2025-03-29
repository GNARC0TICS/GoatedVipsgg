// Simple script to check database connection and structure
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDatabaseConnection() {
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✓ Database connection successful!');
    
    // Check for existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nDatabase Tables:');
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the database.');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    client.release();
  } catch (error) {
    console.error('Database connection error:', error.message);
  } finally {
    // Close pool
    await pool.end();
  }
}

checkDatabaseConnection();