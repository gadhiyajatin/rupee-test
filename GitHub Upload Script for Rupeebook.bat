@echo off
title GitHub Upload Script - Force Init
color 0A

:: =================================================
::       GitHub Upload Script - Force Init
:: =================================================

:: Set GitHub Repo URL here
set "REMOTE_URL=https://github.com/gadhiyajatin/rupee-test.git"
:: Change to the directory where this script is located
cd /d "%~dp0"

echo.
echo Working directory: %cd%

echo Removing old Git repository...
rmdir /s /q .git >nul 2>&1

echo Initializing new Git repository...
git init >nul

echo Setting Git identity...
git config user.name "Jatin Patel"
git config user.email "gadhiyajatin@gmail.com"

echo Setting line ending handling...
git config core.autocrlf true

echo Adding all files...
git add . >nul

:: Generate timestamp for commit message
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set "DATE=%%a-%%b-%%c"
)
for /f "tokens=1-2 delims=:." %%a in ("%time%") do (
    set "TIME=%%a-%%b"
)

echo Committing changes...
git commit -m "Auto commit - %DATE% %TIME%" >nul

echo Adding remote URL...
git remote add origin %REMOTE_URL% >nul 2>&1

echo Pushing to GitHub...
git branch -M main >nul
git push -u origin main --force

echo.
echo =================================================
echo ✅ Upload completed successfully!
echo Repository: %REMOTE_URL%
echo =================================================
pause
