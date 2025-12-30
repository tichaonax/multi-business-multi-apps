# Barcode Multi-Printer Queue System

## Overview

The barcode management system supports printing to **multiple different printer types** simultaneously. Each print job can target a specific printer, and the print queue intelligently handles jobs for different printers using the appropriate printing method.

## Supported Printer Types

### 1. 🏷️ Label Printers (Recommended)
- **Examples**: Brother MFC-7860DW, HP LaserJet label printers, Zebra ZD410
- **Best For**: Barcode labels on label sheets or continuous label rolls
- **Print Method**: Generates PNG barcode images and prints via Windows Print Spooler
- **Output**: High-quality scannable barcodes

### 2. 🧾 Receipt Printers
- **Examples**: EPSON TM-T20III, Star Micronics TSP143
- **Best For**: Small barcode labels on thermal receipt paper
- **Print Method**: ESC/POS commands sent via RAW printing
- **Output**: Thermal printed barcodes (no ink required)

### 3. 📄 Document Printers
- **Examples**: Standard laser or inkjet printers
- **Best For**: Printing labels on regular paper to cut out with scissors
- **Print Method**: Generates PNG barcode images and prints via Windows Print Spooler
- **Output**: Standard paper with barcode images you can cut out

## How the Multi-Printer Queue Works

### Print Job Creation
1. User creates a print job from the Barcode Management system
2. User selects **which printer** to use from the dropdown
3. The printer selection is saved with the job

### Queue Processing
1. Print queue worker runs every **3 seconds** checking for pending jobs
2. Worker processes jobs in **FIFO order** (first in, first out)
3. Each job knows its target printer and quantity
4. Worker routes to the correct print method based on printer type

### Example Workflow

**Scenario**: You have 3 printers registered:
- Brother MFC-7860DW (Label printer)
- EPSON TM-T20III (Receipt printer)
- HP LaserJet Pro (Document printer)

**Queue State**:
```
Job 1: 50 labels → Brother MFC-7860DW (Label)
Job 2: 10 labels → EPSON TM-T20III (Receipt)
Job 3: 25 labels → HP LaserJet Pro (Document)
```

**Processing**:
1. Job 1 prints → Generates barcode PNG → Sends to Brother via spooler
2. Job 2 prints → Generates ESC/POS commands → Sends to EPSON via RAW API
3. Job 3 prints → Generates barcode PNG → Sends to HP via spooler

**All jobs process automatically in order, each using the correct method for its target printer!**

## Print Methods by Printer Type

### Label Printers → PNG Image
```typescript
1. Generate barcode image using bwip-js library
2. Save as PNG file in temp directory
3. Print via Windows Print Spooler using PowerShell
4. Clean up temp file
```

### Receipt Printers → ESC/POS Commands
```typescript
1. Generate ESC/POS barcode commands
2. Send directly to printer via RAW API
3. Printer interprets commands and prints barcode
```

### Document Printers → PNG Image (Fallback)
```typescript
1. Generate barcode image using bwip-js library
2. Save as PNG file in temp directory
3. Print via Windows Print Spooler
4. Clean up temp file
```

## Selecting the Right Printer

### When Creating a Print Job

The printer selector shows all available printers with helpful indicators:

```
Brother MFC-7860DW - 🏷️ Label (Recommended) - Office
EPSON TM-T20III - 🧾 Receipt - Cash Register 1
HP LaserJet Pro - 📄 Document - Office
```

**Recommendations**:
- **Label printers** are best for barcode labels (recommended)
- **Receipt printers** work well for small thermal barcode labels
- **Document printers** are fine if you'll cut the labels from paper

## Key Features

✅ **Concurrent Queue** - Multiple jobs for different printers can be queued simultaneously
✅ **Automatic Routing** - Worker automatically uses the correct print method
✅ **Printer-Specific** - Each job remembers its target printer
✅ **FIFO Processing** - Jobs process in the order they were created
✅ **Error Handling** - Failed jobs are marked with error messages
✅ **Quantity Support** - Print multiple copies per job

## Monitoring the Queue

### View Print Jobs
Navigate to: **Barcode Management → Print Queue**

You'll see:
- Job status (QUEUED, PRINTING, COMPLETED, FAILED)
- Target printer for each job
- Quantity (printed/requested)
- Business and template information

### Job States
- **QUEUED** - Waiting to print
- **PRINTING** - Currently being processed
- **COMPLETED** - Successfully printed
- **FAILED** - Error occurred (see error message)
- **CANCELLED** - Manually cancelled by user

## Troubleshooting

### Job Stuck in QUEUED
1. Check if the dev server is running (`npm run dev`)
2. Verify the target printer is online
3. Check server logs for errors

### Wrong Printer Type
If you selected the wrong printer:
1. Cancel the job
2. Create a new job with the correct printer

### Barcode Not Printing
1. **Label/Document printers**: Check if bwip-js is installed (`npm list bwip-js`)
2. **Receipt printers**: Verify ESC/POS commands are supported by your printer
3. Check printer connectivity

## Advanced: Adding New Printers

1. Go to **Admin → Printer Management**
2. Click "Register New Printer"
3. Select printer from Windows printers list
4. Choose correct printer type (label/receipt/document)
5. Save

The new printer will immediately appear in the barcode print job creation form!

## Code References

- **Print Queue Worker**: `src/lib/printing/print-queue-worker.ts`
- **Barcode Image Generator**: `src/lib/barcode-image-generator.ts`
- **ESC/POS Generator**: `src/lib/barcode-label-generator.ts`
- **Print Spooler**: `src/lib/printing/print-spooler.ts`
- **Job Creation UI**: `src/app/universal/barcode-management/print-jobs/new/page.tsx`

## Summary

The barcode printing system is **fully multi-printer capable**:
- ✅ Select any registered printer when creating jobs
- ✅ Queue holds jobs for different printers simultaneously
- ✅ Worker automatically routes to correct print method
- ✅ Each job prints to its designated printer
- ✅ Support for laser, thermal, and standard printers

You can have multiple printers registered and create jobs targeting any of them. The system handles everything automatically! 🎯
