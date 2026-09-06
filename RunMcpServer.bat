@echo off
setlocal

cd /d "%~dp0"

set "PORT=3000"
set "MCP_MODE=http"

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found in PATH.
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo Building MCP server...
call npm run build --workspace=@propperly/mcp-server-aws
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: build failed.
    pause
    exit /b 1
)

echo.
echo Starting MCP server on http://localhost:%PORT%  (health check: http://localhost:%PORT%/health)
echo Press Ctrl+C to stop.
echo.
call npm start --workspace=@propperly/mcp-server-aws

endlocal
