@echo off
REM Build the C# launcher helper that launches processes in user session
REM This helper solves the Session 0 isolation problem for Electron

echo Building LaunchInUserSession.exe...

REM Find the .NET Framework C# compiler
set CSC_PATH=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

if not exist "%CSC_PATH%" (
    echo ERROR: C# compiler not found at %CSC_PATH%
    echo Please install .NET Framework 4.0 or later
    exit /b 1
)

REM Compile the launcher
"%CSC_PATH%" /target:exe /out:LaunchInUserSession.exe LaunchInUserSession.cs

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Compilation failed
    exit /b 1
)

echo SUCCESS: LaunchInUserSession.exe built successfully
echo.
echo Usage: LaunchInUserSession.exe "path\to\app.exe" "arguments"
