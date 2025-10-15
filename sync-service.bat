@echo off
REM Multi-Business Sync Service Management Script
REM Usage: sync-service.bat [start|stop|restart|status|sync|help]

setlocal enabledelayedexpansion

REM Set default environment variables if not already set
if "%SYNC_REGISTRATION_KEY%"=="" set SYNC_REGISTRATION_KEY=b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7
if "%SYNC_PORT%"=="" set SYNC_PORT=8765
if "%SYNC_INTERVAL%"=="" set SYNC_INTERVAL=30000
if "%LOG_LEVEL%"=="" set LOG_LEVEL=info

REM Change to script directory
cd /d "%~dp0"

REM Build the service if needed
if not exist "dist\service\sync-service-runner.js" (
    echo Building sync service...
    call npm run build:service
    if errorlevel 1 (
        echo Failed to build sync service
        exit /b 1
    )
)

REM Default command is start
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=start

REM Execute the command
if "%COMMAND%"=="start" goto START
if "%COMMAND%"=="stop" goto STOP
if "%COMMAND%"=="restart" goto RESTART
if "%COMMAND%"=="status" goto STATUS
if "%COMMAND%"=="sync" goto SYNC
if "%COMMAND%"=="help" goto HELP
goto HELP

:START
echo Starting Multi-Business Sync Service...
echo Registration Key: %SYNC_REGISTRATION_KEY:~0,8%***
echo Port: %SYNC_PORT%
echo Sync Interval: %SYNC_INTERVAL%ms
echo Log Level: %LOG_LEVEL%
echo.
node dist\service\sync-service-runner.js start
goto END

:STOP
echo Stopping Multi-Business Sync Service...
node dist\service\sync-service-runner.js stop
goto END

:RESTART
echo Restarting Multi-Business Sync Service...
node dist\service\sync-service-runner.js restart
goto END

:STATUS
echo Multi-Business Sync Service Status:
node dist\service\sync-service-runner.js status
goto END

:SYNC
echo Triggering manual sync...
node dist\service\sync-service-runner.js sync
goto END

:HELP
echo Multi-Business Sync Service Manager
echo.
echo Usage: sync-service.bat [command]
echo.
echo Commands:
echo   start    Start the sync service (default)
echo   stop     Stop the sync service
echo   restart  Restart the sync service
echo   status   Show service status
echo   sync     Force manual sync with all peers
echo   help     Show this help
echo.
echo Environment Variables:
echo   SYNC_REGISTRATION_KEY  Registration key for secure peer discovery
echo   SYNC_PORT              Port to run sync service on (default: 8765)
echo   SYNC_INTERVAL          Sync interval in milliseconds (default: 30000)
echo   LOG_LEVEL              Log level: error, warn, info, debug (default: info)
echo.
echo Examples:
echo   sync-service.bat start
echo   set SYNC_PORT=3002 ^& sync-service.bat start
echo   set LOG_LEVEL=debug ^& sync-service.bat start
echo.
echo Note: Change SYNC_REGISTRATION_KEY from default for production use!
goto END

:END
endlocal