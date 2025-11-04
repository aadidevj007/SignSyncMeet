@echo off
title SignSync Meet
echo.
echo ============================================
echo   SignSync Meet - Starting Website
echo ============================================
echo.

REM Kill any existing processes
echo Checking for existing processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Set environment variables
set SUPABASE_URL=https://mivkqnyjbxaosgmsxfan.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDU4NTAsImV4cCI6MjA3NjQ4MTg1MH0.lsLzwEYhZP3gEdh96fmpaVu_VPVj8COPyHXKvvL--pM
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkwNTg1MCwiZXhwIjoyMDc2NDgxODUwfQ.wGj7hL78qFFGOvIG6pFZHc9BZo7xTOQv-kU9wy8sYnc
set NODE_ENV=development
set PORT=3001

REM Set Firebase for backend
set FIREBASE_PROJECT_ID=signsync-meet-f2053

REM Set Supabase environment variables for frontend
set NEXT_PUBLIC_SUPABASE_URL=https://mivkqnyjbxaosgmsxfan.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdmtxbnlqYnhhb3NnbXN4ZmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDU4NTAsImV4cCI6MjA3NjQ4MTg1MH0.lsLzwEYhZP3gEdh96fmpaVu_VPVj8COPyHXKvvL--pM

REM Load .env file if it exists (skip comments)
if exist .env (
    echo Loading .env file...
    for /f "eol=# tokens=*" %%i in (.env) do (
        for /f "tokens=1,* delims==" %%a in ("%%i") do (
            if not "%%a"=="" (
                set "%%a=%%b"
            )
        )
    )
)

REM MongoDB URI - Add your MongoDB connection string here
REM Get it from MongoDB Atlas: https://cloud.mongodb.com/
REM Replace <password> with your database password
REM Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
REM Uncomment and set the line below with your MongoDB URI:
REM set MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/signsync?retryWrites=true&w=majority

echo Environment configured!
echo.
echo ============================================
echo   URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo ============================================
echo.

REM Start the servers
call pnpm dev

pause

