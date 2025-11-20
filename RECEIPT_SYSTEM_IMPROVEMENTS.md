# Restaurant Receipt System Improvements

## Summary of Changes

This document outlines all improvements made to the restaurant POS receipt system based on user requirements.

---

## 1. Receipt Number Format ✅

### Changed From
- **Old Format**: `YYYY-MM-DD-NNN` (e.g., `2025-11-13-001`)
- **Sequence**: 3 digits (001-999)
- **Reset**: Midnight in timezone

### Changed To
- **New Format**: `YYYYMMDD-0001` (e.g., `20251102-0010`)
- **Sequence**: 4 digits (0001-9999)
- **Reset**: 5AM daily cutoff (business day logic)

### Files Modified
- `src/lib/printing/receipt-numbering.ts`
  - Updated `generateReceiptNumber()` to format as `YYYYMMDD-0001`
  - Changed sequence padding from 3 to 4 digits
  - Updated validation pattern to `/^\d{8}-\d{4}$/`
  - Updated `parseReceiptNumber()` to handle new format

### Examples
```
First receipt of the day:     20251102-0001
Tenth receipt:                20251102-0010
Hundredth receipt:            20251102-0100
Thousandth receipt:           20251102-1000
```

---

## 2. 5AM Daily Reset Logic ✅

### Business Day Definition
- **Business day runs from 5:00 AM to 4:59 AM next day**
- Receipts generated between midnight and 4:59 AM use the PREVIOUS day's date
- Receipts generated at 5:00 AM and later use the CURRENT day's date
- Sequence resets to 0001 at 5:00 AM each day

### Examples
| Time | Calendar Date | Receipt Date | Sequence |
|------|---------------|--------------|----------|
| Nov 2, 2:00 AM | Nov 2 | **Nov 1** (20251101) | Continues from Nov 1 |
| Nov 2, 4:59 AM | Nov 2 | **Nov 1** (20251101) | Last of Nov 1 business day |
| Nov 2, 5:00 AM | Nov 2 | **Nov 2** (20251102) | 0001 (first of new day) |
| Nov 2, 11:59 PM | Nov 2 | **Nov 2** (20251102) | Continues |
| Nov 3, 4:00 AM | Nov 3 | **Nov 2** (20251102) | Still Nov 2 business day |

### Implementation Details
- Modified `getTodayInTimezone()` in `receipt-numbering.ts`
- Checks current hour in business timezone
- If hour < 5, subtracts 24 hours from date for sequencing
- Database stores sequences by business ID and date (YYYY-MM-DD format)
- Automatic rollover at 5AM - no manual reset needed

### Files Modified
- `src/lib/printing/receipt-numbering.ts`
  - Updated `getTodayInTimezone()` function to implement 5AM cutoff

---

## 3. Printer Darkness Fixed ✅

### Problem
- Receipts printing very faint
- Only "Change" and line separators were visible
- Text appeared like screen font instead of thermal printer output

### Root Cause
- ESC/POS emphasized mode (double-strike) was not enabled
- Only TOTAL lines had bold enabled
- Regular text was too light

### Solution
**Enabled ESC/POS Emphasized Mode (Double-Strike)**

Added command: `ESC G 1` (0x1B 0x47 0x01)
- Makes all text print heavier/darker
- Standard thermal printer feature for better readability
- Applied globally to all receipt text

### Files Modified
1. `src/lib/printing/formats/esc-pos.ts`
   - Line 27: Added `ESC + 'G' + '\x01'` after printer initialization
   - Applies to all receipts processed through ESC/POS converter

2. `src/lib/printing/receipt-templates.ts`
   - Restaurant receipt (line 78): Added `ESC + 'G' + String.fromCharCode(1)`
   - Generic receipt (line 823): Added `ESC + 'G' + String.fromCharCode(1)`
   - Makes text heavy black for better printing

### ESC/POS Commands Used
```
ESC @ - Initialize printer (reset)
ESC G 1 - Enable double-strike mode (HEAVY BLACK)
ESC E 1 - Enable bold (for headers/totals)
ESC a 1 - Center alignment
GS V 41 03 - Partial paper cut
```

---

## 4. Paper Cut Between Receipts ✅

### Problem
- Two receipts (customer + kitchen) printing as one long receipt
- No separation between copies
- Difficult to tear/separate receipts

### Solution
**Added proper ESC/POS cut command at the end of each receipt**

- Changed from: `ESC d 3` (unreliable)
- Changed to: `GS V 41 03` (standard partial cut command)
- Each receipt now cuts automatically when print job completes

### Files Modified
1. `src/lib/printing/receipt-templates.ts`
   - Restaurant receipt: Changed `CUT` definition to use `GS V` command
   - Generic receipt: Changed `CUT` definition to use `GS V` command

2. `src/lib/printing/formats/esc-pos.ts`
   - Updated cut command to `GS V 41 03` (partial cut)
   - Added after every receipt

### How It Works
- **Customer receipt printed** → CUT command executed → paper cuts
- **Kitchen receipt printed** → CUT command executed → paper cuts
- Each receipt is now separate and easy to handle

### Cut Command Details
```javascript
// Old (line feed + cut - unreliable)
const CUT = ESC + 'd' + String.fromCharCode(3)

// New (GS V - standard ESC/POS partial cut)
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3)
```

---

## 5. Daily Sales Summary API ✅

### New API Endpoint
**`GET /api/restaurant/daily-sales?businessId={id}&timezone={tz}`**

### Features
- Calculates sales for current business day (5AM to 5AM)
- Groups sales by payment method
- Groups sales by category
- Shows total orders, revenue, tax
- Shows average order value
- Shows number of receipts issued

### Response Format
```json
{
  "success": true,
  "data": {
    "businessDay": {
      "date": "2025-11-02",
      "start": "2025-11-02T05:00:00.000Z",
      "end": "2025-11-03T05:00:00.000Z"
    },
    "summary": {
      "totalOrders": 45,
      "totalSales": 1250.50,
      "totalTax": 87.50,
      "averageOrderValue": 27.79,
      "receiptsIssued": 45
    },
    "paymentMethods": {
      "CASH": { "count": 25, "total": 675.00 },
      "CARD": { "count": 15, "total": 450.50 },
      "MOBILE": { "count": 5, "total": 125.00 }
    },
    "categoryBreakdown": [
      { "name": "Main Courses", "itemCount": 78, "totalSales": 890.00 },
      { "name": "Beverages", "itemCount": 45, "totalSales": 180.50 },
      { "name": "Appetizers", "itemCount": 32, "totalSales": 128.00 },
      { "name": "Desserts", "itemCount": 18, "totalSales": 52.00 }
    ]
  }
}
```

### Files Created
- `src/app/api/restaurant/daily-sales/route.ts`

### Usage
```javascript
// Fetch daily sales for a restaurant
const response = await fetch(`/api/restaurant/daily-sales?businessId=${businessId}`)
const { data } = await response.json()

console.log(`Total sales today: $${data.summary.totalSales}`)
console.log(`Total orders: ${data.summary.totalOrders}`)
console.log(`Receipts issued: ${data.summary.receiptsIssued}`)
```

---

## 6. Next Steps (Pending Implementation)

### A. Display Daily Sales on POS Page
Create a summary widget at the top of the POS page showing:
- Current business day date range
- Total sales so far
- Number of orders
- Number of receipts issued

### B. Till Closing / End of Day Report
Create a printable report page at `/restaurant/reports/end-of-day` with:
- **Summary Section**
  - Business day date
  - Total revenue
  - Total orders
  - Average order value
  - Receipts issued (first to last number)

- **Payment Methods Breakdown**
  - Cash: $XXX.XX (XX orders)
  - Card: $XXX.XX (XX orders)
  - Mobile: $XXX.XX (XX orders)

- **Category Breakdown**
  - Main Courses: XX items, $XXX.XX
  - Appetizers: XX items, $XXX.XX
  - Beverages: XX items, $XXX.XX
  - Desserts: XX items, $XXX.XX

- **Till Reconciliation**
  - Expected cash in drawer: $XXX.XX
  - Space for counted cash: _______
  - Space for variance: _______
  - Manager signature line

- **Print Button** to print the report for filing

---

## Testing Receipt Numbering

### Test Script
Run `node test-receipt-numbering.js` to verify:
- ✅ Format validation (YYYYMMDD-0001)
- ✅ 4-digit sequence padding
- ✅ 5AM cutoff logic examples

### Manual Testing
1. Start dev server: `npm run dev`
2. Navigate to POS: `http://localhost:8080/restaurant/pos`
3. Process an order
4. Check receipt number format in printed receipt
5. Verify format is `YYYYMMDD-0001` (e.g., `20251102-0010`)

---

## Database Schema

Receipt sequences are stored in `receiptSequences` table:

```prisma
model receiptSequences {
  id            String   @id @default(uuid())
  businessId    String
  date          String   // YYYY-MM-DD format
  lastSequence  Int      // Last sequence number used
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([businessId, date], name: "businessId_date")
}
```

### Key Points
- One record per business per date
- `date` is business day date (considering 5AM cutoff)
- `lastSequence` auto-increments with each receipt
- Thread-safe via Prisma transactions
- Automatic cleanup available (optional - keeps 365 days by default)

---

## Configuration

### Timezone Setting
Receipt numbering respects timezone for 5AM cutoff. Default: system timezone

Can be overridden per request:
```javascript
await generateReceiptNumber(businessId, 'America/New_York')
await generateReceiptNumber(businessId, 'America/Los_Angeles')
await generateReceiptNumber(businessId, 'America/Chicago')
```

### Printer Settings
Receipts now use:
- **Double-strike mode** for darker printing
- **Partial cut** command for automatic separation
- **42 characters per line** for 80mm paper (EPSON TM-T20III)

---

## Summary

✅ **Receipt number format**: YYYYMMDD-0001
✅ **5AM daily reset**: Business day logic implemented
✅ **Dark printing**: ESC/POS emphasized mode enabled
✅ **Paper cuts**: Proper cut command between receipts
✅ **Daily sales API**: Complete with category breakdowns
⏳ **Daily sales display**: Ready for UI implementation
⏳ **End-of-day report**: Ready for UI implementation

All backend systems are now in place and ready for use!
