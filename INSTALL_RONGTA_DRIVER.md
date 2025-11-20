# Installing RONGTA 80mm Printer Driver

## Why This Is Needed
To use the printer as a "regular Windows printer" (without ESC/POS), the printer must be registered with Windows. Currently it's just a COM port device.

## Installation Steps

### Option 1: Auto-Detect (Easiest)
1. Open **Windows Settings** → **Devices** → **Printers & Scanners**
2. Click **"Add a printer or scanner"**
3. Windows should detect the RONGTA printer on COM3
4. Follow the installation wizard
5. Install driver when prompted

### Option 2: Manual Installation
1. **Download Driver:**
   - Visit: https://www.rongtatech.com/ (or manufacturer website)
   - Search for "80mm Series Printer Driver"
   - Download Windows driver for your OS version

2. **Install Driver:**
   - Run the downloaded installer
   - Follow installation wizard
   - Restart computer if prompted

3. **Add Printer:**
   - Open **Control Panel** → **Devices and Printers**
   - Click **"Add a printer"**
   - Select **"Add a local printer"**
   - Choose port: **COM3**
   - Select manufacturer: **RONGTA** (should appear after driver install)
   - Select printer model: **80mm Series** or similar
   - Give it a name: **"RONGTA 80mm Receipt"**
   - Complete installation

### Option 3: Generic Text-Only Driver
If you can't find RONGTA driver:
1. Open **Control Panel** → **Devices and Printers**
2. Click **"Add a printer"**
3. Select **"Add a local printer"**
4. Choose port: **COM3**
5. Select manufacturer: **Generic**
6. Select printer: **Generic / Text Only**
7. Complete installation

**Note:** Generic driver won't have all features but will work for basic text printing.

## Verification
After installation, run:
```bash
powershell -Command "Get-Printer | Select-Object Name, PortName"
```

You should see your printer listed with COM3 as the port.

## Then Run Simple Test
Once installed, run:
```bash
node scripts/test-simple-print.js
```

Update the PRINTER_NAME in the script to match what you named it.

---

## Alternative: Continue Using Direct COM Port
If you prefer not to install a driver, we can continue using direct COM3 communication, but you'll need ESC/POS commands for proper formatting.

The advantage of installing the driver:
- ✅ Simpler code
- ✅ Standard Windows APIs
- ✅ Better integration
- ✅ Easier maintenance

The advantage of direct COM port:
- ✅ No driver installation needed
- ✅ Full control over printer commands
- ⚠️ Requires ESC/POS knowledge
- ⚠️ More complex code
