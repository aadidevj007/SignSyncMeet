@echo off
echo ========================================
echo   Fixing and Restarting SignSync Meet
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Cleaning Next.js build cache...
cd apps\frontend
if exist .next (
    echo Removing .next directory...
    rmdir /s /q .next 2>nul
    timeout /t 1 /nobreak >nul
)
cd ..\..

echo [3/4] Cleaning TypeScript build cache...
cd apps\backend
if exist dist (
    rmdir /s /q dist 2>nul
)
cd ..\..

echo [4/4] Restarting servers...
echo.
echo Starting development servers...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

call pnpm dev

pause

