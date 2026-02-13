# Local USB Printer Support via Web Serial API

## Context
The app runs on a remote server (192.168.0.108:8080) but users need to print receipts on printers physically connected to their local machine via USB. The current print system only supports server-connected printers through a print queue worker. We need a client-side print path that bypasses the server entirely.

**Approach**: Use the Web Serial API (Chromium browsers) to send ESC/POS data directly from the browser to a locally-connected USB thermal printer. Web Serial is preferred over WebUSB because Windows printer drivers claim exclusive USB access, breaking WebUSB. Most thermal printers expose virtual COM ports on Windows that Web Serial can access.

**Key insight**: `generateReceipt()` in `receipt-templates.ts` is a pure function (no server dependencies) that already outputs ESC/POS command strings. We just need to convert the string to bytes and write to the serial port. No receipt reformatting needed.

## Prerequisites
Web Serial requires a **secure context** (HTTPS). Since the app is served via HTTP on LAN, clients need one of:
- **Chrome flag** (simplest): Navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://192.168.0.108:8080`, restart Chrome
- **Or** set up HTTPS with a self-signed certificate on the server (future enhancement)

## Architecture

### Current Print Flow (Server-Side)
```
Browser (POS) → ReceiptPrintManager.printReceipt()
  → UnifiedReceiptPreviewModal (selects network printer from /api/printers)
    → printReceipt() in print-receipt.ts
      → POST /api/print/receipt (server)
        → generateReceipt() creates ESC/POS string
        → printRawData() sends to server-connected printer via Windows Spooler
```

### New Print Flow (Local Client-Side)
```
Browser (POS) → ReceiptPrintManager.printReceipt()
  → UnifiedReceiptPreviewModal (selects "Local USB Printer" OR network printer)
    IF local printer selected:
      → generateReceipt() runs CLIENT-SIDE to create ESC/POS string
      → Convert string to Uint8Array
      → Send via Web Serial port directly to local printer
    ELSE:
      → (existing server flow, unchanged)
```

## Changes

### 1. Create `src/lib/printing/local-serial-printer.ts` (NEW)
Core client-side module — Web Serial wrapper for thermal printers.

**Exports:**
- `isWebSerialSupported()` — checks if `navigator.serial` exists
- `requestLocalPrinter(name, baudRate)` — triggers browser's serial port picker (requires user click), stores config in localStorage
- `getLocalPrinterConfig()` — reads saved config from localStorage
- `printToLocalPrinter(escPosString, copies)` — reconnects to saved port via `navigator.serial.getPorts()`, converts ESC/POS string to `Uint8Array`, writes in 4KB chunks, closes port
- `testLocalPrinter()` — sends a short test receipt
- `clearLocalPrinterConfig()` — removes saved config

**ESC/POS string → bytes conversion:**
```typescript
function escPosStringToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xFF;
  }
  return bytes;
}
```

**Serial connection defaults:** 9600 baud, 8 data bits, 1 stop bit, no parity (standard for EPSON TM-T20III).

### 2. Add `LocalPrinterInfo` type to `src/types/printing.ts` (MODIFY — ~10 lines)
```typescript
export interface LocalPrinterInfo {
  id: 'local-serial'
  printerName: string
  printerType: 'receipt'
  isLocal: true
  isOnline: boolean
  baudRate: number
}
```

### 3. Create `src/components/printing/local-printer-setup.tsx` (NEW)
Small setup component for pairing a local USB printer.

**UI:**
- "Connect USB Printer" button → triggers `requestLocalPrinter()` → browser's native serial port picker
- Shows connected printer info (name, baud rate)
- Baud rate selector: 9600 (default), 19200, 38400, 57600, 115200
- Custom name input
- "Test Print" button
- "Disconnect" button
- Unsupported browser message when Web Serial unavailable

### 4. Modify `src/components/receipts/unified-receipt-preview-modal.tsx` (MODIFY — ~50 lines)
This is the primary integration point.

**Changes to `loadPrinters()`:**
- After fetching network printers from `/api/printers`, also check `getLocalPrinterConfig()`
- If a local printer is configured, add it as a synthetic entry in the printer list with id `'local-serial'`

**Changes to `handlePrint()`:**
- If selected printer id is `'local-serial'`:
  1. Import and call `generateReceipt(receiptData)` client-side → ESC/POS string
  2. Call `printToLocalPrinter(escPosString, copies)`
  3. If `printCustomerCopy`, set `receiptData.receiptType = 'customer'`, generate + print again
  4. Show success toast, close modal
  5. Do NOT call `onPrintConfirm` (skip server path entirely)
- If any other printer: existing flow unchanged

**Changes to JSX:**
- Show USB icon for local printer in dropdown (distinct from network printers)
- Add "Setup Local Printer" link when Web Serial supported but no local printer configured

### 5. No changes needed to:
- `receipt-print-manager.ts` — local print handled at modal level before this is called
- `print-receipt.ts` — server print path unchanged
- `receipt-templates.ts` — already a pure client-safe function
- `receipt-builder.ts` — receipt data already built before modal opens
- `prisma/schema.prisma` — local printers stored in localStorage, not DB
- Any POS pages — modal handles routing transparently
- `server.ts` — HTTPS handled via Chrome flag for now
- `simple-print-worker.js` — only processes server-queued jobs

## Key Technical Details

### ESC/POS Commands Already Used
| Command | Purpose |
|---------|---------|
| `ESC + '@'` | Initialize printer |
| `ESC + 'a' + 0x00/01/02` | Left/Center/Right align |
| `ESC + 'E' + 0x01/00` | Bold ON/OFF |
| `GS + 'V' + 0x41 + 0x03` | Partial cut paper |
| `0x0A` (LF) | Line feed |

### Web Serial vs WebUSB on Windows
- **WebUSB fails on Windows**: Windows printer drivers claim exclusive USB access
- **Web Serial works**: Most thermal printers create virtual COM ports via Windows drivers
- Web Serial API: `navigator.serial.requestPort()` → `port.open({baudRate})` → `writer.write(data)`

### Browser Compatibility
| Browser | Web Serial |
|---------|-----------|
| Chrome 89+ | Yes |
| Edge (Chromium) | Yes |
| Firefox | No |
| Safari | No |

### Port Reconnection
After first `requestPort()`, the browser remembers authorization. On subsequent page loads, `navigator.serial.getPorts()` returns previously-authorized ports without requiring a user gesture.

## Implementation Order
1. Create `src/lib/printing/local-serial-printer.ts` — Web Serial wrapper
2. Add `LocalPrinterInfo` type to `src/types/printing.ts`
3. Create `src/components/printing/local-printer-setup.tsx` — setup UI
4. Modify `src/components/receipts/unified-receipt-preview-modal.tsx` — add local printer option + local print path
5. Test end-to-end: pair printer → POS checkout → receipt preview → print locally

## Verification
1. Open Chrome with secure context flag (or localhost)
2. Navigate to POS, complete a sale
3. In receipt preview modal, "Local USB Printer" should appear in dropdown
4. If no local printer configured, "Setup Local Printer" link should be visible
5. Click setup → browser serial port picker appears → select printer
6. Select "Local USB Printer" in dropdown → click Print
7. Receipt prints on local USB thermal printer (no server print queue involved)
8. Network printer option still works as before (no regression)

## Future Enhancements
- Local print job logging API (record that a local print happened for audit)
- WebUSB support for non-Windows environments
- HTTPS configuration in server.ts with self-signed certificate
- Multiple local printers (receipt + label)
- Local Printers tab in admin printer management page

● Implementation complete. Here's a summary:                                    
  4 files created/modified:                                                  
  File: src/lib/printing/local-serial-printer.ts                           
  Action: NEW                                                                
  Purpose: Web Serial API wrapper — connect, send ESC/POS bytes, reconnect   
  ──────────────────────────────────────── 
  File: src/types/printing.ts                                                  Action: MODIFIED                                                             Purpose: Added LocalPrinterInfo interface                                    ────────────────────────────────────────                                     File: src/components/printing/local-printer-setup.tsx                        Action: NEW                                                                
  Purpose: UI for pairing/testing/removing local USB printer
  ────────────────────────────────────────
  File: src/components/receipts/unified-receipt-preview-modal.tsx
  Action: MODIFIED
  Purpose: Local printer in dropdown + client-side print path
  How it works:
  1. In the receipt preview modal, click "Setup Local USB Printer" → browser 
  shows serial port picker
  2. Select your USB thermal printer's COM port → saved to localStorage      
  3. Next time you print, "Local USB Printer" appears in the dropdown        
  4. Selecting it generates the ESC/POS receipt client-side using the        
  existing generateReceipt() function and sends the bytes directly to the    
  printer via Web Serial — no server involved

  Before testing, you'll need:
  1. Chrome or Edge browser
  2. Navigate to chrome://flags/#unsafely-treat-insecure-origin-as-secure,   
  add http://192.168.0.108:8080, restart Chrome
  3. USB thermal printer connected with Windows drivers installed (creates   
  virtual COM port)
