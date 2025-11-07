# Demo Business Exclusion from Sync

## Overview

Demo businesses are **completely excluded** from the sync system to prevent test/sample data from propagating between production machines.

## How Demo Businesses are Identified

Demo businesses are identified by **ID pattern matching**, NOT by the `type` field.

### ID Patterns
Demo businesses have IDs matching these patterns:
- Contains `-demo-business` (e.g., `construction-demo-business`)
- Ends with `-demo` (e.g., `restaurant-demo`)
- Starts with `demo-` (e.g., `demo-store`)
- Equals `demo` exactly

### Example Demo Businesses
```
ID: construction-demo-business
Name: BuildRight [Demo]
Type: construction (NOT 'demo'!)

ID: restaurant-demo
Name: Restaurant [Demo]
Type: restaurant (NOT 'demo'!)
```

**Important:** The `type` field is NOT used for demo detection, as demo businesses have actual business types (restaurant, construction, etc.).

## Safeguards in Place

### 1. Change Tracker (Outgoing Events)
**File:** `src/lib/sync/change-tracker.ts`

**Function:** `filterDemoBusinessEvents()`

**Protection:**
- Filters out demo business events BEFORE creating sync events
- Checks both direct business changes and related table changes
- Uses `isDemoBusinessId()` to detect demo businesses

**Code:**
```typescript
private async isDemoBusinessEvent(event: any): Promise<boolean> {
  const { tableName, recordId, changeData } = event

  // Check if the event is directly on the businesses table
  if (tableName === 'businesses' || tableName === 'Businesses') {
    return this.isDemoBusinessId(recordId)
  }

  // For other tables, check if they have a businessId field
  if (changeData && typeof changeData === 'object') {
    const businessId = changeData.businessId || changeData.business_id
    if (businessId) {
      return this.isDemoBusinessId(businessId)
    }
  }

  return false
}
```

**Result:** Demo business changes never create sync events in the first place.

### 2. Initial Load (Bulk Export)
**File:** `src/app/api/admin/sync/initial-load/route.ts`

**Function:** `transferDataInBackground()`

**Protection:**
- Filters demo businesses BEFORE exporting to peer
- Uses `isDemoBusinessId()` to detect demo businesses
- Only transfers real businesses during initial load

**Code:**
```typescript
// Export businesses (excluding demo)
const allBusinesses = await prisma.businesses.findMany()
const businesses = allBusinesses.filter(b => !isDemoBusinessId(b.id))
```

**Result:** Initial load transfers only 5 real businesses, excludes all 6 demo businesses.

### 3. Sync Receive (Incoming Events)
**File:** `src/app/api/sync/receive/route.ts`

**Function:** `isDemoBusinessEvent()`

**Protection:**
- **Last line of defense** - rejects incoming demo events even if sent
- Logs rejection: "Rejected demo business event: businesses:xxx"
- Returns status: "rejected" with error: "Demo businesses are not synced"
- Uses `isDemoBusinessId()` to detect demo businesses

**Code:**
```typescript
// Filter out demo business events
if (isDemoBusinessEvent(event)) {
  console.log(`Rejected demo business event: ${event.table}:${event.recordId}`)
  processedEvents.push({
    eventId: event.id,
    status: 'rejected',
    error: 'Demo businesses are not synced'
  })
  continue // Skip demo events
}
```

**Result:** Even if a peer sends demo data, it will be rejected and not applied to the database.

### 4. Data Snapshot (Inventory)
**File:** `src/app/api/admin/sync/initial-load/route.ts`

**Function:** `createDataSnapshot()`

**Protection:**
- Shows accurate count of syncable businesses
- Filters demo businesses from inventory
- Provides correct data size estimates

**Code:**
```typescript
const allBusinesses = await prisma.businesses.findMany()
const businesses = allBusinesses.filter(b => !isDemoBusinessId(b.id))
```

**Result:** Snapshot shows only real businesses (5), not demo businesses (6).

## Detection Logic

All safeguards use the same `isDemoBusinessId()` function:

```typescript
function isDemoBusinessId(businessId: string): boolean {
  if (!businessId || typeof businessId !== 'string') {
    return false
  }

  const lowerBusinessId = businessId.toLowerCase()

  return lowerBusinessId.includes('-demo-business') ||
         lowerBusinessId.endsWith('-demo') ||
         lowerBusinessId.startsWith('demo-') ||
         lowerBusinessId === 'demo'
}
```

## Current State

On this machine (Machine B - dell-hwandaza):

### Total Businesses: 11
### Real Businesses (will sync): 5
1. Builders Corner (construction)
2. Mvimvi Groceries (grocery)
3. HXI Bhero (clothing)
4. HXI Eats (restaurant)
5. HXI Fashions (clothing)

### Demo Businesses (will NOT sync): 6
1. BuildRight [Demo] - `construction-demo-business`
2. Grocery [Demo] - `grocery-demo-business`
3. Hardware [Demo] - `hardware-demo-business`
4. Clothing [Demo] - `clothing-demo-business`
5. Restaurant [Demo] - `restaurant-demo`
6. Contractors [Demo] - `contractors-demo-business`

## Protection Layers

The system has **3 layers of protection** against demo data sync:

1. **Outgoing Filter** (Change Tracker) - Don't create sync events for demo changes
2. **Export Filter** (Initial Load) - Don't export demo businesses during bulk transfer
3. **Incoming Filter** (Sync Receive) - Reject demo events even if received

This defense-in-depth approach ensures demo data never propagates, even if one safeguard fails.

## Testing

Run the test script to verify filtering:

```bash
node scripts/test-demo-filtering.js
```

Expected output:
- Total businesses: 11
- Will sync: 5
- Filtered out (demo): 6

## Related Tables

The demo filtering also applies to related tables:
- If an `employee` belongs to a demo business, their changes won't sync
- If a `project` belongs to a demo business, it won't sync
- Any table with a `businessId` field is checked against demo business IDs

This ensures **complete isolation** of demo data from the sync system.

## Maintenance

When adding new demo businesses:
1. Use an ID matching the patterns above
2. Include "[Demo]" in the name for user clarity
3. No code changes needed - filtering is automatic

When extending sync to new tables:
1. If the table has a `businessId` field, demo filtering is automatic
2. If not, consider adding demo detection logic in `isDemoBusinessEvent()`

## Verification

To verify demo exclusion is working:
1. Create or update a demo business
2. Check sync events: `node scripts/check-sync-events.js`
3. Should see NO events for demo businesses
4. Run initial load and count transferred businesses
5. Should transfer only 5 businesses, not 11

## Summary

✅ **All demo businesses are completely excluded from sync**
✅ **3 layers of protection ensure no demo data propagates**
✅ **Automatic detection based on ID patterns**
✅ **No configuration needed**
✅ **Works for all related tables with businessId field**
