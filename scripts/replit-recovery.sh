#!/bin/bash

# Script to help recover from Replit recovery mode issues

echo "Replit Recovery Helper v2"
echo "========================="
echo "Running in directory: $(pwd)"
echo "Current PATH: $PATH"
echo "Searching for Node.js and npm..."

# Define paths to find and use Node.js and npm in Replit
NODE_PATHS=(
  "/nix/store/*/bin"
  "/opt/buildhome/.nix-profile/bin"
  "/home/runner/.nix-profile/bin"
  "/home/runner/nix/bin"
  "/nix/var/nix/profiles/default/bin"
  "/run/current-system/sw/bin"
  "/replit/packages/*/bin"
  "/home/runner/*"
  "/.local/bin"
  "/usr/local/bin"
  "/usr/bin"
  "/bin"
)

# Try direct commands first
echo "Checking for commands in PATH..."
which node 2>/dev/null && echo "Found node in PATH: $(which node)"
which npm 2>/dev/null && echo "Found npm in PATH: $(which npm)"

# Find Node.js and npm in common Replit paths
FOUND_NODE=""
FOUND_NPM=""

echo "Searching all potential Node.js locations..."
for path in "${NODE_PATHS[@]}"; do
  echo "Searching in $path..."
  
  # Find node
  if [ -z "$FOUND_NODE" ]; then
    echo "Looking for Node.js in $path..."
    POSSIBLE_NODE=$(find $path -name "node" -type f 2>/dev/null | grep -v "node-" | head -n 1)
    if [ ! -z "$POSSIBLE_NODE" ]; then
      if [ -x "$POSSIBLE_NODE" ]; then
        FOUND_NODE="$POSSIBLE_NODE"
        echo "✓ Found Node.js at: $FOUND_NODE"
        echo "  Version: $($FOUND_NODE --version 2>/dev/null || echo 'Unknown')"
      else
        echo "× Found non-executable Node.js at: $POSSIBLE_NODE"
      fi
    fi
  fi
  
  # Find npm
  if [ -z "$FOUND_NPM" ]; then
    echo "Looking for npm in $path..."
    POSSIBLE_NPM=$(find $path -name "npm" -type f 2>/dev/null | head -n 1)
    if [ ! -z "$POSSIBLE_NPM" ]; then
      if [ -x "$POSSIBLE_NPM" ]; then
        FOUND_NPM="$POSSIBLE_NPM"
        echo "✓ Found npm at: $FOUND_NPM"
        echo "  Version: $($FOUND_NPM --version 2>/dev/null || echo 'Unknown')"
      else
        echo "× Found non-executable npm at: $POSSIBLE_NPM"
      fi
    fi
  fi
  
  # Break if both found
  if [ ! -z "$FOUND_NODE" ] && [ ! -z "$FOUND_NPM" ]; then
    echo "Found both Node.js and npm! Proceeding..."
    break
  fi
done

# Try alternative search for npm if not found yet
if [ ! -z "$FOUND_NODE" ] && [ -z "$FOUND_NPM" ]; then
  echo "Found Node.js but not npm. Trying to find npm from Node.js location..."
  NODE_DIR=$(dirname "$FOUND_NODE")
  PARENT_DIR=$(dirname "$NODE_DIR")
  
  # Check in lib directories
  for npmpath in "$PARENT_DIR/lib/node_modules/npm/bin/npm" "$NODE_DIR/../lib/node_modules/npm/bin/npm"; do
    if [ -x "$npmpath" ]; then
      FOUND_NPM="$npmpath"
      echo "✓ Found npm at: $FOUND_NPM"
      break
    fi
  done
fi

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
