@echo off
echo Checking Multi-Business Sync Service status...
sc query "multi-business-sync"
curl -s http://localhost:8766/health 2>nul
if %ERRORLEVEL% == 0 (
    echo Health check: OK
) else (
    echo Health check: FAILED
)