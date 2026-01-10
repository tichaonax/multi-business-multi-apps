@echo off
:: Start Multi-Business POS with Electron
:: Automatically opens customer display on secondary monitor

echo.
echo ======================================
echo   Multi-Business POS - Electron
echo ======================================
echo.

:: Check if second monitor is connected
echo Checking for secondary monitor...
powershell -Command "if ((Get-WmiObject -Class Win32_DesktopMonitor).Count -lt 2) { Write-Host 'WARNING: Only 1 monitor detected. Customer display requires 2 monitors.' -ForegroundColor Yellow } else { Write-Host 'Secondary monitor detected!' -ForegroundColor Green }"

echo.
echo Select POS type:
echo   1. Restaurant POS
echo   2. Grocery POS
echo   3. Hardware POS
echo   4. Clothing POS
echo.

set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    set POS_TYPE=restaurant
    set POS_NAME=Restaurant
)
if "%choice%"=="2" (
    set POS_TYPE=grocery
    set POS_NAME=Grocery
)
if "%choice%"=="3" (
    set POS_TYPE=hardware
    set POS_NAME=Hardware
)
if "%choice%"=="4" (
    set POS_TYPE=clothing
    set POS_NAME=Clothing
)

echo.
echo Starting %POS_NAME% POS...
echo.
echo Primary Monitor: POS System
echo Secondary Monitor: Customer Display (Fullscreen)
echo.

:: Start Electron with selected POS type
npm start

pause
