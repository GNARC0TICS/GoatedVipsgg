#!/bin/bash
set -e  # Exit on any error

echo "Starting deployment process..."

# Step 1: Clean dist directory
echo "Cleaning dist directory..."
rm -rf dist
mkdir -p dist/public

# Step 2: Build frontend with Vite
echo "Building frontend with Vite..."
npm run dev:client -- --build

# Step 3: Compile TypeScript server code
echo "Compiling server TypeScript code..."
npm run check
tsc --project tsconfig.json --outDir dist

# Step 4: Ensure public directory exists in dist
echo "Setting up static files..."
if [ -d "dist/public" ]; then
  echo "Public directory exists in dist"
else
  echo "Creating public directory in dist..."
  mkdir -p dist/public
fi

# Step 5: Copy client build to public directory
echo "Copying client build to public directory..."
cp -r client/dist/* dist/public/

# Step 6: Copy environment variables
echo "Copying environment variables..."
cp .env dist/.env

# Step 7: Create production entry point
echo "Creating production entry point..."
cat > dist/index.js << EOF
// Production entry point
process.env.NODE_ENV = 'production';
import('./server/index.js').catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
EOF

echo "Deployment build completed! Run with: NODE_ENV=production node dist/index.js"