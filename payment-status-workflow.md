# Payment Status Workflow Guide

## Payment Status Flow

```
PENDING → VOUCHER_ISSUED → SIGNED → COMPLETED
```

## Status Descriptions

1. **PENDING** - Payment created, waiting for voucher
2. **VOUCHER_ISSUED** - Voucher generated for the payment
3. **SIGNED** - Employee has signed/acknowledged the payment (isLocked = true)
4. **COMPLETED** - Employee has received the money

## Action Buttons in Payment History

### Desktop View (Action Column)
- **👁️ View** - Always visible, opens voucher in new tab
- **✍️ Sign** - Shows when status is PENDING or VOUCHER_ISSUED (green button)
- **✅ Complete** - Shows when status is SIGNED (purple button)
- **🔄 Regen** - Shows for non-completed payments (gray button)

### Mobile View (Action Cards)
- Same buttons, displayed vertically full-width

## How to Change Payment Status

### To Sign a Payment (Acknowledge Receipt):
1. Go to **Payroll → Account → Payment History**
2. Find payment with status **VOUCHER_ISSUED**
3. Click **✍️ Sign** button
4. Confirm the action
5. Status changes to **SIGNED** (payment is locked)

### To Complete a Payment (Money Received):
1. Find payment with status **SIGNED**
2. Click **✅ Complete** button
3. Confirm the action
4. Status changes to **COMPLETED**

## API Endpoints

- **Sign Payment**: `POST /api/payroll/account/payments/[paymentId]/sign`
- **Complete Payment**: `POST /api/payroll/account/payments/[paymentId]/complete`

## Requirements

- **To Sign**: Payment must be PENDING or VOUCHER_ISSUED, not already locked
- **To Complete**: Payment must be SIGNED (locked)

## Error Prevention

- Signed payments cannot be edited or deleted (isLocked = true)
- Completed payments cannot be reversed
- Status transitions are validated by API

