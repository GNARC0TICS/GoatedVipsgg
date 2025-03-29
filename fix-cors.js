// Simple script to work around the CORS issue by using environment variables
import fs from 'fs';

try {
  console.log('Applying CORS fixes...');
  
  // Create a .env.development.local file with needed settings
  const envContent = `
# CORS Fix Settings for Vite
VITE_ALLOW_ALL_HOSTS=true
VITE_DEV_SERVER_HOST=0.0.0.0
VITE_DEV_SERVER_HMR_HOST=0.0.0.0
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_WATCH_USEPOLLING=true
VITE_SERVER_CORS=true
VITE_SERVER_STRICTPORT=false
VITE_SERVER_ORIGIN=*
VITE_SERVER_OPEN=false
VITE_DEV_SERVER_PORT=5173
`;

  fs.writeFileSync('./client/.env.development.local', envContent);
  console.log('Created ./client/.env.development.local with CORS fix settings');

  // Try to detect the Replit domain and add it to allowed hosts
  try {
    const output = process.env.REPL_SLUG || 'unknown-repl';
    const owner = process.env.REPL_OWNER || 'unknown-owner';
    const domain = `${output}.${owner}.repl.co`;
    console.log(`Detected Replit domain: ${domain} - adding to allowed hosts`);

    // Append to .env.development.local
    fs.appendFileSync('./client/.env.development.local', `VITE_ALLOWED_HOST=${domain}\n`);
  } catch (err) {
    console.error('Could not detect Replit domain:', err);
  }

  console.log('CORS fixes applied successfully. Please restart the server.');
} catch (err) {
  console.error('Error applying CORS fixes:', err);
}