#!/bin/bash

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
    if lsof -i:$1 >/dev/null 2>&1; then
        echo "Port $1 is in use. Cleaning up..."
        pkill -f node || true
        sleep 2
    fi
}

# Function to install dependencies
install_deps() {
    echo "Installing dependencies..."
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
    
    # Start the application
    start_app
    
    # If we get here, check if the app is actually running
    if pgrep -f "node" > /dev/null; then
        echo "Application started successfully"
        break
    else
        echo "Application failed to start"
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo "Retrying in $BACKOFF_TIME seconds..."
            sleep $BACKOFF_TIME
            BACKOFF_TIME=$((BACKOFF_TIME * 2))
        else
            echo "Maximum attempts reached. Please check the logs and try again."
            exit 1
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

# Keep the script running to maintain the Replit environment
tail -f /dev/null
