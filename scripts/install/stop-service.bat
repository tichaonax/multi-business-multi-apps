@echo off
echo Stopping Multi-Business Sync Service...
net stop "multi-business-sync"
if %ERRORLEVEL% == 0 (
    echo Service stopped successfully
) else (
    echo Failed to stop service
    exit /b 1
)