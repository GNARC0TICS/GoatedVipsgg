#!/bin/bash

# Load environment variables
source .env

echo "Starting application with the following configuration:"
echo "Frontend (Vite) Port: $VITE_PORT"
echo "API Port: $API_PORT"
echo "Telegram Bot Port: $BOT_PORT"

# Clean up any processes that might be using our ports
cleanup_port() {
  port=$1
  echo "Checking for processes on port $port..."
  pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "Killing process $pid on port $port"
    kill -9 $pid
  else
    echo "No processes found on port $port"
  fi
}

cleanup_port $VITE_PORT
cleanup_port $API_PORT
cleanup_port $BOT_PORT

# Start the backend server
echo "Starting backend server on port $API_PORT..."
node --loader ts-node/esm ./server/index.ts &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 3

# Start the Telegram bot server
echo "Starting Telegram bot on port $BOT_PORT..."
node --loader ts-node/esm ./server/telegram/bot-server.ts &
BOT_PID=$!

# Start the frontend
echo "Starting frontend on port $VITE_PORT..."
npx vite --port $VITE_PORT --host 0.0.0.0 &
FRONTEND_PID=$!

# Function to handle shutdown
shutdown() {
  echo "Shutting down all processes..."
  [ ! -z "$BACKEND_PID" ] && kill -15 $BACKEND_PID
  [ ! -z "$BOT_PID" ] && kill -15 $BOT_PID
  [ ! -z "$FRONTEND_PID" ] && kill -15 $FRONTEND_PID
  exit 0
}

# Set up shutdown handlers
trap shutdown SIGINT SIGTERM

# Keep the script running
echo "All services started. Press Ctrl+C to stop."
wait