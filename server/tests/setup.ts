import { resolve } from 'path';
import { config } from 'dotenv';
import { use } from 'chai';
import chaiHttp from 'chai-http';
import { db } from '@db';
import { sql } from 'drizzle-orm';

// Load environment variables
config();

// Configure chai
use(chaiHttp);

// Extend Chai assertions if needed
declare global {
  namespace Chai {
    interface Assertion {
      validSession(): void;
      validWebSocketConnection(): void;
    }
  }
}

// Add any global setup needed for tests
export const setupTestDatabase = async () => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    console.log('Database connection established for tests');

    // Clean up any test data from previous runs
    await cleanupTestData();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

async function cleanupTestData() {
  // Add cleanup logic here if needed
  // Be careful not to delete production data
  console.log('Test data cleanup completed');
}

// Global setup will run once before all test files
before(async () => {
  await setupTestDatabase();
});

// Global teardown will run once after all test files
after(async () => {
  // Clean up any test resources
  await cleanupTestData();
  console.log('Test suite completed');
});