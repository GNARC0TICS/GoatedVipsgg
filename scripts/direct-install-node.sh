#!/bin/bash

# This is a minimal script for directly installing Node.js in Replit's recovery mode
# It tries multiple Replit-specific methods to get Node.js working

echo "Direct Node.js Installation for Replit Recovery Mode"
echo "==================================================="

# Try using nix-env directly
echo "Method 1: Using nix-env to install Node.js..."
nix-env -iA nixpkgs.nodejs

if command -v node >/dev/null; then
  echo "✓ Success! Node.js is now available."
  echo "Node version: $(node --version)"
  echo "npm version: $(npm --version)"
  exit 0
fi

# Try with nix-shell
echo "Method 2: Using nix-shell to provide Node.js..."
echo "#!/usr/bin/env nix-shell
#!nix-shell -i bash -p nodejs

node -e 'console.log(\"Node.js version:\", process.version)'
npm -v" > ./nix-node-shell.sh

chmod +x ./nix-node-shell.sh
./nix-node-shell.sh

echo "Method 3: Creating a persistent environment definition..."
mkdir -p ./.config/nix
echo 'with import <nixpkgs> {};
stdenv.mkDerivation {
  name = "node-env";
  buildInputs = [
    nodejs
  ];
}' > ./.config/nix/shell.nix

echo "#!/bin/bash
nix-shell ~/.config/nix/shell.nix" > ./use-node.sh
chmod +x ./use-node.sh

echo "
You can now try to use Node.js with:
  ./use-node.sh

This will launch a new shell with Node.js available.

If you're still stuck in recovery mode:
1. Try refreshing your Replit tab
2. Fork your Repl to get a fresh environment
3. Contact Replit support"
