# Layby Workflow Improvements - Detailed Task Plan

## Current Status
- Layby system backend completed (API routes, database schema)
- Basic UI created (list, create form, detail view)
- **Issue**: POST endpoint returns 404 (server may need restart)

## Priority Improvements Needed

---

## 1. Customer Verification & Security Display

### Problem
After entering customer ID, there's no visual confirmation of who the customer is, creating security risks.

### Solution
Add customer lookup and display below ID input field.

### Implementation Tasks:
- [ ] **Task 1.1**: Add customer lookup API call on ID field blur
- [ ] **Task 1.2**: Display customer card showing:
  - Customer Number
  - Full Name
  - Phone Number
  - Email
  - Photo (if available)
  - Layby eligibility status (✅ Allowed or ❌ Not Allowed)
- [ ] **Task 1.3**: Add loading spinner during lookup
- [ ] **Task 1.4**: Show error if customer not found or not eligible
- [ ] **Task 1.5**: Add "Clear" button to select different customer

### Files to Modify:
- `src/components/laybys/layby-form.tsx` - Add customer lookup
- `src/app/api/customers/[customerId]/route.ts` - Already has GET endpoint

### UI Mockup:
```
┌─────────────────────────────────────────────┐
│ Customer ID: [CLO-CUST-000001]  [Lookup]   │
└─────────────────────────────────────────────┘
       ↓ (on blur or button click)
┌─────────────────────────────────────────────┐
│ ✅ Customer Verified                         │
│                                              │
│ 📋 CLO-CUST-000001                          │
│ 👤 John Doe                                 │
│ 📞 +263771234567                            │
│ 📧 john.doe@example.com                     │
│ 🛍️ Layby Enabled: Yes                       │
│                                              │
│ [Clear Selection]                            │
└─────────────────────────────────────────────┘
```

---

## 2. Barcode Scanning for Items

### Problem
Manual entry of product IDs is slow and error-prone. Need to scan barcodes and auto-populate pricing.

### Solution
Add barcode scanner integration with inventory lookup.

### Implementation Tasks:

#### Phase A: Product Lookup API
- [ ] **Task 2.1**: Create GET `/api/products/by-barcode/[barcode]` endpoint
  - Query `ProductVariants` by SKU/barcode
  - Return: product details, current price, stock level
  - Include: product name, variant details (size/color), image

#### Phase B: Scanner UI Component
- [ ] **Task 2.2**: Create `BarcodeScannerInput` component
  - Listen for barcode scanner input (rapid key presses ending with Enter)
  - Auto-trigger lookup on scan complete
  - Show manual entry fallback

#### Phase C: Item Row Enhancement
- [ ] **Task 2.3**: Update LaybyForm item rows:
  - Replace manual "Product Variant ID" with scanner input
  - On scan success, auto-populate:
    - Product name
    - Unit price from inventory
    - Current stock level
    - Product image thumbnail
  - Validate stock availability
  - Prevent adding out-of-stock items

#### Phase D: Inventory Integration
- [ ] **Task 2.4**: Add stock reservation on layby creation
  - Reduce available stock when layby created
  - Restore stock if layby cancelled
  - Check stock levels before completion

### Files to Create/Modify:
- `src/app/api/products/by-barcode/[barcode]/route.ts` (NEW)
- `src/components/ui/barcode-scanner-input.tsx` (NEW)
- `src/components/laybys/layby-form.tsx` (MODIFY - add scanner)
- `src/app/api/laybys/route.ts` (MODIFY - add stock reservation)

### UI Mockup:
```
┌─────────────────────────────────────────────────────────────┐
│ Items *                                [+ Add Item]          │
├─────────────────────────────────────────────────────────────┤
│ Item 1                                           [Remove]    │
│                                                               │
│ 🔍 Scan or Enter Barcode: [____________]  [🎯 Scan]         │
│       ↓ (after scan)                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ✅ Product Found                                      │   │
│ │ 📦 Nike Air Max 90 - Size 10 - Blue                 │   │
│ │ 💰 Price: $89.99                                     │   │
│ │ 📊 Stock: 5 available                                │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Quantity: [1]   Unit Price: [$89.99]  Total: $89.99        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Payment Recording Workflow

### Problem
No clear workflow for recording initial deposit and subsequent payments.

### Solution
Implement comprehensive payment management system.

### Payment Lifecycle:

#### Step 1: Initial Deposit (During Layby Creation)
```
Customer comes in with items
  ↓
Staff scans items
  ↓
System calculates: Total = $500
  ↓
System suggests: 20% deposit = $100
  ↓
Customer pays deposit $100
  ↓
Layby created with:
  - Total: $500
  - Deposit Paid: $100
  - Balance Remaining: $400
  - Status: ACTIVE
```

#### Step 2: Subsequent Payments
```
Customer returns to make payment
  ↓
Staff opens layby (by number or customer search)
  ↓
View payment details:
  - Total Amount: $500
  - Paid to Date: $100
  - Remaining Balance: $400
  - Next Due Date: 2025-11-10
  ↓
Click "Record Payment"
  ↓
Enter amount: $150
  ↓
Select payment method: CASH/CARD/MOBILE_MONEY
  ↓
Generate receipt
  ↓
Update layby:
  - Total Paid: $250
  - Balance Remaining: $250
  ↓
If Balance = $0: Auto-complete layby
```

### Implementation Tasks:

#### Phase A: Initial Deposit (Layby Creation)
- [ ] **Task 3.1**: Add deposit payment step to create wizard
  - After items selected, show deposit calculation
  - Allow adjusting deposit amount (within business rules)
  - Collect payment method for deposit
  - Generate initial receipt

#### Phase B: Payment Recording Interface
- [ ] **Task 3.2**: Create `PaymentRecordModal` component
  - Shows current balance prominently
  - Payment amount input with validation
  - Payment method selector
  - Reference number field (for card/mobile money)
  - Receipt preview

- [ ] **Task 3.3**: Add "Record Payment" button to layby detail page
  - Show payment history timeline
  - Display upcoming due dates
  - Calculate days overdue if applicable
  - Show late fees if applicable

#### Phase C: Payment History
- [ ] **Task 3.4**: Create payment history timeline view
  - Show all payments with dates
  - Display payment methods
  - Show receipt numbers
  - Allow reprinting receipts
  - Show refunds if any

#### Phase D: Receipt Generation
- [ ] **Task 3.5**: Create receipt printing system
  - Generate unique receipt numbers
  - Show payment details
  - Display remaining balance
  - Include next due date
  - Printable format (thermal printer compatible)

### Files to Create/Modify:
- `src/components/laybys/payment-record-modal.tsx` (NEW)
- `src/components/laybys/payment-history-timeline.tsx` (NEW)
- `src/components/laybys/receipt-preview.tsx` (NEW)
- `src/app/api/laybys/[id]/payments/route.ts` (ALREADY EXISTS)
- `src/app/business/laybys/[id]/page.tsx` (MODIFY - add payment UI)

### UI Mockup - Payment Recording:
```
┌────────────────────────────────────────────────────────┐
│ Record Payment - Layby LAY-CLO-20251027-000001        │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Customer: John Doe (CLO-CUST-000001)                 │
│  Layby Total: $500.00                                  │
│                                                         │
│  ┌───────────────────────────────────────────────┐   │
│  │  💰 Current Balance                            │   │
│  │                                                │   │
│  │      Total Paid:      $100.00                 │   │
│  │      Remaining:       $400.00                 │   │
│  │                                                │   │
│  │      Next Due:        2025-11-10              │   │
│  │      Days Until Due:  14 days                 │   │
│  └───────────────────────────────────────────────┘   │
│                                                         │
│  Payment Amount: [$____________]                       │
│                                                         │
│  Payment Method:                                       │
│  ( ) Cash                                              │
│  ( ) Card                                              │
│  ( ) Mobile Money                                      │
│  ( ) Bank Transfer                                     │
│                                                         │
│  Reference Number (Optional): [_______________]        │
│                                                         │
│  Notes: [____________________________________]         │
│                                                         │
│  [Cancel]                    [Record Payment]          │
└────────────────────────────────────────────────────────┘
```

### UI Mockup - Payment History:
```
┌────────────────────────────────────────────────────────┐
│ Payment History                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│  2025-10-27  14:30  ┌─────────────────────────┐       │
│  Initial Deposit    │ Amount: $100.00          │       │
│                     │ Method: CASH             │       │
│                     │ Receipt: RCP-001         │ [🖨️]  │
│                     │ By: John Smith           │       │
│                     └─────────────────────────┘       │
│          ↓                                             │
│  2025-11-10  10:15  ┌─────────────────────────┐       │
│  Payment 2          │ Amount: $150.00          │       │
│                     │ Method: CARD             │       │
│                     │ Receipt: RCP-002         │ [🖨️]  │
│                     │ Ref: **** 1234           │       │
│                     │ By: Jane Doe             │       │
│                     └─────────────────────────┘       │
│          ↓                                             │
│  2025-11-24  16:45  ┌─────────────────────────┐       │
│  Payment 3          │ Amount: $250.00          │       │
│                     │ Method: MOBILE_MONEY     │       │
│                     │ Receipt: RCP-003         │ [🖨️]  │
│                     │ Ref: MP12345678          │       │
│                     │ By: John Smith           │       │
│                     └─────────────────────────┘       │
│          ↓                                             │
│  ✅ COMPLETED       Balance: $0.00                    │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 4. Customer Return for Payment Workflow

### Customer Journey:

#### Scenario A: Customer Knows Layby Number
```
Customer: "I want to make a payment on layby LAY-CLO-20251027-000001"
  ↓
Staff: Opens layby by number
  ↓
System: Shows layby details and payment options
  ↓
Staff: Records payment
  ↓
System: Generates receipt and updates balance
```

#### Scenario B: Customer Doesn't Know Layby Number
```
Customer: "I have a layby, but I don't remember the number"
  ↓
Staff: Searches by customer name or phone
  ↓
System: Shows all active laybys for that customer
  ↓
Staff: Selects correct layby
  ↓
Continue with payment recording...
```

### Implementation Tasks:

#### Quick Search Feature
- [ ] **Task 4.1**: Add search bar on layby list page
  - Search by: Layby number, customer name, customer phone
  - Quick filters: Active, Overdue, Completing Soon
  - Sort by: Due date, Creation date, Balance

- [ ] **Task 4.2**: Create "Quick Payment" button
  - From layby list, click "💰 Pay" button
  - Opens payment modal directly
  - Skip detail page for faster workflow

#### Customer Self-Service (Future Phase)
- [ ] **Task 4.3**: Create customer portal (FUTURE)
  - Customers can view their laybys
  - See payment history
  - Know next due date
  - Get reminders via SMS/Email

---

## 5. Business Rules & Validations

### Payment Validations Needed:
- [ ] Cannot pay more than remaining balance
- [ ] Cannot pay negative amounts
- [ ] Must select payment method
- [ ] Auto-complete layby when balance reaches $0
- [ ] Apply late fees if payment overdue (per business rules)
- [ ] Prevent payments on CANCELLED or COMPLETED laybys

### Stock Validations Needed:
- [ ] Check stock availability when creating layby
- [ ] Reserve stock when layby created
- [ ] Release stock if layby cancelled
- [ ] Validate stock still available at completion
- [ ] Prevent overselling

---

## 6. Notifications & Reminders (Already Implemented)

The automation system already exists but needs integration:
- ✅ Payment reminders (3 days before, on due date, 1 day after, 7 days after)
- ✅ Late fee application (24 hours after due date)
- ✅ Default handling automation
- ✅ SMS and email templates

**Needs**: Configuration of SMS/email providers in production

---

## Implementation Priority

### Phase 1: Critical (Complete First)
1. Fix POST /api/laybys 404 error
2. Customer verification display (Security)
3. Basic payment recording workflow
4. Payment history view

### Phase 2: High Priority
1. Barcode scanning for items
2. Stock validation and reservation
3. Quick search on layby list
4. Receipt generation

### Phase 3: Medium Priority
1. Advanced payment features (partial payments, refunds)
2. Late fee calculations
3. Thermal printer integration
4. Performance optimizations

### Phase 4: Future Enhancements
1. Customer self-service portal
2. Mobile app for staff
3. QR code payments
4. WhatsApp notifications
5. Analytics dashboard

---

## Testing Checklist

### Before Go-Live:
- [ ] Create test customer with layby enabled
- [ ] Create layby with multiple items
- [ ] Record initial deposit
- [ ] Record subsequent payment
- [ ] Complete layby (full payment)
- [ ] Test stock reservation/release
- [ ] Test barcode scanning
- [ ] Print test receipts
- [ ] Test overdue scenarios
- [ ] Test cancellation with refund
- [ ] Test customer search
- [ ] Verify all calculations correct
- [ ] Test on mobile devices
- [ ] Test with thermal printer

---

## Estimated Timeline

- **Phase 1**: 2-3 days
- **Phase 2**: 3-4 days
- **Phase 3**: 2-3 days
- **Phase 4**: Future (4-6 weeks)

**Total for MVP**: 7-10 days

---

## Next Steps

1. **Immediate**: Restart dev server to fix 404 error
2. **Today**: Implement customer verification display
3. **Tomorrow**: Implement payment recording UI
4. **This Week**: Complete barcode scanning integration

---

## Questions to Answer

1. What barcode scanner hardware do you have?
2. What thermal printer model for receipts?
3. Do you want SMS reminders enabled immediately?
4. Should late fees apply automatically or require approval?
5. What is your preferred payment split (how many installments typically)?

