// ESM wrapper for TypeScript execution
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Execute the TypeScript file
const { execSync } = require('child_process');

try {
  // Execute with proper error handling and stdio inheritance
  execSync('tsx server/index.ts', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: process.env.PORT || '5000'
    }
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}