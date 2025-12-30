@echo off
echo ================================================
echo Clearing Print Queue for Brother MFC-7860DW
echo ================================================
echo.

echo Step 1: Showing current print jobs...
powershell -Command "Get-PrintJob -PrinterName 'Brother MFC-7860DW Printer' | Select-Object Id, JobStatus, SubmittedTime, DocumentName"
echo.

echo Step 2: Cancelling all print jobs...
powershell -Command "Get-PrintJob -PrinterName 'Brother MFC-7860DW Printer' | Remove-PrintJob"
echo.

echo Step 3: Verifying queue is empty...
powershell -Command "Get-PrintJob -PrinterName 'Brother MFC-7860DW Printer' | Select-Object Id, JobStatus"
echo.

echo ================================================
echo Print queue cleared!
echo You can now reset the printer and try again.
echo ================================================
pause
