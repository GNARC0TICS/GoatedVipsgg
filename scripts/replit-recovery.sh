#!/bin/bash

# Script to help recover from Replit recovery mode issues

# Define paths to find and use Node.js and npm in Replit
NODE_PATHS=(
  "/nix/store/*/bin"
  "/opt/buildhome/.nix-profile/bin"
  "/home/runner/.nix-profile/bin"
  "/home/runner/nix/bin"
  "/nix/var/nix/profiles/default/bin"
)

echo "Replit Recovery Helper"
echo "======================="
echo "Searching for Node.js and npm..."

# Find Node.js and npm in common Replit paths
FOUND_NODE=""
FOUND_NPM=""

for path in "${NODE_PATHS[@]}"; do
  # Find node
  if [ -z "$FOUND_NODE" ]; then
    POSSIBLE_NODE=$(find $path -name "node" 2>/dev/null | grep -v "node-" | head -n 1)
    if [ ! -z "$POSSIBLE_NODE" ]; then
      FOUND_NODE="$POSSIBLE_NODE"
      echo "Found Node.js at: $FOUND_NODE"
    fi
  fi
  
  # Find npm
  if [ -z "$FOUND_NPM" ]; then
    POSSIBLE_NPM=$(find $path -name "npm" 2>/dev/null | head -n 1)
    if [ ! -z "$POSSIBLE_NPM" ]; then
      FOUND_NPM="$POSSIBLE_NPM"
      echo "Found npm at: $FOUND_NPM"
    fi
  fi
  
  # Break if both found
  if [ ! -z "$FOUND_NODE" ] && [ ! -z "$FOUND_NPM" ]; then
    break
  fi
done

# If we found both, set up the environment
if [ ! -z "$FOUND_NODE" ] && [ ! -z "$FOUND_NPM" ]; then
  echo "Setting up environment..."
  NODE_DIR=$(dirname "$FOUND_NODE")
  
  # Create helpers to run node and npm
  echo "#!/bin/bash
$FOUND_NODE \$@" > ./node-helper.sh
  echo "#!/bin/bash
$FOUND_NPM \$@" > ./npm-helper.sh
  
  chmod +x ./node-helper.sh ./npm-helper.sh
  
  echo ""
  echo "Success! You can now use Node.js and npm with:"
  echo "  ./node-helper.sh"
  echo "  ./npm-helper.sh"
  echo ""
  echo "Example: ./npm-helper.sh install"
  echo ""
  echo "To exit recovery mode, you can try:"
  echo "  ./node-helper.sh -e \"process.exit(0)\""
else
  echo ""
  echo "Error: Could not find Node.js and npm in the standard Replit locations."
  echo ""
  echo "Alternative approach:"
  echo "1. Try installing Node.js in recovery mode:"
  echo "   nix-env -i nodejs"
  echo ""
  echo "2. If that doesn't work, force a refresh in Replit by:"
  echo "   - Create a small file change"
  echo "   - Commit the change"
  echo "   - Reload the Replit tab in your browser"
fi

# Provide additional Replit-specific recovery information
echo ""
echo "Additional Replit recovery tips:"
echo "-------------------------------"
echo "1. If you're stuck in recovery mode, try hitting Ctrl+C to exit any running process"
echo "2. You may need to clear Replit's cache: rm -rf .cache/*"
echo "3. Sometimes deleting node_modules helps: rm -rf node_modules"
echo "4. As a last resort, you can fork the Repl to get a fresh environment"
