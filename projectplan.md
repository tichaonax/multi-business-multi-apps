# Fix Customer Display: Business Information Not Loading

## Problem

Customer display shows all null business IDs:
```json
{
    "initialBusinessId": null,
    "currentActiveBusinessId": null,
    "displayBusinessId": null,
    "terminalId": "terminal-1768125949429",
    "channelName": "customer-display"
}
```

## Root Cause

The `BusinessPermissionsContext` creates a `BroadcastSync` instance but never calls `.connect()` before sending messages.

**File:** `src/contexts/business-permissions-context.tsx` (lines 152-167)

```typescript
// Creates BroadcastSync
const sync = new BroadcastSync({
  businessId: currentBusinessId,
  terminalId: 'main-window',
});

// ❌ NEVER CALLS sync.connect() ❌

// Tries to send without connecting
sync.send('SET_ACTIVE_BUSINESS', {
  subtotal: 0,
  tax: 0,
  total: 0,
});
```

**Why it fails:**
- `BroadcastSync.send()` checks if `this.channel` is not null
- `this.channel` is only created when you call `connect()`
- Without `connect()`, the channel is null and the send fails silently

**From broadcast-sync.ts line 142:**
```typescript
send(type: CartMessageType, payload: CartMessage['payload']): void {
  if (!this.channel) {
    console.warn('BroadcastSync: Cannot send message, channel not connected');
    return; // ❌ Fails silently
  }
```

## Solution

Call `sync.connect()` before `sync.send()`.

## Implementation Plan

### Task 1: Fix BusinessPermissionsContext Broadcasting
- [ ] Update the useEffect in `BusinessPermissionsContext` to call `sync.connect()` before sending
- [ ] Keep the delay to ensure customer display is ready
- [ ] Ensure proper cleanup with disconnect

**File:** `src/contexts/business-permissions-context.tsx` (lines 142-172)

**Change:**
```typescript
// Before (BROKEN):
const sync = new BroadcastSync({
  businessId: currentBusinessId,
  terminalId: 'main-window',
});

const timer = setTimeout(() => {
  sync.send('SET_ACTIVE_BUSINESS', { ... });
  sync.disconnect();
}, 500);

// After (FIXED):
const sync = new BroadcastSync({
  businessId: currentBusinessId,
  terminalId: 'main-window',
});

// Connect the channel
sync.connect();

const timer = setTimeout(() => {
  sync.send('SET_ACTIVE_BUSINESS', { ... });
  sync.disconnect();
}, 500);
```

### Task 2: Verify Customer Display Connection
- [ ] Ensure customer display is properly listening for messages
- [ ] Check console logs for message receipt

### Task 3: Test End-to-End
- [ ] Start app with `npm run dev`
- [ ] Login to see business selection
- [ ] Verify customer display receives businessId
- [ ] Check console for successful broadcast message
- [ ] Verify business info appears on customer display

## Impact Analysis

**Files to modify:**
1. `src/contexts/business-permissions-context.tsx` - Add `sync.connect()` call

**Risk:** Very low - simple one-line addition

**Breaking changes:** None

## Expected Result

After fix:
1. User logs in → BusinessPermissionsContext sets currentBusinessId
2. useEffect triggers, creates BroadcastSync
3. **Calls sync.connect() to initialize channel** ← FIX
4. Sends SET_ACTIVE_BUSINESS message
5. Customer display receives message
6. Customer display fetches business info
7. Business name, phone, etc. appear on display
