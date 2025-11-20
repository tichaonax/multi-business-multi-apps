# EPSON TM-T20III Printer Troubleshooting Guide

## Current Status

✅ **Printer Registered:** "EPSON TM-T20III Receipt"
✅ **Database Entry:** Created successfully
✅ **Test Job Sent:** Print spooler accepted the job
⚠️ **Printer Status:** Shows "Error, PendingDeletion" in Windows

---

## Issue Identified

Your EPSON TM-T20III is **registered with Windows** but has an error state. The printer detection found:

```
Name          : EPSON TM-T20III Receipt
DriverName    : EPSON TM-T(203dpi) Receipt6
PortName      : TMUSB002
PrinterStatus : Error, PendingDeletion
```

**This is why printing isn't working from the app.** The Windows driver is in an error state.

---

## Solution Steps

### Option 1: Clear Printer Error (Recommended)

1. **Turn printer OFF completely**
2. **Unplug USB cable** from computer
3. **Wait 10 seconds**
4. **Plug USB cable back in**
5. **Turn printer ON**
6. **Wait for Windows to recognize it** (30 seconds)
7. **Run verification:** `node scripts/check-windows-printers.js`
8. **Check status:** Should show "Normal" instead of "Error"

### Option 2: Reinstall Printer Driver

If Option 1 doesn't work:

1. Open **Control Panel** > **Devices and Printers**
2. Right-click **"EPSON TM-T20III Receipt"**
3. Select **"Remove device"**
4. Wait for it to disappear
5. **Unplug USB cable**
6. **Reinstall EPSON driver** from manufacturer website
7. **Plug USB cable back in**
8. Windows should auto-detect and install

### Option 3: Clear Print Spooler (Requires Admin)

**Run Command Prompt as Administrator:**

```cmd
net stop spooler
del /Q /F /S "%systemroot%\System32\spool\PRINTERS\*.*"
net start spooler
```

Then restart the printer.

---

## Verification Commands

After fixing, run these to verify:

### 1. Check Printer Status
```bash
node scripts/check-windows-printers.js
```

**Expected:** PrinterStatus should be "Normal"

### 2. Test Print from Script
```bash
node scripts/test-epson-printer.js
```

**Expected:** Receipt should print with ESC/POS formatting

### 3. Test from Admin UI
1. Go to: http://localhost:8080/admin/printers
2. Find "EPSON TM-T20III Receipt"
3. Click **"Direct Test"** button
4. Receipt should print immediately

---

## Why This Happened

**"Error, PendingDeletion"** typically occurs when:
- Print jobs got stuck in the queue
- Driver lost communication with printer
- Printer was unplugged while jobs were pending
- Windows tried to remove printer but failed

---

## Current Setup

Your printer is now configured to use:
- **Printer Name:** `EPSON TM-T20III Receipt` (Windows driver name)
- **Connection Method:** Windows Print Spooler (not direct USB port)
- **Port:** `TMUSB002` (managed by Windows)
- **Driver:** `EPSON TM-T(203dpi) Receipt6`
- **Capabilities:** ESC/POS commands

**This is the CORRECT setup** because:
✅ Uses the same driver as your working test utility
✅ More reliable than direct port access
✅ Compatible with Windows printer management
✅ Supports ESC/POS commands via spooler

---

## Testing After Fix

Once the printer status shows "Normal", test in this order:

### 1. Script Test (Direct)
```bash
node scripts/test-epson-printer.js
```
This tests the Windows driver directly.

### 2. Admin UI Test
- http://localhost:8080/admin/printers
- Click "Direct Test" button
- Tests the app's print service

### 3. POS Test
- http://localhost:8080/clothing/pos
- Create test order
- Complete payment
- Should auto-print receipt

---

## What to Check on Physical Printer

Before testing:
1. ✅ Printer is **powered ON**
2. ✅ **Paper is loaded** correctly
3. ✅ **USB cable** is firmly connected
4. ✅ Printer **cover is closed**
5. ✅ No **error lights** blinking on printer
6. ✅ **Paper roll** has sufficient paper

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Error, PendingDeletion" | Stuck in removal state | Restart printer, replug USB |
| "Access is denied" | Need admin rights | Run Command Prompt as Admin |
| "Printer not found" | Not registered in Windows | Reinstall driver |
| "Port not available" | USB communication lost | Replug cable, restart printer |
| "Print spooler error" | Spooler service crashed | Restart spooler service |

---

## Success Indicators

When everything is working, you should see:

### In Windows (via check-windows-printers.js):
```
Name          : EPSON TM-T20III Receipt
PrinterStatus : Normal
PortName      : TMUSB002
```

### In App (http://localhost:8080/admin/printers):
- Green dot next to printer name
- "Direct Test" button prints immediately
- Receipt has dark text, centered headers, auto-cuts

### In POS (http://localhost:8080/clothing/pos):
- Orders print automatically on payment
- No printer selection dialog needed
- Receipts are properly formatted

---

## Next Steps

1. **Fix the printer error state** (see Option 1 above)
2. **Verify status is Normal:** `node scripts/check-windows-printers.js`
3. **Test printing:** `node scripts/test-epson-printer.js`
4. **Test from admin UI:** http://localhost:8080/admin/printers
5. **Test from POS:** Complete a test order

---

## Support Scripts Created

| Script | Purpose |
|--------|---------|
| `check-windows-printers.js` | Lists all Windows printers and their status |
| `fix-epson-printer.js` | Clears print jobs and restarts spooler (needs admin) |
| `test-epson-printer.js` | Sends ESC/POS test receipt via Windows driver |
| `register-epson-printer.js` | Registers printer in app database |

---

## Technical Details

**Why we're using Windows driver instead of direct USB:**
- Your printer test utility works via Windows driver
- More stable and reliable
- Handles spooling and buffering
- Compatible with existing driver installation
- Supports all ESC/POS commands
- Managed by Windows printer subsystem

**How printing works:**
1. App generates ESC/POS receipt text
2. Saves to temp file (binary format)
3. Sends to Windows via `print /D:"printer name" file.prn`
4. Windows spooler processes the job
5. Driver sends to TMUSB002 port
6. Printer receives and prints

This is the standard, reliable method that should work consistently.
