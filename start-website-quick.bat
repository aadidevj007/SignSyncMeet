@echo off
title SignSync Meet - Development Server
color 0A

echo.
echo   ╔═══════════════════════════════════════════╗
echo   ║     SignSync Meet - Development Server    ║
echo   ╚═══════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Quick check for dependencies
if not exist "node_modules" (
    echo [INSTALL] Installing dependencies...
    call pnpm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
)

echo [START] Launching servers...
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo   Press Ctrl+C to stop
echo.

call pnpm dev

