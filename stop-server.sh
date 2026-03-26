#!/bin/bash
# Stop the Node.js server for Reddit Image Viewer

PORT=8000

echo "Stopping server on port $PORT..."

# Find and kill any process using the port
PID=$(lsof -ti:$PORT)
if [ ! -z "$PID" ]; then
    kill -9 $PID
    echo "Server stopped (PID: $PID)"
else
    echo "No server is running on port $PORT"
fi
