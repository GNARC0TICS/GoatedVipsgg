import { addProfileEnhancements } from './add_profile_enhancements';
import { addApiKeys } from './add_api_keys';

async function runMigrations() {
  console.log('Starting migrations...');
  
  try {
    // Run profile enhancements migration
    await addProfileEnhancements();
    
    // Run API keys migration
    await addApiKeys();
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(console.error);
