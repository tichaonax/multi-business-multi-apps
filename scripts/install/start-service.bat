@echo off
echo Starting Multi-Business Sync Service...
net start "multi-business-sync"
if %ERRORLEVEL% == 0 (
    echo Service started successfully
) else (
    echo Failed to start service
    exit /b 1
)