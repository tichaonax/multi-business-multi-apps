@echo off
echo ============================================================
echo Regenerating Prisma Client
echo ============================================================
echo.
echo This will:
echo 1. Kill any running Node processes (including dev server)
echo 2. Regenerate the Prisma client with latest schema
echo 3. Instructions to restart dev server
echo.
pause

echo.
echo Step 1: Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% == 0 (
    echo    ✓ Stopped Node processes
) else (
    echo    ℹ No Node processes were running
)

echo.
echo Step 2: Regenerating Prisma client...
call npx prisma generate

if %ERRORLEVEL% == 0 (
    echo    ✓ Prisma client regenerated successfully
    echo.
    echo ============================================================
    echo ✅ SUCCESS!
    echo ============================================================
    echo.
    echo Next steps:
    echo 1. Restart your dev server: npm run dev
    echo 2. Test the inventory API
    echo.
) else (
    echo    ❌ Failed to regenerate Prisma client
    echo    Please check the error above
)

pause
