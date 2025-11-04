@echo off
echo ========================================
echo   Cleaning and Restarting Website
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/5] Cleaning Next.js build cache...
cd apps\frontend
if exist .next (
    echo Removing .next directory...
    powershell -Command "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
    timeout /t 2 /nobreak >nul
)
cd ..\..

echo [3/5] Cleaning TypeScript build cache...
cd apps\backend
if exist dist (
    rmdir /s /q dist 2>nul
)
cd ..\..

echo [4/5] Waiting for file locks to release...
timeout /t 3 /nobreak >nul

echo [5/5] Restarting servers...
echo.
echo   Frontend: https://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

call pnpm dev

pause

