# User-Facing Printing Components

## Overview
Complete user interface components for printing receipts and labels with printer selection and preview functionality.

## Components Created

### 1. `printer-selector.tsx`
Modal component for selecting a printer.

**Features:**
- Lists all available printers (local + remote)
- Online/offline status indicators
- Filter by printer type (label, receipt, document)
- Search functionality
- Toggle to show online-only or all printers
- Visual selection with checkmarks
- Capability badges
- Remote/local printer identification

**Usage:**
```tsx
import { PrinterSelector } from '@/components/printing/printer-selector'

<PrinterSelector
  isOpen={isOpen}
  onClose={handleClose}
  onSelect={handlePrinterSelect}
  printerType="receipt" // or "label" or "document" or "all"
  title="Select Receipt Printer"
  description="Choose a printer for this receipt"
/>
```

**Props:**
- `isOpen`: boolean - Modal open state
- `onClose`: () => void - Close handler
- `onSelect`: (printer: NetworkPrinter) => void - Selection callback
- `printerType`: 'label' | 'receipt' | 'document' | 'all' - Filter by type
- `title`: string - Modal title (optional)
- `description`: string - Modal description (optional)

### 2. `receipt-preview.tsx`
Preview component for receipts before printing.

**Features:**
- Monospaced receipt preview (48 characters wide)
- Business header with logo/info
- Itemized list with quantities
- Subtotal, tax, discount, total
- Payment method and change calculation
- Customer information
- Notes section
- Print button with printer selection
- Configurable receipt data

**Usage:**
```tsx
import { ReceiptPreview } from '@/components/printing/receipt-preview'

<ReceiptPreview
  isOpen={isOpen}
  onClose={handleClose}
  receiptData={receiptData}
  onPrint={handlePrint}
/>
```

**Props:**
- `isOpen`: boolean - Modal open state
- `onClose`: () => void - Close handler
- `receiptData`: ReceiptData - Receipt content
- `onPrint`: (printer: NetworkPrinter) => Promise<void> - Print callback

**ReceiptData Structure:**
```typescript
interface ReceiptData {
  receiptNumber: string
  globalId: string
  businessName: string
  businessType: BusinessType
  businessAddress?: string
  businessPhone?: string
  businessTaxId?: string
  items: ReceiptItem[]
  subtotal: number
  tax?: number
  discount?: number
  total: number
  paymentMethod?: string
  cashTendered?: number
  changeDue?: number
  customerName?: string
  customerPhone?: string
  notes?: string
  date: Date
  cashierName?: string
  businessSpecificData?: any
}
```

### 3. `label-preview.tsx`
Preview component for SKU labels before printing.

**Features:**
- Label format display (standard, with-price, compact, business-specific)
- Item name and SKU
- Price (if included)
- Business-specific data fields
- Barcode placeholder with format indicator
- Copy quantity selector (1-100)
- Label format badge
- Print button with printer selection

**Usage:**
```tsx
import { LabelPreview } from '@/components/printing/label-preview'

<LabelPreview
  isOpen={isOpen}
  onClose={handleClose}
  labelData={labelData}
  onPrint={handlePrint}
/>
```

**Props:**
- `isOpen`: boolean - Modal open state
- `onClose`: () => void - Close handler
- `labelData`: LabelData - Label content
- `onPrint`: (printer: NetworkPrinter, copies: number) => Promise<void> - Print callback

**LabelData Structure:**
```typescript
interface LabelData {
  sku: string
  itemName: string
  price?: number
  businessName?: string
  businessType?: BusinessType
  labelFormat: 'standard' | 'with-price' | 'compact' | 'business-specific'
  barcode: {
    data: string
    format: 'code128' | 'code39' | 'ean13' | 'upca' | 'qr'
  }
  businessSpecificData?: any
}
```

## Hooks Created

### 1. `use-alert.ts`
Custom hook for showing non-intrusive alerts using toast notifications.

**Features:**
- Uses toast component (no browser alerts)
- Pre-configured alert types (success, error, warning, info)
- Customizable duration and variants

**Usage:**
```tsx
import { useAlert } from '@/hooks/use-alert'

const { showSuccess, showError, showWarning, showInfo, showAlert } = useAlert()

// Simple alerts
showSuccess('Operation completed successfully')
showError('Failed to save data')
showWarning('Please review your changes')
showInfo('New update available')

// Custom alert
showAlert({
  title: 'Custom Alert',
  message: 'This is a custom message',
  variant: 'default',
  duration: 5000,
})
```

### 2. `use-printer-permissions.ts`
Custom hook for checking printer-related permissions.

**Features:**
- Checks all printer permissions
- Uses session data
- Returns boolean flags for each permission
- Includes loading state

**Usage:**
```tsx
import { usePrinterPermissions } from '@/hooks/use-printer-permissions'

const {
  canManageNetworkPrinters,
  canUseLabelPrinters,
  canPrintReceipts,
  canPrintInventoryLabels,
  canViewPrintQueue,
  canPrint,
  user,
  isLoading,
} = usePrinterPermissions()

// Conditionally render UI
{canPrintReceipts && (
  <Button onClick={handlePrintReceipt}>
    Print Receipt
  </Button>
)}
```

**Returned Permissions:**
- `canManageNetworkPrinters`: Admin-only printer management
- `canUseLabelPrinters`: Can use label printers
- `canPrintReceipts`: Can print receipts
- `canPrintInventoryLabels`: Can print inventory labels
- `canViewPrintQueue`: Can view print queue (admin)
- `canPrint`: Can print anything (any of the above)

### 3. `use-print-job-monitor.ts`
Hook for monitoring print job status with notifications.

**Features:**
- Polls print job status
- Shows toast notifications on completion/failure
- Auto-stops monitoring after job completes
- Configurable poll interval and timeout
- Prevents duplicate monitoring

**Usage:**
```tsx
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'

const { monitorJob, notifyJobQueued, notifyJobStarted } = usePrintJobMonitor()

// After queuing a print job
const response = await fetch('/api/print/receipt', { ... })
const data = await response.json()

// Show initial notification
notifyJobQueued(data.printJob.id, printerName)

// Start monitoring for completion
monitorJob({
  jobId: data.printJob.id,
  onComplete: () => {
    console.log('Print completed!')
  },
  onFailed: (error) => {
    console.error('Print failed:', error)
  },
  pollInterval: 2000, // Check every 2 seconds
  maxAttempts: 30, // Stop after 60 seconds
})
```

**Monitor Options:**
- `jobId`: string - Print job ID to monitor
- `onComplete`: () => void - Callback on success
- `onFailed`: (error: string) => void - Callback on failure
- `pollInterval`: number - Milliseconds between checks (default: 2000)
- `maxAttempts`: number - Max polling attempts (default: 30)

## Integration Examples

### Example 1: Print Receipt Flow
```tsx
import { useState } from 'react'
import { ReceiptPreview } from '@/components/printing/receipt-preview'
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'
import { usePrinterPermissions } from '@/hooks/use-printer-permissions'

function CheckoutPage() {
  const [showPreview, setShowPreview] = useState(false)
  const { monitorJob, notifyJobQueued } = usePrintJobMonitor()
  const { canPrintReceipts } = usePrinterPermissions()

  const receiptData = {
    receiptNumber: '2025-11-13-001',
    globalId: 'uuid-here',
    businessName: 'My Store',
    businessType: 'retail',
    items: [
      { name: 'Product A', quantity: 2, price: 10.00 },
      { name: 'Product B', quantity: 1, price: 25.00 },
    ],
    subtotal: 45.00,
    tax: 4.50,
    total: 49.50,
    date: new Date(),
  }

  async function handlePrint(printer) {
    const response = await fetch('/api/print/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerId: printer.id,
        businessId: 'business-id',
        businessType: 'retail',
        ...receiptData,
      }),
    })

    const data = await response.json()

    notifyJobQueued(data.printJob.id, printer.printerName)
    monitorJob({ jobId: data.printJob.id })
  }

  return (
    <div>
      {canPrintReceipts && (
        <button onClick={() => setShowPreview(true)}>
          Print Receipt
        </button>
      )}

      <ReceiptPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        receiptData={receiptData}
        onPrint={handlePrint}
      />
    </div>
  )
}
```

### Example 2: Print Label from Inventory
```tsx
import { useState } from 'react'
import { LabelPreview } from '@/components/printing/label-preview'
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'

function InventoryItem({ product }) {
  const [showPreview, setShowPreview] = useState(false)
  const { monitorJob, notifyJobQueued } = usePrintJobMonitor()

  const labelData = {
    sku: product.sku,
    itemName: product.name,
    price: product.price,
    businessName: 'My Store',
    labelFormat: 'with-price',
    barcode: {
      data: product.sku,
      format: 'code128',
    },
  }

  async function handlePrint(printer, copies) {
    const response = await fetch('/api/print/label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerId: printer.id,
        businessId: 'business-id',
        ...labelData,
        copies,
      }),
    })

    const data = await response.json()

    notifyJobQueued(data.printJob.id, printer.printerName)
    monitorJob({ jobId: data.printJob.id })
  }

  return (
    <div>
      <button onClick={() => setShowPreview(true)}>
        Print Label
      </button>

      <LabelPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        labelData={labelData}
        onPrint={handlePrint}
      />
    </div>
  )
}
```

## Features Summary

✅ **User-Friendly Printer Selection**
- Visual printer list with status
- Search and filter capabilities
- Online/offline indicators
- Remote printer support

✅ **Print Previews**
- Accurate receipt preview (48-char thermal)
- Label preview with barcode placeholder
- Business-specific formatting
- Copy quantity selection for labels

✅ **Permission Checks**
- Hook-based permission system
- Conditional UI rendering
- Role-based access control

✅ **User Feedback**
- Toast notifications (no browser alerts)
- Job status monitoring
- Success/failure notifications
- Loading states

✅ **Error Handling**
- Graceful error messages
- Retry mechanisms
- Offline printer detection
- Network error handling

## Technical Notes

- All components use 'use client' directive (client-side)
- Uses shadcn/ui components (Modal, Button, Card, etc.)
- TypeScript with full type safety
- NextAuth integration for permissions
- API integration with /api/printers and /api/print endpoints
- Responsive design
- Accessible UI components
