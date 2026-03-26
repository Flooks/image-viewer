@echo off
REM Reddit Image Viewer - Local Server Startup Script

echo Starting Reddit Image Viewer Server...
echo.
echo Server will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

REM Change to the script's directory
cd /d "%~dp0"

REM Start Node.js server on port 8000
node server.js

pause
