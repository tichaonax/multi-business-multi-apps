@echo off
echo ========================================
echo Cleaning up and restarting application
echo ========================================
echo.

echo Step 1: Killing all Node processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Node processes terminated
) else (
    echo    - No Node processes found
)
echo.

echo Step 2: Clearing Next.js cache...
if exist .next (
    rd /s /q .next 2>nul
    echo    ✓ Next.js cache cleared
) else (
    echo    - No cache to clear
)
echo.

echo Step 3: Regenerating Prisma client...
call npx prisma generate
echo    ✓ Prisma client regenerated
echo.

echo ========================================
echo Cleanup complete!
echo.
echo To start the server:
echo   npm run dev
echo ========================================
pause
