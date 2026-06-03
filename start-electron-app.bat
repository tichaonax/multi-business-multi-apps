@echo off
REM Kill any existing Electron instances before starting fresh
taskkill /F /IM electron.exe /T >nul 2>&1
timeout /t 2 /nobreak > nul

REM Set environment variables
set PORT=8080
set NODE_ENV=production

REM Launch Electron
cd /d "C:\Users\ticha\apps\multi-business-multi-apps\electron"
start "" "C:\Users\ticha\apps\multi-business-multi-apps\electron\node_modules\electron\dist\electron.exe" .
