#!/bin/bash
# Restart the Node.js server for Reddit Image Viewer

PORT=8000

echo "Stopping any existing server on port $PORT..."

# Find and kill any process using the port
PID=$(lsof -ti:$PORT)
if [ ! -z "$PID" ]; then
    kill -9 $PID
    echo "Stopped server (PID: $PID)"
    sleep 1
else
    echo "No server was running on port $PORT"
fi

# Start the server in background
echo "Starting Node.js server on port $PORT..."
nohup node server.js > server.log 2>&1 &
NEW_PID=$!

echo "Server started in background (PID: $NEW_PID)"
echo "Access the app at: http://localhost:$PORT"
echo "Server logs are being written to: server.log"
echo ""
echo "To stop the server, run: kill $NEW_PID"
echo "Or use: lsof -ti:$PORT | xargs kill -9"
