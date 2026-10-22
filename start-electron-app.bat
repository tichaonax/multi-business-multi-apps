@echo off
REM Wait for service to be ready
timeout /t 5 /nobreak > nul

REM Set environment variables
set PORT=8080
set NODE_ENV=production

REM Launch Electron. %~dp0 = this file's folder (the project root), so the
REM launcher works for any Windows user / install location.
set "ELECTRON_DIR=%~dp0electron"
set "ELECTRON_EXE=%ELECTRON_DIR%\node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON_EXE%" (
  echo electron.exe not found at "%ELECTRON_EXE%"
  echo Run: cd "%ELECTRON_DIR%" ^&^& npm install
  pause
  exit /b 1
)
cd /d "%ELECTRON_DIR%"
start "" "%ELECTRON_EXE%" .
