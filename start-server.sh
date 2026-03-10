#!/bin/bash
# Start the Python HTTP server for Reddit Image Viewer

PORT=8000

# Check if server is already running
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "Server is already running on port $PORT"
    echo "Use ./restart-server.sh to restart it"
    exit 1
fi

# Start the server
echo "Starting Python HTTP server on port $PORT..."
python3 -m http.server $PORT

# Note: This will run in foreground. Press Ctrl+C to stop.
# To run in background, use: ./start-server.sh &
