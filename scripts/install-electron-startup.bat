@echo off
REM Install Electron Kiosk to Windows Startup
REM This creates a shortcut in the Startup folder to auto-start Electron on login

echo ========================================
echo Multi-Business Platform
echo Electron Kiosk Startup Installer
echo ========================================
echo.

REM Get current directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "STARTUP_SCRIPT=%SCRIPT_DIR%start-electron-kiosk.js"

REM Check if startup script exists
if not exist "%STARTUP_SCRIPT%" (
    echo ERROR: Startup script not found at:
    echo %STARTUP_SCRIPT%
    echo.
    pause
    exit /b 1
)

REM Get Startup folder path
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

REM Create VBScript to create shortcut
set "VBS_SCRIPT=%TEMP%\create_shortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%STARTUP_FOLDER%\Multi-Business-Kiosk.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "node.exe" >> "%VBS_SCRIPT%"
echo oLink.Arguments = """%STARTUP_SCRIPT%""" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%PROJECT_ROOT%" >> "%VBS_SCRIPT%"
echo oLink.Description = "Multi-Business Platform Kiosk Mode" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

echo Creating startup shortcut...
cscript //nologo "%VBS_SCRIPT%"

REM Clean up VBScript
del "%VBS_SCRIPT%"

if exist "%STARTUP_FOLDER%\Multi-Business-Kiosk.lnk" (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo.
    echo Electron kiosk has been added to Windows Startup
    echo.
    echo What this does:
    echo   - Waits for server to be ready
    echo   - Opens POS on primary monitor
    echo   - Opens customer display on secondary monitor
    echo.
    echo Location: %STARTUP_FOLDER%
    echo.
    echo To remove:
    echo   Run: scripts\uninstall-electron-startup.bat
    echo   Or delete: Multi-Business-Kiosk.lnk from Startup folder
    echo.
    echo To test now:
    echo   1. Close any running Electron windows
    echo   2. Run: npm run electron:start
    echo.
) else (
    echo.
    echo ERROR: Failed to create startup shortcut
    echo Please check permissions and try running as Administrator
    echo.
)

pause
