@echo off
echo Cleaning Next.js build cache...
cd /d "%~dp0"
if exist .next (
    echo Removing .next directory...
    rmdir /s /q .next 2>nul
    timeout /t 1 /nobreak >nul
)
echo Clean complete!

