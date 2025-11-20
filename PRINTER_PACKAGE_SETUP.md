# Printer Package Setup Guide

## Issue

The `printer` npm package uses a native Node.js module (`node_printer.node`) that needs to be compiled for your specific Node.js version and architecture.

**Error:** `\\?\C:\Users\ticha\apps\multi-business-multi-apps\node_modules\printer\lib\node_printer.node is not a valid Win32 application.`

This means the prebuilt binary doesn't match your Node.js version or system architecture.

---

## Current Setup

The app is configured to:
1. **Try to load printer package** for RAW printing (most reliable)
2. **Fall back to Windows `print` command** if printer package fails

So printing will work even if printer package doesn't load, but RAW method is more reliable.

---

## Option 1: Use Windows Print Command (Already Working)

**No additional setup needed!** The app will automatically use Windows print command.

Your printer is registered as: **"EPSON TM-T20III Receipt"**

Test it:
```bash
node scripts/test-epson-printer.js
```

This uses the same method as the app's fallback.

---

## Option 2: Fix Printer Package (For RAW Printing)

If you want to use the RAW printing method (like your working code), you need to rebuild the native module.

### Prerequisites

1. **Install Visual Studio Build Tools**
   - Download: https://visualstudio.microsoft.com/downloads/
   - Or run: `npm install --global windows-build-tools` (as Administrator)
   - Requires: C++ build tools and Windows SDK

2. **Install node-gyp**
   ```cmd
   npm install -g node-gyp
   ```

### Rebuild Steps

```cmd
cd C:\Users\ticha\apps\multi-business-multi-apps
npm rebuild printer
```

### If Rebuild Fails

Try removing and reinstalling:
```cmd
npm uninstall printer
npm install printer --legacy-peer-deps
npm rebuild printer
```

### Verify It Works

```bash
node scripts/check-printer-package.js
```

**Expected Output:**
```
✅ printer package loaded successfully
✅ Found X printer(s)
📋 Available Printers:
   1. EPSON TM-T20III Receipt
   ...
```

---

## Option 3: Use Your Working Environment

If you have a separate environment where your printer code works:

1. **Check Node.js version** in working environment:
   ```bash
   node --version
   ```

2. **Match Node.js version** in this project:
   - Install same version using nvm or Node installer
   - Restart terminal
   - Rebuild: `npm rebuild printer`

3. **Copy working node_modules/printer** (if same Node version):
   ```cmd
   xcopy /E /I <working-project>\node_modules\printer node_modules\printer
   ```

---

## How the App Handles This

### In `src/lib/printing/printer-service-usb.ts`:

```typescript
// Try to load printer package
let printerPackage: any = null;
try {
  printerPackage = require('printer');
  console.log('✅ Using printer package for RAW printing');
} catch (error) {
  console.warn('⚠️  printer package not available, falling back to Windows print command');
}

// Later in printWindows():
if (printerPackage) {
  // Use RAW printing (most reliable)
  await printWithPrinterPackage(...);
} else {
  // Fall back to Windows print command
  await printToWindowsPrinter(...);
}
```

**Both methods send ESC/POS commands** - the difference is how they're delivered to the printer.

---

## Testing After Fix

### 1. Check Printer Package Status
```bash
node scripts/check-printer-package.js
```

### 2. Test Direct Print
```bash
node scripts/test-printer-raw.js
```

### 3. Test From App
1. Start dev server: `npm run dev`
2. Go to: http://localhost:8080/admin/printers
3. Click "Direct Test" on EPSON printer
4. Should print immediately

---

## Comparison: RAW vs Windows Print Command

| Method | Reliability | Speed | Setup Required |
|--------|-------------|-------|----------------|
| **RAW (printer package)** | ⭐⭐⭐⭐⭐ | Fast | Native module rebuild |
| **Windows print command** | ⭐⭐⭐⭐ | Moderate | None (already works) |
| **Direct USB port** | ⭐⭐⭐ | Fast | Port must be accessible |

**Recommendation:** Start with Windows print command (already working), fix printer package later if needed.

---

## Current Status

✅ **Printer Registered:** EPSON TM-T20III Receipt
✅ **Windows Driver:** Installed and working
✅ **App Integration:** Complete with fallback
⚠️ **Printer Package:** Native module needs rebuild
✅ **Fallback Method:** Windows print command ready

---

## Quick Test (No Setup Required)

The fastest way to test printing right now:

```bash
# This uses Windows print command (no printer package needed)
node scripts/test-epson-printer.js
```

If this prints successfully, the app will work the same way!

---

## Troubleshooting

### "printer package not available" in console

**This is OK!** The app will use Windows print command instead.

### Printing still doesn't work

1. **Check printer status:**
   ```bash
   node scripts/check-windows-printers.js
   ```
   Status should be "Normal", not "Error"

2. **Power cycle printer:**
   - Turn OFF
   - Unplug USB
   - Wait 10 seconds
   - Plug back in
   - Turn ON

3. **Test from Windows:**
   - Open Notepad
   - Type some text
   - File → Print → Select EPSON printer
   - Should print successfully

4. **Check app logs:**
   - Look for console output when clicking "Direct Test"
   - Should show either "Using printer package" or "Using Windows print command"

---

## Support

If you continue to have issues:

1. Share console output from `node scripts/test-epson-printer.js`
2. Share printer status from `node scripts/check-windows-printers.js`
3. Confirm Windows test print from Notepad works
4. Check if you see "Using Windows print command" or "Using printer package" in console

The app is designed to work with EITHER method, so at least one should work!
