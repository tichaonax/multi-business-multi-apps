# Installing EPSON TM-T20III Printer Driver

## Printer Information
- **Model:** EPSON TM-T20III
- **Type:** Thermal Receipt Printer (80mm)
- **Current Connection:** COM3
- **Status:** Not registered with Windows (need to install driver)

---

## Installation Steps

### Step 1: Download EPSON Driver

**Official EPSON Download Page:**
https://epson.com/Support/Point-of-Sale/Thermal-Printers/Epson-TM-T20III/s/SPT_C31CH51001

**Direct Driver Download:**
1. Visit the link above
2. Select your Windows version (Windows 10/11)
3. Download **"EPSON Advanced Printer Driver"** or **"EPSON TM-T20III Driver"**
4. Save the installer to your Downloads folder

**Alternative:** Use EPSON TM Utility Driver (supports multiple EPSON models)

---

### Step 2: Install the Driver

1. **Run the Installer:**
   - Locate the downloaded file (usually in Downloads folder)
   - Right-click → **"Run as Administrator"**
   - Follow the installation wizard

2. **Accept License Agreement**

3. **Choose Installation Type:**
   - Select **"Standard Installation"** (recommended)

4. **Wait for Installation:**
   - Let the installer complete
   - May take 2-5 minutes

5. **Restart if Prompted:**
   - If Windows asks to restart, do so

---

### Step 3: Add Printer to Windows

After driver is installed:

1. **Open Device Manager:**
   ```bash
   devmgmt.msc
   ```

2. **Check COM3 is Visible:**
   - Expand **"Ports (COM & LPT)"**
   - Verify you see **COM3** listed
   - Note the device name (e.g., "USB Serial Port (COM3)")

3. **Add Printer in Windows:**
   - Open **Settings** → **Devices** → **Printers & Scanners**
   - Click **"Add a printer or scanner"**
   - Click **"The printer that I want isn't listed"**

4. **Manual Printer Setup:**
   - Select **"Add a local printer or network printer with manual settings"**
   - Click **"Next"**

5. **Select Port:**
   - Choose **"Use an existing port"**
   - Select **COM3** from dropdown
   - Click **"Next"**

6. **Select Driver:**
   - Manufacturer: **EPSON**
   - Printer: **EPSON TM-T20III Receipt**
   - Click **"Next"**

7. **Name the Printer:**
   - Name: **EPSON TM-T20III Receipt**
   - Click **"Next"**

8. **Complete Setup:**
   - Do NOT share the printer (unless needed)
   - Do NOT set as default (unless you want to)
   - **Important:** Check **"Print a test page"**
   - Click **"Finish"**

---

### Step 4: Configure Printer Settings

1. **Open Printer Properties:**
   - Go to **Control Panel** → **Devices and Printers**
   - Right-click **"EPSON TM-T20III Receipt"**
   - Select **"Printer Properties"**

2. **Port Settings:**
   - Click **"Ports"** tab
   - Verify **COM3** is selected
   - Click **"Configure Port"**

3. **COM Port Settings** (Important!)
   - Bits per second: **38400** or **115200** (check printer manual)
   - Data bits: **8**
   - Parity: **None**
   - Stop bits: **1**
   - Flow control: **None** or **Hardware**
   - Click **"OK"**

4. **Paper Size:**
   - Click **"Device Settings"** or **"Printing Preferences"**
   - Paper width: **80mm** (3.15 inches)
   - Paper type: **Roll Paper**
   - Click **"Apply"**

---

### Step 5: Verify Installation

Run this command to verify printer is registered:

```bash
powershell -Command "Get-Printer -Name 'EPSON TM-T20III Receipt' | Select-Object Name, PortName, DriverName, PrinterStatus | Format-List"
```

**Expected Output:**
```
Name          : EPSON TM-T20III Receipt
PortName      : COM3
DriverName    : EPSON TM-T20III
PrinterStatus : Normal
```

---

### Step 6: Test Printing

Update the test script with correct printer name:

```javascript
// In scripts/test-simple-print.js
const PRINTER_NAME = 'EPSON TM-T20III Receipt';
```

Then run:
```bash
node scripts/test-simple-print.js
```

Receipt should print successfully!

---

## Troubleshooting

### Problem: Driver Installation Fails
**Solution:**
1. Uninstall any conflicting printer drivers
2. Restart computer
3. Run installer as Administrator
4. Disable antivirus temporarily during install

### Problem: COM3 Not Showing in Port List
**Solution:**
1. Check printer is connected and powered on
2. Open Device Manager → Ports (COM & LPT)
3. Verify COM3 exists
4. If not, check USB cable or restart printer

### Problem: Test Page Doesn't Print
**Solution:**
1. Check baud rate in port settings (try 38400, 115200, or 9600)
2. Verify paper is loaded
3. Check printer power and cable connections
4. Try printing from Notepad to test Windows printing

### Problem: Text is Garbled
**Solution:**
1. Wrong baud rate → adjust in Port Settings
2. Try different flow control settings (None/Hardware/Software)
3. Check data bits = 8, parity = None, stop bits = 1

---

## Alternative: EPSON Opos Driver

If standard driver doesn't work, try **EPSON OPOS (OLE POS) Driver**:

1. Download from: https://epson.com/Support/wa00821
2. Install EPSON OPOS ADK (Advanced Driver Kit)
3. Use OPOS SetupPOS utility to configure
4. This provides more control over thermal printer features

---

## After Successful Installation

Once printer works with Windows, you can:

1. ✅ Remove all ESC/POS code from the application
2. ✅ Use simple text-based printing
3. ✅ Simplify printer service to just use Windows print command
4. ✅ Reduce code complexity significantly

The driver will handle:
- Paper cutting commands
- Text formatting
- Line feeds
- All printer-specific features

---

## Need Help?

- EPSON Support: https://epson.com/support
- Phone: 1-888-377-6611 (US)
- EPSON TM-T20III Manual: https://files.support.epson.com/pdf/pos/bulk/tm-t20iii_ug.pdf
