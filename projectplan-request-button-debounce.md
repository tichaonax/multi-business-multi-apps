# Fix: Prevent Double-Click on "Request More" Buttons

**Date:** 2025-12-28
**Priority:** High - UX Issue & Potential Duplicate API Calls

---

## Problem
Users can click "Request More" buttons multiple times before the API response returns, causing:
- Multiple API calls to R710/ESP32 devices
- Potential duplicate token creation
- Poor user experience

## Solution
Add button disable state management:
1. Disable button immediately on click
2. Re-enable only after API response (success or failure)
3. Show loading state during API call

## Buttons to Fix

### 1. Restaurant POS - Unified WiFi Token Button
- **File:** `src/app/restaurant/pos/page.tsx`
- **Line:** ~1297
- **Handles:** Both ESP32 and R710 tokens (detects type)

### 2. Grocery POS - ESP32 Token Button
- **File:** `src/app/grocery/pos/page.tsx`
- **Line:** ~1640

### 3. Grocery POS - R710 Token Button
- **File:** `src/app/grocery/pos/page.tsx`
- **Line:** ~1680

## Implementation Plan

### For Each Button:
1. Add state variable to track loading per token config
2. Set loading state to true on click
3. Wrap API call in try/finally to always re-enable
4. Disable button when loading
5. Optional: Show loading spinner/text

### State Management Strategy
Since buttons are inside mapped items, use a Map or object to track loading state by `tokenConfigId`:

```typescript
const [requestingMore, setRequestingMore] = useState<Set<string>>(new Set());

// On click:
setRequestingMore(prev => new Set(prev).add(tokenConfigId));

// In finally:
setRequestingMore(prev => {
  const next = new Set(prev);
  next.delete(tokenConfigId);
  return next;
});

// Disable condition:
disabled={requestingMore.has(item.tokenConfigId)}
```

## Todo
- [x] Add loading state to Restaurant POS button
- [x] Add loading state to Grocery POS ESP32 button
- [x] Add loading state to Grocery POS R710 button
- [ ] Test all buttons work correctly
- [ ] Verify buttons re-enable on error
- [ ] Verify buttons re-enable on success

---

## Implementation Complete

### Files Modified

1. **src/app/restaurant/pos/page.tsx**
   - Added `requestingMore` state (line 61)
   - Updated unified WiFi button with disable logic (lines 1297-1371)
   - Button now shows "⏳ Requesting..." while API call in progress

2. **src/app/grocery/pos/page.tsx**
   - Added `requestingMore` state (line 100)
   - Updated ESP32 button with disable logic (lines 1609-1677)
   - Updated R710 button with disable logic (lines 1690-1758)
   - Both buttons show "⏳ Requesting..." while API call in progress

### Key Features

**State Management:**
```typescript
const [requestingMore, setRequestingMore] = useState<Set<string>>(new Set())
```

**On Button Click:**
- Immediately adds `tokenConfigId` to `requestingMore` Set
- Disables button via `disabled` attribute
- Shows loading indicator

**On API Response (success or error):**
- Finally block removes `tokenConfigId` from Set
- Re-enables button automatically
- Prevents double-clicks and duplicate API calls

**UI Feedback:**
- Disabled state: Gray background, cursor not-allowed
- Loading text: "⏳ Requesting..." replaces "+ Request 5 More"
- Always re-enables after API response (even on error)

### Testing

✅ Build successful (658 routes)
✅ TypeScript compilation passed
✅ All 3 buttons updated with identical logic

**User Testing Required:**
- [ ] Click button and verify it disables immediately
- [ ] Verify button shows "⏳ Requesting..." text
- [ ] Verify button re-enables after success
- [ ] Verify button re-enables after error
- [ ] Try rapid clicking - should only send one request

---

**Status:** ✅ **COMPLETE** - Ready for Testing
**Date:** 2025-12-28
**Lines Changed:** ~50 lines total
**Buttons Fixed:** 3 (Restaurant unified, Grocery ESP32, Grocery R710)
