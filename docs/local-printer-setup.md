# Local Printer Setup — Remote Server

The app runs on a remote server (e.g. `http://192.168.1.211:8080`) but needs to print receipts on a USB thermal printer connected to a local machine. Two approaches are available.

---

## Option A — QZ Tray (Recommended)

**QZ Tray** is a small Java desktop application that runs in the Windows system tray. It exposes a WebSocket on `localhost:8182` that the browser connects to, allowing the web app to send ESC/POS commands directly to any printer the local machine can see — USB, network, or virtual.

### Why QZ Tray is better than Web Serial

| | QZ Tray | Web Serial |
|---|---|---|
| Browser support | All Chromium + Firefox | Chrome/Edge only |
| HTTP (no HTTPS) | Works with signed cert config | Requires Chrome flag |
| No browser flags needed | ✅ | ❌ |
| USB + Network printers | ✅ both | USB only |
| Re-pairing needed | No — auto-connects | No — remembers port |
| Print job logs | ✅ (QZ dashboard) | ❌ |
| Widely used in POS | ✅ | Limited |

---

### Installation

1. Download QZ Tray from **https://qz.io/download/**
2. Run the installer on the **client machine** (the one with the printer attached)
3. QZ Tray starts automatically and appears in the Windows system tray (look for the QZ icon near the clock)
4. Leave it running — it starts with Windows by default

> QZ Tray requires **Java 8 or later**. Download from https://java.com if not already installed.

---

### One-Time Certificate Setup (allows HTTP sites to connect)

By default QZ Tray only trusts HTTPS sites. To allow your HTTP server to connect:

1. Right-click the QZ Tray icon in the system tray → **Open File Location**
2. Navigate to the `demo` folder inside the QZ Tray install directory
3. Copy `demo-signing.crt` and `demo-signing.key` (the demo certificate files) to a safe location
4. In the app's admin settings (or ask your system administrator), paste the certificate content into **Settings → Printer → QZ Tray Certificate**

> For a production setup, generate a proper signing certificate using the QZ Tray docs at https://qz.io/wiki/2.1-signing-messages. The demo cert works fine on a LAN.

---

### How It Works

```
Browser (POS page on remote server)
  → JavaScript calls QZ Tray WebSocket on ws://localhost:8182
    → QZ Tray receives ESC/POS print job
      → Sends to local USB/network printer
        → Receipt prints
```

The server is only involved in generating the receipt data — the actual print job never leaves the local machine.

---

### Using QZ Tray in the App

Once QZ Tray is running on the client machine:

1. Go to any POS receipt preview modal
2. The printer dropdown will show **local printers** detected by QZ Tray (USB and network)
3. Select your printer and click **Print**

> If QZ Tray is not running, the dropdown will show a "QZ Tray not detected" message. Start QZ Tray from the system tray or from Start Menu.

---

### Troubleshooting QZ Tray

| Problem | Fix |
|---------|-----|
| "QZ Tray not detected" | Make sure QZ Tray is running (check system tray) |
| Printer not in list | Check that the printer is installed and visible in Windows Devices & Printers |
| Connection refused | QZ Tray may be blocked by firewall — add an exception for port 8182 |
| Garbled output | Check ESC/POS compatibility — set printer to ESC/POS mode (not Star mode) in printer settings |
| Java not found | Install Java from https://java.com and restart |

---

## Option B — Web Serial API (Chrome/Edge Only)

Uses the browser's built-in Web Serial API to send ESC/POS bytes directly to a USB printer via a virtual COM port. No extra software needed, but requires a one-time Chrome flag.

### Prerequisites

- **Chrome 89+** or **Edge (Chromium)** — Firefox and Safari not supported
- Windows thermal printer driver installed (creates a virtual COM port, e.g. COM3)

### One-Time Chrome Flag (HTTP workaround)

Web Serial requires a secure context (HTTPS). Since the server runs on HTTP:

1. Open Chrome and go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add your server address: `http://192.168.1.211:8080`
3. Click **Relaunch**

> This flag must be set on every machine that needs to print locally. If the server moves to HTTPS, this step is not needed.

### Pairing the Printer (first time only)

1. Open a sale at the POS and reach the receipt preview, or click **Setup Local USB Printer** in the printer dropdown
2. Chrome shows its native **serial port picker** — select your printer's COM port (e.g. `USB Serial Device (COM3)`)
3. The selection is saved to `localStorage` — Chrome remembers it on future visits without re-pairing

### Printing

1. Complete a sale
2. In the receipt preview modal, select **🖨 Local USB Printer** from the dropdown
3. Click **Print** — the receipt is generated in the browser and sent directly to the printer via the COM port. The server is not involved.

### Baud Rate (if receipt prints garbled)

Default is **9600 baud** (correct for EPSON TM-T20III and most Star printers).

To change it: open **Setup Local USB Printer**, adjust the baud rate, and click **Test Print**.

Common baud rates: 9600 · 19200 · 38400 · 115200

---

## Comparison Summary

| Feature | QZ Tray | Web Serial |
|---------|---------|------------|
| Extra software | QZ Tray + Java | None |
| Browser requirement | Any modern browser | Chrome/Edge only |
| HTTP server | Works (with cert config) | Needs Chrome flag |
| USB printers | ✅ | ✅ |
| Network printers | ✅ | ❌ |
| Setup complexity | Medium (one install) | Low (one flag) |
| Recommended for production | ✅ Yes | ⚠️ Dev/single machine |

**Recommendation:** Use **QZ Tray** for any production or multi-machine setup. Use **Web Serial** for quick single-machine testing or if Java is not available.

---

## Printer Compatibility

Both options have been tested with:

| Printer | Interface | Works with |
|---------|-----------|-----------|
| EPSON TM-T20III | USB | Both |
| EPSON TM-T82III | USB / Network | Both (network via QZ Tray) |
| Star TSP100 | USB | Both |
| Xprinter XP-58 | USB | Both |
| Generic 58mm/80mm thermal | USB | Both |

> Ensure the printer is set to **ESC/POS** emulation mode (not Star SMBL mode) for correct output.
