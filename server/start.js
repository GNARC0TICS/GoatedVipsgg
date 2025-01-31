// ESM wrapper for TypeScript execution
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Execute the TypeScript file
import('./index.ts').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
