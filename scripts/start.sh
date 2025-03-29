#!/bin/bash

# Detect Replit environment
IS_REPLIT=false
if [ -n "$REPL_ID" ] || [ -d "/home/runner" ]; then
    IS_REPLIT=true
    echo "Detected Replit environment"
fi

# Check if we're in recovery mode
IN_RECOVERY=false
if [ "$IS_REPLIT" = true ] && [ -z "$(which npm 2>/dev/null)" ]; then
    IN_RECOVERY=true
    echo "WARNING: Detected Replit recovery mode (npm not found)"
fi

# Function to find node and npm in Replit recovery mode
find_node_npm() {
    echo "Attempting to locate Node.js and npm in recovery mode..."
    
    # Define common paths in Replit where Node.js might be installed
    NODE_PATHS=(
        "/nix/store/*/bin"
        "/opt/buildhome/.nix-profile/bin"
        "/home/runner/.nix-profile/bin"
        "/home/runner/nix/bin"
        "/nix/var/nix/profiles/default/bin"
    )

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

    # If found, set up temporary functions
    if [ ! -z "$FOUND_NODE" ] && [ ! -z "$FOUND_NPM" ]; then
        echo "Setting up Node.js and npm for recovery mode"
        export PATH=$(dirname "$FOUND_NODE"):$(dirname "$FOUND_NPM"):$PATH
        
        # Define functions to use these binaries
        function node() {
            $FOUND_NODE "$@"
        }
        export -f node

        function npm() {
            $FOUND_NPM "$@"
        }
        export -f npm
        
        return 0
    else
        echo "ERROR: Could not find Node.js and npm in recovery mode"
        echo "Try manually installing with: nix-env -i nodejs"
        return 1
    fi
}

# Function to clean up processes and cache
cleanup() {
    echo "Cleaning up processes and cache..."
    pkill -f node || true
    rm -rf .cache/* || true
    rm -rf node_modules/.cache/* || true
    rm -rf dist/* || true
}

# Function to check if port is in use
check_port() {
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i:$1 >/dev/null 2>&1; then
            echo "Port $1 is in use. Cleaning up..."
            pkill -f node || true
            sleep 2
        fi
    else
        echo "lsof not available, skipping port check"
    fi
}

# Function to install dependencies
install_deps() {
    echo "Installing dependencies..."
    # Handle recovery mode
    if [ "$IN_RECOVERY" = true ]; then
        if ! find_node_npm; then
            echo "Failed to set up Node.js environment in recovery mode"
            echo "Please try exiting recovery mode and restarting"
            return 1
        fi
    fi

    # Now try installing
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies. Retrying with clean install..."
        rm -rf node_modules
        npm install
    fi
}

# Function to handle startup
start_app() {
    echo "Starting application..."
    if [ "$NODE_ENV" = "production" ]; then
        npm run build && NODE_ENV=production node dist/index.js
    else
        npm run dev
    fi
}

# Main recovery loop
MAX_ATTEMPTS=3
ATTEMPT=1
BACKOFF_TIME=5

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Startup attempt $ATTEMPT of $MAX_ATTEMPTS"
    
    # Check ports
    check_port 5000
    check_port 5001
    
    # Clean environment on first attempt or if previous attempt failed
    if [ $ATTEMPT -eq 1 ]; then
        cleanup
    fi
    
    # Install dependencies
    install_deps
    if [ $? -ne 0 ] && [ "$IN_RECOVERY" = true ]; then
        echo "Installation failed in recovery mode. Please try these steps:"
        echo "1. Run: chmod +x scripts/replit-recovery.sh"
        echo "2. Run: ./scripts/replit-recovery.sh"
        echo "3. Follow the instructions from the recovery script"
        exit 1
    fi
    
    # Start the application
    start_app
    
    # If we get here, check if the app is actually running
    if command -v pgrep >/dev/null 2>&1; then
        if pgrep -f "node" > /dev/null; then
            echo "Application started successfully"
            break
        else
            echo "Application failed to start"
        fi
    else
        # If pgrep isn't available, just assume it started
        echo "Application appears to have started (can't verify without pgrep)"
        break
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "Retrying in $BACKOFF_TIME seconds..."
        sleep $BACKOFF_TIME
        BACKOFF_TIME=$((BACKOFF_TIME * 2))
    else
        echo "Maximum attempts reached. Please check the logs and try again."
        exit 1
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

# Keep the script running to maintain the Replit environment
if [ "$IS_REPLIT" = true ]; then
    echo "Keeping environment alive..."
    tail -f /dev/null
fi
