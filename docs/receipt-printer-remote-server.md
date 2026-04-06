# Printing to a Local Receipt Printer from a Remote Server

## Option 1 — Browser `window.print()` (simplest)

The app already uses this pattern. When the receipt modal triggers print:
- The browser opens a print dialog
- You select your local receipt printer from the dialog
- Works with any printer the OS has installed
- **Limitation**: You have to pick the printer each time unless you set it as default

**To make it seamless**: Set your receipt printer as the default printer in Windows, then tick "Always use this printer" in the browser print dialog.

---

## Option 2 — QZ Tray (most common for receipt printers)

QZ Tray is a small Java app that runs on your local PC and acts as a bridge between the remote web app and your local hardware.

**Steps:**
1. Download and install **QZ Tray** from `qz.io` on the local PC
2. QZ Tray runs silently in the system tray and opens a WebSocket on `localhost:8182`
3. The remote web app includes the QZ Tray JS library
4. On print, the app connects to `ws://localhost:8182`, sends raw ESC/POS commands or PDF data, QZ Tray forwards it to the named printer

**Pros**: Silent printing (no dialog), raw ESC/POS support, works with thermal printers perfectly
**Cons**: Requires QZ Tray installed on every client PC, needs a signed certificate for HTTPS sites

---

## Option 3 — WebUSB / WebSerial (Chrome only)

Modern Chrome supports direct USB/serial communication from browser JS.

**Steps:**
1. User clicks "Connect Printer" once — browser prompts to select the USB device
2. Browser stores the permission
3. On print, the app writes raw ESC/POS bytes directly to the USB device — no dialog

**Pros**: No extra software needed
**Cons**: Chrome/Edge only, USB printers only (not network printers), requires HTTPS

---

## Option 4 — Local print agent (Node.js / Python)

Run a tiny HTTP server locally on the print PC:

```
Remote app  →  POST http://localhost:3001/print  →  Local agent  →  OS printer API
```

Tools like **node-printer**, **python-escpos**, or **PrintNode agent** handle the actual printing.

**PrintNode** (printnode.com) is a hosted version of this — install their agent locally, the remote server calls their API, they relay the job to your local printer.

---

## Recommended for your setup

| Scenario | Best option |
|----------|-------------|
| Already works, just want no dialog | Set receipt printer as default + save browser preference |
| Thermal printer, silent print required | **QZ Tray** |
| USB thermal printer, Chrome only | **WebUSB** |
| Multiple print stations, managed setup | **PrintNode** |

For most shop setups with a single till PC and a USB/network thermal printer, **QZ Tray** is the standard solution.
