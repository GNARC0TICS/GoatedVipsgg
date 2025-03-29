#!/usr/bin/env nix-shell
#!nix-shell -i bash -p nodejs

node -e 'console.log("Node.js version:", process.version)'
npm -v
