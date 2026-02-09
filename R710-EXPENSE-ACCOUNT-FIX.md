# R710 Expense Account Fix - Summary

## Problem
When placing orders with R710 WiFi tokens, the system throws an error:
```
R710 Token Error: WiFi expense account not configured. Please configure WiFi portal integration.
```

The expense account was not being created during R710 integration setup, and the integration table had no field to store the expense account ID.

## Root Cause
1. The `R710BusinessIntegrations` model didn't have an `expenseAccountId` field
2. The integration POST endpoint created an expense account but didn't store its reference
3. The orders API only checked ESP32 portal integration for expense accounts, not R710

## Solution Implemented

### 1. Database Schema Changes
**File:** `prisma/schema.prisma`

- Added `expenseAccountId` field to `R710BusinessIntegrations` model
- Added foreign key relation to `ExpenseAccounts`
- Added reverse relation in `ExpenseAccounts` model
- Added index for performance

### 2. Integration API Updates
**File:** `src/app/api/r710/integration/route.ts`

**POST endpoint:**
- Creates/gets expense account inside the transaction when creating integration
- Stores expense account ID in the integration record
- Ensures atomic creation (integration + WLAN + expense account all succeed or all fail)

**PATCH endpoint:**
- Checks if integration is missing expense account
- Creates expense account if missing (fixes existing integrations)
- Links expense account to integration

### 3. Orders API Updates  
**File:** `src/app/api/restaurant/orders/route.ts`

- Checks both ESP32 and R710 integrations for expense accounts
- Auto-creates R710 expense account if integration exists but has no account
- Links newly created account to the integration
- Uses correct expense account (R710-specific) for R710 token sales

### 4. Database Migration
**File:** `prisma/migrations/20260114000002_add_expense_account_to_r710_integration/migration.sql`

- Adds `expense_account_id` column to `r710_business_integrations` table
- Creates index for lookups
- Adds foreign key constraint to `expense_accounts` table

### 5. Repair Script
**File:** `scripts/fix-missing-r710-expense-accounts.js`

- Finds all R710 integrations without expense accounts
- Creates expense accounts for them
- Links accounts to integrations
- Can be run to fix existing data

## How It Works Now

### New Integration Setup
1. User creates R710 integration
2. System creates business-specific WLAN on device
3. System creates/gets expense account with pattern: `R710-{last6CharsOfBusinessId}`
4. System stores expense account ID in integration record
5. All operations in a transaction (atomic)

### Editing Existing Integration
1. User edits WLAN settings via PATCH endpoint
2. System checks if integration has expense account
3. If missing, creates/gets expense account and links it
4. Updates WLAN settings

### Order Processing
1. System checks for R710 integration when R710 tokens are in cart
2. If integration exists but has no expense account:
   - Creates expense account immediately
   - Links it to integration
   - Uses it for the current sale
3. Token sales are recorded with correct expense account

## Testing Steps

1. **Apply Migration:**
   ```bash
   npx prisma migrate dev --name add_expense_account_to_r710_integration
   ```

2. **Fix Existing Integrations:**
   ```bash
   node scripts/fix-missing-r710-expense-accounts.js
   ```

3. **Test New Integration:**
   - Create a new R710 integration
   - Verify expense account is created
   - Verify `expenseAccountId` is set in `r710_business_integrations` table

4. **Test Order with R710 Token:**
   - Add R710 token to cart
   - Complete order with CASH payment
   - Verify order succeeds
   - Verify sale is recorded in `r710_token_sales` with correct `expenseAccountId`

5. **Test Existing Integration Edit:**
   - Edit WLAN settings for an old integration (without expense account)
   - Verify expense account is created automatically
   - Verify integration is updated with `expenseAccountId`

## Files Changed

1. `prisma/schema.prisma` - Added expense account fields and relations
2. `src/app/api/r710/integration/route.ts` - Integration creation and editing
3. `src/app/api/restaurant/orders/route.ts` - Order processing with R710 tokens
4. `prisma/migrations/20260114000002_add_expense_account_to_r710_integration/migration.sql` - Database migration
5. `scripts/fix-missing-r710-expense-accounts.js` - Repair script for existing data

## Benefits

✅ **Automatic Account Creation:** No manual expense account setup needed
✅ **Self-Healing:** System creates missing accounts automatically during orders/edits
✅ **Transaction Safety:** Integration creation is atomic
✅ **Backward Compatible:** Fixes existing integrations on-the-fly
✅ **Proper Separation:** R710 and ESP32 accounts are separate
