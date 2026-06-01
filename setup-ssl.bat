@echo off
REM ============================================================
REM  Multi-Business App — SSL Certificate Setup
REM  Run this script ONCE on any machine that needs to trust
REM  the app's HTTPS certificate (no admin required).
REM ============================================================

echo.
echo  Multi-Business App - SSL Trust Setup
echo  =====================================
echo.

REM Check that rootCA.pem is next to this script
if not exist "%~dp0rootCA.pem" (
    echo  ERROR: rootCA.pem not found in the same folder as this script.
    echo.
    echo  Copy BOTH files to the same folder before running:
    echo    rootCA.pem
    echo    setup-ssl.bat
    echo.
    pause
    exit /b 1
)

REM Install the root CA so Chrome/Edge trust the app certificate
echo  Installing trusted certificate authority...
certutil -addstore -user "Root" "%~dp0rootCA.pem"

if %ERRORLEVEL% == 0 (
    echo.
    echo  Done! Chrome and Edge will now trust the app certificate.
    echo  You can access the app at:
    echo    https://192.168.0.108:8080
    echo    https://192.168.1.211:8080
    echo.
) else (
    echo.
    echo  Installation failed. Try running as Administrator.
    echo.
)

pause
