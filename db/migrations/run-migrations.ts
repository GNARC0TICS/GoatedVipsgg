import { addProfileEnhancements } from './add_profile_enhancements';

async function runMigrations() {
  console.log('Starting migrations...');
  
  try {
    // Run profile enhancements migration
    await addProfileEnhancements();
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(console.error);
