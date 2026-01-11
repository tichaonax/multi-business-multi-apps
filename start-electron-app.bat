@echo off
REM Wait for service to be ready
timeout /t 5 /nobreak > nul

REM Set environment variables
set PORT=8080
set NODE_ENV=production

REM Launch Electron
cd /d "C:\Users\ticha\apps\multi-business-multi-apps\electron"
start "" "C:\Users\ticha\apps\multi-business-multi-apps\electron\node_modules\electron\dist\electron.exe" .
