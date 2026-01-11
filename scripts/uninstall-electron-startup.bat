@echo off
REM Uninstall Electron Kiosk from Windows Startup

echo ========================================
echo Multi-Business Platform
echo Electron Kiosk Startup Uninstaller
echo ========================================
echo.

REM Get Startup folder path
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\Multi-Business-Kiosk.lnk"

if exist "%SHORTCUT%" (
    echo Removing startup shortcut...
    del "%SHORTCUT%"
    echo.
    echo SUCCESS! Electron kiosk removed from Windows Startup
    echo.
) else (
    echo.
    echo Startup shortcut not found at:
    echo %SHORTCUT%
    echo.
    echo Nothing to uninstall.
    echo.
)

pause
