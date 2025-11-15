# Universal Receipt System

## Overview

The Universal Receipt System provides a standardized way to generate receipts across all business types (grocery, restaurant, hardware, clothing, etc.) while allowing for business-specific customizations.

## Architecture

### Core Components

1. **Receipt Builder** (`src/lib/printing/receipt-builder.ts`)
   - Central service for building receipt data
   - Fetches business information
   - Applies business-type specific configurations
   - Handles business-specific notes and formatting

2. **Receipt Template** (`src/components/printing/receipt-template.tsx`)
   - React component for displaying receipts
   - Renders receipt data in a print-friendly format
   - Supports employee name, customer info, line items

3. **Receipt Preview Modal** (`src/components/printing/receipt-preview-modal.tsx`)
   - Shows receipt preview before printing
   - Checks for configured printers
   - Handles print job submission

4. **Print Utilities** (`src/lib/printing/print-receipt.ts`)
   - Sends print jobs to thermal printers
   - Generates ESC/POS commands
   - Fallback to browser printing

## Usage

### Building a Receipt

```typescript
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'

// When you have business info available
const receiptData = buildReceiptWithBusinessInfo(
  {
    id: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    orderType: 'SALE',
    status: order.status,
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    paymentMethod: 'CARD',
    paymentStatus: 'PAID',
    customerName: 'John Doe',
    employeeName: 'Jane Smith',
    items: [
      {
        name: 'Product Name',
        quantity: 2,
        unitPrice: 10.00,
        totalPrice: 20.00
      }
    ],
    attributes: {
      // Business-specific data
      loyaltyNumber: 'LOYAL123'
    }
  },
  {
    id: businessId,
    name: 'My Grocery Store',
    type: 'grocery',
    settings: {
      address: '123 Main St',
      phone: '(555) 123-4567'
    }
  }
)
```

### Fetching Business Info Automatically

```typescript
import { buildReceiptFromOrder } from '@/lib/printing/receipt-builder'

// Automatically fetches business info from API
const receiptData = await buildReceiptFromOrder(orderData, businessId)
```

## Business-Specific Configurations

Each business type has its own default configuration in the receipt builder:

### Grocery
- Shows loyalty information
- Displays SNAP eligibility
- Footer: "Thank you for shopping with us!"

### Restaurant
- Shows table number
- Displays server information
- Footer: "Thank you for dining with us!"

### Hardware
- Shows project reference
- Footer: "Thank you for your business!"

### Clothing
- Shows size and color information
- Includes return policy (30 days)
- Footer: "Thank you for shopping with us!"

## Customizing for New Business Types

To add support for a new business type:

1. **Add Configuration** in `receipt-builder.ts`:

```typescript
const BUSINESS_CONFIGS = {
  // ... existing configs
  yourBusinessType: {
    defaultAddress: '123 Your Street',
    defaultPhone: '(555) 000-0000',
    showCustomField: true,
    footerMessage: 'Your custom footer!'
  }
}
```

2. **Add Business-Specific Logic** in `buildReceiptNotes()`:

```typescript
switch (businessType) {
  // ... existing cases
  case 'yourBusinessType':
    if (order.attributes?.customField) {
      notes.push(`Custom: ${order.attributes.customField}`)
    }
    break
}
```

3. **Update Receipt Template** (if needed) to display business-specific fields

## Storing Business Settings

Business settings are stored in the `businesses.settings` JSON field:

```typescript
{
  "address": "123 Main Street, City, State 12345",
  "phone": "(555) 123-4567",
  "email": "contact@business.com",
  "logo": "https://example.com/logo.png",
  "taxId": "12-3456789",
  "receiptFooter": "Custom footer message",
  "returnPolicy": "Returns accepted within 30 days"
}
```

These settings override the default values in the business configuration.

## Printing Flow

1. **Build Receipt Data** - Use receipt builder to create standardized receipt data
2. **Show Preview** - Display receipt in preview modal
3. **Check Printer** - Verify receipt printer is configured and online
4. **Print** - Send to thermal printer or browser print dialog
5. **Auto-Print** - Optionally skip preview if auto-print is enabled

## Auto-Print Preference

Users can enable auto-print in their preferences (stored in localStorage):

```typescript
import { usePrintPreferences } from '@/hooks/use-print-preferences'

const { preferences, setAutoPrint } = usePrintPreferences()

// Enable auto-print
setAutoPrint(true)

// Check if auto-print is enabled
if (preferences.autoPrintReceipt) {
  // Print without showing preview
}
```

## API Endpoints

### Get Business Information
```
GET /api/businesses/{businessId}
```

Returns business details including settings for receipt generation.

### Create Print Job
```
POST /api/print/receipt
```

Sends receipt to configured thermal printer.

## Best Practices

1. **Always use the receipt builder** - Don't manually construct receipt data
2. **Pass business context** - Provide business info when available to avoid extra API calls
3. **Handle errors gracefully** - Show preview as fallback if auto-print fails
4. **Include employee name** - Always pass the current user's name as employeeName
5. **Use business-specific attributes** - Store custom data in the `attributes` field

## Example: Complete Receipt Flow

```typescript
// In POS or Orders page
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'
import { printReceipt } from '@/lib/printing/print-receipt'
import { ReceiptPreviewModal } from '@/components/printing/receipt-preview-modal'

// After order is created
const receiptData = buildReceiptWithBusinessInfo(orderData, businessInfo)

// Show preview or auto-print
if (autoPrintEnabled) {
  await printReceipt(receiptData)
} else {
  setShowReceiptPreview(true)
  setPendingReceiptData(receiptData)
}
```

## Future Enhancements

- [ ] Support for multiple receipt templates per business
- [ ] Custom receipt layouts via admin interface
- [ ] QR code generation for digital receipts
- [ ] Email/SMS receipt delivery
- [ ] Multi-language receipt support
- [ ] Receipt branding customization (colors, fonts)
