#!/bin/bash

# EMERGENCY REPLIT RECOVERY SCRIPT
# This script is designed for the most restricted Replit recovery environments
# It avoids complex operations and provides the most direct approach

echo "EMERGENCY REPLIT RECOVERY"
echo "========================="
echo "Running in: $(pwd 2>/dev/null || echo 'unknown directory')"
echo "Current user: $(whoami 2>/dev/null || echo 'unknown user')"

# Try most direct commands first
echo "Checking basic command availability..."
for cmd in bash sh node npm nix nix-env nix-shell; do
  echo -n "Command '$cmd': "
  if command -v $cmd >/dev/null 2>&1; then
    echo "✓ AVAILABLE"
  else
    echo "✗ NOT FOUND"
  fi
done

echo ""
echo "RECOVERY METHODS:"
echo "=================="

# METHOD 1: Super direct Node.js export
echo "METHOD 1: Direct path search"
NODE_LOCATIONS=(
  "/nix/store/*/nodejs-*/bin/node"
  "/home/runner/.nix-profile/bin/node"
  "/usr/bin/node"
  "/bin/node"
)

for node_path in "${NODE_LOCATIONS[@]}"; do
  # Use ls instead of find for more restrictive environments
  for path in $(ls $node_path 2>/dev/null); do
    if [ -x "$path" ]; then
      echo "Found executable node at: $path"
      
      NODE_BIN=$(dirname "$path")
      echo "Creating direct helper scripts..."
      echo "#!/bin/sh
export PATH=\"$NODE_BIN:\$PATH\"
node \$@" > ./node-direct.sh
      echo "#!/bin/sh
export PATH=\"$NODE_BIN:\$PATH\"
npm \$@" > ./npm-direct.sh
      
      chmod +x ./node-direct.sh ./npm-direct.sh
      echo "✓ Created node-direct.sh and npm-direct.sh"
      echo "  Try running: ./node-direct.sh -v"
      break 2
    fi
  done
done

# METHOD 2: Use nix-shell for a temporary environment
echo ""
echo "METHOD 2: Nix-shell temporary environment"
echo "#!/usr/bin/env nix-shell
#!nix-shell -i bash -p nodejs
export PATH=\"\$PATH:/nix/store/*/bin\"
node -e 'console.log(\"Node.js version: \" + process.version)'
npm -v" > ./nix-node-temp.sh
chmod +x ./nix-node-temp.sh
echo "✓ Created nix-node-temp.sh"
echo "  Try running: ./nix-node-temp.sh"

# METHOD 3: Direct installation attempt
echo ""
echo "METHOD 3: Installation attempt"
echo "#!/bin/sh
echo \"Attempting to install Node.js...\"
nix-env -iA nixpkgs.nodejs
echo \"PATH after install: \$PATH\"
node -v" > ./install-node.sh
chmod +x ./install-node.sh
echo "✓ Created install-node.sh"
echo "  Try running: ./install-node.sh"

echo ""
echo "==========================================="
echo "USAGE INSTRUCTIONS:"
echo "1. Try each method in order until one works"
echo "2. If Method 1 works, you can use:"
echo "   ./node-direct.sh -v"
echo "   ./npm-direct.sh install"
echo ""
echo "3. If nothing works, try these steps:"
echo "   - Restart your Replit workspace"
echo "   - Create a small file change and commit it"
echo "   - Clear your browser cache and reload"
echo "   - Fork the Repl to get a fresh environment"
echo "==========================================="
