# Customer Display Improvements

## Issues to Fix

### Issue 1: Fashion/Clothing Business Cart Not Showing on Customer Display
**Problem**: When switching from Restaurant business to Fashion business, cart values don't appear on customer display.

**Root Cause**: Customer display is filtering messages from the new business because it hasn't received the `SET_ACTIVE_BUSINESS` message for Fashion business yet.

**Solution**:
- Ensure `BusinessPermissionsContext` broadcasts `SET_ACTIVE_BUSINESS` when business changes
- ✅ Already fixed by adding `sync.connect()` - just needs app restart

### Issue 2: Cart Visibility During Payment
**Problem**: Cart disappears during payment. Customer should see:
- Amount tendered
- Change due
- Shortfall (if insufficient funds)
- Cart should only clear after receipt is printed or sale completes

**Solution**: Add payment state broadcasting to customer display

## Implementation Plan

### Phase 1: Test Business Switching ✅
- [x] Fix BroadcastSync.connect() issue
- [ ] Restart app and test business switching
- [ ] Verify Fashion business cart appears on customer display

### Phase 2: Add Payment State to Customer Display

#### Task 1: Add New Message Types
**File**: `src/lib/customer-display/broadcast-sync.ts`

Add new message types:
```typescript
export type CartMessageType =
  | 'SET_ACTIVE_BUSINESS'
  | 'ADD_ITEM'
  | 'REMOVE_ITEM'
  | 'UPDATE_QUANTITY'
  | 'CLEAR_CART'
  | 'CART_STATE'
  | 'SET_GREETING'
  | 'SET_PAGE_CONTEXT'
  | 'PAYMENT_STARTED'      // NEW: Payment in progress
  | 'PAYMENT_AMOUNT'       // NEW: Amount tendered
  | 'PAYMENT_COMPLETE'     // NEW: Payment successful
  | 'PAYMENT_CANCELLED'    // NEW: Payment cancelled
```

Update CartMessage payload:
```typescript
export interface CartMessage {
  type: CartMessageType
  payload: {
    // Existing fields...
    items?: CartItem[]
    subtotal: number
    tax: number
    total: number

    // NEW: Payment fields
    amountTendered?: number
    changeDue?: number
    shortfall?: number
    paymentMethod?: string
    paymentComplete?: boolean
  }
  timestamp: number
  businessId: string
  terminalId?: string
}
```

#### Task 2: Update Customer Display to Show Payment Info
**File**: `src/app/customer-display/page.tsx`

Add payment state:
```typescript
const [paymentState, setPaymentState] = useState<{
  inProgress: boolean
  amountTendered: number
  changeDue: number
  shortfall: number
  paymentMethod?: string
}>({
  inProgress: false,
  amountTendered: 0,
  changeDue: 0,
  shortfall: 0
})
```

Handle payment messages:
```typescript
case 'PAYMENT_STARTED':
  setPaymentState({
    inProgress: true,
    amountTendered: 0,
    changeDue: 0,
    shortfall: message.payload.total
  })
  break

case 'PAYMENT_AMOUNT':
  const tendered = message.payload.amountTendered || 0
  const total = message.payload.total
  const change = tendered - total
  setPaymentState({
    inProgress: true,
    amountTendered: tendered,
    changeDue: change > 0 ? change : 0,
    shortfall: change < 0 ? Math.abs(change) : 0,
    paymentMethod: message.payload.paymentMethod
  })
  break

case 'PAYMENT_COMPLETE':
  // Keep cart visible until this message
  // Clear cart after showing "Sale Complete" for 3 seconds
  setTimeout(() => {
    setCart({ items: [], subtotal: 0, tax: 0, total: 0 })
    setPaymentState({ inProgress: false, amountTendered: 0, changeDue: 0, shortfall: 0 })
  }, 3000)
  break

case 'PAYMENT_CANCELLED':
  // Return to cart view
  setPaymentState({ inProgress: false, amountTendered: 0, changeDue: 0, shortfall: 0 })
  break
```

#### Task 3: Update CartDisplay Component to Show Payment Info
**File**: `src/components/customer-display/cart-display.tsx`

Add payment info props:
```typescript
interface CartDisplayProps {
  // Existing props...
  items: CartItem[]
  subtotal: number
  tax: number
  total: number

  // NEW: Payment props
  paymentInProgress?: boolean
  amountTendered?: number
  changeDue?: number
  shortfall?: number
  paymentMethod?: string
}
```

Update display to show payment info when payment is in progress.

#### Task 4: Update POS Components to Broadcast Payment State

**Restaurant POS** (`src/app/restaurant/pos/page.tsx`):
- Broadcast `PAYMENT_STARTED` when checkout modal opens
- Broadcast `PAYMENT_AMOUNT` when amount tendered changes
- Broadcast `PAYMENT_COMPLETE` after receipt prints
- Broadcast `PAYMENT_CANCELLED` if payment is cancelled

**Grocery POS** (`src/app/grocery/pos/page.tsx`):
- Same as restaurant

**Clothing Advanced POS** (`src/app/clothing/pos/components/advanced-pos.tsx`):
- Same as above

**Universal POS** (`src/components/universal/pos-system.tsx`):
- Same as above

## Testing Checklist

### Test 1: Business Switching
- [ ] Start app, login to Restaurant business
- [ ] Customer display shows Restaurant info
- [ ] Add items to cart - verify they appear on display
- [ ] Switch to Fashion business in sidebar
- [ ] Verify customer display switches to Fashion business
- [ ] Add items to Fashion cart - verify they appear on display

### Test 2: Payment Workflow
- [ ] Add items to cart
- [ ] Items visible on customer display
- [ ] Click checkout/payment
- [ ] Customer display still shows cart + "Payment in Progress"
- [ ] Enter amount tendered (less than total)
- [ ] Customer display shows shortfall
- [ ] Enter full amount
- [ ] Customer display shows change due
- [ ] Complete payment and print receipt
- [ ] Customer display shows "Sale Complete" for 3 seconds
- [ ] Cart clears after 3 seconds

### Test 3: Payment Cancellation
- [ ] Add items to cart
- [ ] Start payment
- [ ] Cancel payment
- [ ] Customer display returns to cart view
- [ ] Cart is NOT cleared

## Files to Modify

1. `src/lib/customer-display/broadcast-sync.ts` - New message types
2. `src/app/customer-display/page.tsx` - Payment state handling
3. `src/components/customer-display/cart-display.tsx` - Payment UI
4. `src/app/restaurant/pos/page.tsx` - Payment broadcasting
5. `src/app/grocery/pos/page.tsx` - Payment broadcasting
6. `src/app/clothing/pos/components/advanced-pos.tsx` - Payment broadcasting
7. `src/components/universal/pos-system.tsx` - Payment broadcasting

## Current Status

- ✅ Fixed BroadcastSync.connect() issue
- ✅ Committed and pushing to GitHub
- ⏳ Waiting for app restart to test business switching
- 🔲 Payment state broadcasting not yet implemented
