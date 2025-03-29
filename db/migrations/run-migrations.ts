import { addProfileEnhancements } from './add_profile_enhancements.js';
import { addApiKeys } from './add_api_keys.js';
import { optimizeDatabase } from './optimize_database.js';
import { fixSchemaMismatch } from './fix_schema_mismatch.js';
import { addRememberMeToRefreshTokens } from './add_remember_me_to_refresh_tokens.js';

async function runMigrations() {
  console.log('Starting migrations...');
  
  try {
    // Run profile enhancements migration
    await addProfileEnhancements();
    
    // Run API keys migration
    await addApiKeys();
    
    // Run database optimization migration
    await optimizeDatabase();
    
    // Fix schema mismatches
    await fixSchemaMismatch();
    
    // Add remember_me column to refresh_tokens
    await addRememberMeToRefreshTokens();
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(console.error);
