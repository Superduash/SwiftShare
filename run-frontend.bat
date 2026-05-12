@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
echo Starting SwiftShare frontend...
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
    if errorlevel 1 pause & exit /b 1
)

:: Force reload environment variables
set VITE_API_URL=http://localhost:3001
set VITE_SOCKET_URL=http://localhost:3001
set VITE_SHARE_BASE_URL=http://localhost:5173

echo.
echo Environment variables set:
echo VITE_API_URL=%VITE_API_URL%
echo VITE_SOCKET_URL=%VITE_SOCKET_URL%
echo.

call npm run dev -- --host
