# End-of-Day & End-of-Week Reports with Record Locking

**Date:** 2026-01-07
**Status:** 🔧 **PLANNING**
**Priority:** High - Business compliance and record-keeping requirement

---

## Problem Statement

The current end-of-day reports are dynamic - they regenerate from database queries each time viewed. This means:
- ❌ Historical reports can change if past data is modified
- ❌ No permanent record of what the manager actually signed off on
- ❌ No audit trail for compliance
- ❌ Cannot recreate exact reports in the future
- ❌ Print format uses colors and backgrounds (wastes ink)
- ❌ No end-of-week reports for weekly filing
- ❌ Only exists for restaurant, not all business types

### Requirements

1. **Lock Reports** - Save a permanent snapshot when manager signs
2. **Manager Signature** - Capture who signed and when
3. **Print-Friendly** - No colors, no backgrounds, conserve paper
4. **End-of-Week Reports** - Weekly aggregated reports
5. **Universal** - Works for all business types (Restaurant, Grocery, Hardware, Clothing)
6. **Recreation** - Ability to view exact historical reports as they were signed

---

## Current State Analysis

### Existing Implementation

**Restaurant End-of-Day:**
- Page: `src/app/restaurant/reports/end-of-day/page.tsx`
- Shows: Sales summary, payment methods, employee sales, category breakdown, till reconciliation
- Has: Manager name input field (but not saved)
- Has: Print button (but uses colors/backgrounds)
- Issue: Data is dynamic - regenerated from live database queries

**Historical Reports:**
- Page: `src/app/restaurant/reports/history/page.tsx`
- Shows: List of past days with sales data
- Issue: Not locked snapshots, just aggregated queries

**Missing:**
- ✗ No saved/locked report records in database
- ✗ No end-of-week reports
- ✗ Not available for Grocery, Hardware, Clothing
- ✗ No print-optimized stylesheet

---

## Database Schema Design

### New Tables

#### 1. SavedReports (Universal for all business types)

```prisma
model SavedReports {
  id                String   @id @default(cuid())
  businessId        String
  reportType        String   // 'END_OF_DAY' | 'END_OF_WEEK'
  reportDate        DateTime @db.Date  // Business day date
  periodStart       DateTime // Start of period
  periodEnd         DateTime // End of period

  // Snapshot data (JSON)
  reportData        Json     // Complete report data snapshot

  // Manager sign-off
  managerName       String
  managerUserId     String?  // Link to user if logged in
  signedAt          DateTime

  // Till reconciliation (for day reports)
  expectedCash      Decimal? @db.Decimal(10, 2)
  cashCounted       Decimal? @db.Decimal(10, 2)
  variance          Decimal? @db.Decimal(10, 2)

  // Summary metrics (for quick queries)
  totalSales        Decimal  @db.Decimal(10, 2)
  totalOrders       Int
  receiptsIssued    Int

  // Metadata
  createdAt         DateTime @default(now())
  createdBy         String
  isLocked          Boolean  @default(true)  // Locked reports cannot be edited

  // Relations
  business          Businesses @relation(fields: [businessId], references: [id])

  @@index([businessId, reportType, reportDate])
  @@index([reportDate])
  @@unique([businessId, reportType, reportDate])
}
```

**reportData JSON Structure:**
```json
{
  "summary": {
    "totalSales": 5432.50,
    "totalOrders": 87,
    "averageOrderValue": 62.44,
    "receiptsIssued": 87,
    "totalTax": 543.25
  },
  "paymentMethods": {
    "CASH": { "count": 45, "total": 2100.00 },
    "CARD": { "count": 30, "total": 2500.00 },
    "MOBILE": { "count": 12, "total": 832.50 }
  },
  "employeeSales": [
    { "name": "John Doe", "orders": 30, "sales": 1800.00 },
    { "name": "Jane Smith", "orders": 25, "sales": 1500.00 }
  ],
  "categoryBreakdown": [
    { "name": "Appetizers", "itemCount": 50, "totalSales": 1200.00 },
    { "name": "Main Course", "itemCount": 87, "totalSales": 3000.00 }
  ],
  "businessDay": {
    "date": "2026-01-07",
    "start": "2026-01-07T06:00:00Z",
    "end": "2026-01-07T22:00:00Z"
  }
}
```

---

## Implementation Plan

### Phase 1: Database Setup ✅

**Tasks:**
- [ ] Create Prisma migration for `SavedReports` table
- [ ] Run migration on development database
- [ ] Verify schema with `npx prisma validate`

**Files:**
- `prisma/schema.prisma` - Add SavedReports model
- `prisma/migrations/YYYYMMDD_add_saved_reports/migration.sql`

---

### Phase 2: Print-Friendly Stylesheet

**Requirements:**
- Remove all background colors
- Remove all colored text (use grayscale only)
- Optimize page breaks
- Reduce margins
- Use black text on white background
- Keep only essential information

**Implementation:**
```css
@media print {
  /* Remove all colors */
  * {
    background-color: white !important;
    color: black !important;
    border-color: #999 !important;
  }

  /* Remove shadows and decorations */
  * {
    box-shadow: none !important;
    text-shadow: none !important;
  }

  /* Optimize spacing */
  body {
    margin: 0.5cm;
    font-size: 10pt;
  }

  /* Hide charts and visual elements */
  .no-print {
    display: none !important;
  }

  /* Page breaks */
  h3 {
    page-break-after: avoid;
  }

  table {
    page-break-inside: avoid;
  }
}
```

**Tasks:**
- [ ] Create `src/styles/print-report.css` stylesheet
- [ ] Test print preview in all browsers
- [ ] Optimize for A4 and Letter paper sizes

---

### Phase 3: Save Report API

**Endpoint:** `POST /api/reports/save`

**Request Body:**
```json
{
  "businessId": "business-id",
  "reportType": "END_OF_DAY",
  "reportDate": "2026-01-07",
  "managerName": "John Manager",
  "cashCounted": 2105.50,
  "reportData": { /* full report snapshot */ }
}
```

**Logic:**
1. Validate business access
2. Check if report already exists (prevent duplicates)
3. Calculate expected cash, variance
4. Save snapshot to database
5. Mark as locked (isLocked = true)
6. Return saved report ID

**Tasks:**
- [ ] Create `src/app/api/reports/save/route.ts`
- [ ] Add authentication/authorization checks
- [ ] Validate report data structure
- [ ] Handle duplicate prevention
- [ ] Add error handling

---

### Phase 4: View Saved Reports API

**Endpoint:** `GET /api/reports/saved?businessId={id}&reportType={type}&startDate={date}&endDate={date}`

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "id": "report-id",
      "reportType": "END_OF_DAY",
      "reportDate": "2026-01-07",
      "managerName": "John Manager",
      "signedAt": "2026-01-07T22:05:00Z",
      "totalSales": 5432.50,
      "totalOrders": 87,
      "isLocked": true,
      "reportData": { /* full snapshot */ }
    }
  ]
}
```

**Tasks:**
- [ ] Create `src/app/api/reports/saved/route.ts`
- [ ] Add pagination support
- [ ] Add filtering by date range, report type
- [ ] Return full snapshot data

---

### Phase 5: Update End-of-Day Report UI

**Changes to:** `src/app/restaurant/reports/end-of-day/page.tsx`

**New Features:**
1. **Save Report Button**
   - Appears next to Print button
   - Opens confirmation modal
   - Requires manager name
   - Saves snapshot to database
   - Shows success message

2. **Lock Indicator**
   - Show if today's report is already locked
   - Display who signed and when
   - Show "View Locked Report" link

3. **Print Stylesheet**
   - Import print-report.css
   - Remove all color classes in print mode
   - Simplify layout for printing

**Tasks:**
- [ ] Add "Save & Lock Report" button
- [ ] Create save confirmation modal
- [ ] Implement save report handler
- [ ] Add locked report indicator
- [ ] Update print styles to be ink-friendly
- [ ] Test print preview

---

### Phase 6: Saved Reports History Page

**Update:** `src/app/restaurant/reports/history/page.tsx`

**Changes:**
1. Query `SavedReports` table instead of live data
2. Show lock status icon
3. Show who signed each report
4. Link to view exact locked snapshot
5. Filter by date range, report type

**Tasks:**
- [ ] Update API to query SavedReports table
- [ ] Display lock icon for saved reports
- [ ] Show manager signature
- [ ] Add filters for report type
- [ ] Link to view locked report

---

### Phase 7: View Locked Report Page

**New Page:** `src/app/[businessType]/reports/saved/[reportId]/page.tsx`

**Purpose:** Display exact locked report as it was signed

**Features:**
- Render report from snapshot JSON
- Show "LOCKED" watermark/badge
- Show manager signature and date
- Print-friendly format
- Cannot be edited
- Reprint anytime

**Tasks:**
- [ ] Create view locked report page
- [ ] Render report from JSON snapshot
- [ ] Add locked indicator/watermark
- [ ] Support all business types via dynamic route
- [ ] Add print button

---

### Phase 8: End-of-Week Reports

**New Page:** `src/app/[businessType]/reports/end-of-week/page.tsx`

**Data Aggregation:**
- Sum all daily sales for the week
- Aggregate payment methods
- Combine employee sales
- Merge category breakdowns
- Calculate weekly averages

**Week Definition:**
- Monday to Sunday
- Or custom business week (configurable)

**Features:**
- Similar layout to end-of-day report
- Shows 7-day period
- Lists daily breakdowns
- Weekly totals and averages
- Manager sign-off
- Save & lock functionality

**Tasks:**
- [ ] Create end-of-week report API
- [ ] Calculate weekly aggregations
- [ ] Create end-of-week UI page
- [ ] Add week selector (previous weeks)
- [ ] Implement save/lock for weekly reports
- [ ] Add to navigation menu

---

### Phase 9: Universal Business Type Support

**Affected Business Types:**
- ✅ Restaurant (already exists, needs enhancement)
- 🔧 Grocery (create similar structure)
- 🔧 Hardware (create similar structure)
- 🔧 Clothing (create similar structure)

**Implementation Strategy:**
1. Create shared report components
2. Use dynamic routing for business type
3. Adapt data structure per business type
4. Reuse SavedReports table universally

**Shared Components to Create:**
```
src/components/reports/
  ├── saved-report-viewer.tsx      # View locked report
  ├── report-save-modal.tsx        # Save confirmation modal
  ├── report-history-list.tsx      # List of saved reports
  ├── print-report-layout.tsx      # Print-friendly layout wrapper
  └── weekly-report-layout.tsx     # End-of-week template
```

**Tasks:**
- [ ] Create shared report components
- [ ] Add end-of-day reports for Grocery
- [ ] Add end-of-day reports for Hardware
- [ ] Add end-of-day reports for Clothing
- [ ] Add end-of-week reports for all business types
- [ ] Test across all business types

---

### Phase 10: Navigation & Access

**Update Navigation:**
- Add "End-of-Week Report" menu item
- Add "Saved Reports" menu item
- Show in all business type sidebars

**Permission Checks:**
- Only managers can save/lock reports
- All staff can view unlocked reports
- All staff can view locked reports (read-only)
- Admin can unlock reports if needed (special permission)

**Tasks:**
- [ ] Update sidebar navigation for all business types
- [ ] Add permission checks to save API
- [ ] Add role-based UI elements
- [ ] Test with different user roles

---

## Testing Checklist

### End-of-Day Reports

**Before Locking:**
- [ ] Report displays current day's data
- [ ] Manager can enter name
- [ ] Cash counted calculates variance correctly
- [ ] Print preview shows ink-friendly format (no colors)

**Save & Lock:**
- [ ] Save button appears
- [ ] Confirmation modal shows
- [ ] Manager name is required
- [ ] Report saves to database
- [ ] Success message appears
- [ ] Cannot save duplicate for same day

**After Locking:**
- [ ] Locked indicator appears
- [ ] Shows who signed and when
- [ ] Can view locked report
- [ ] Locked report matches original data exactly
- [ ] Cannot edit locked report

### End-of-Week Reports

- [ ] Selects correct week period (Mon-Sun)
- [ ] Aggregates all daily data correctly
- [ ] Shows daily breakdown
- [ ] Calculates weekly totals
- [ ] Save & lock works same as daily reports
- [ ] Print format is ink-friendly

### Print Testing

- [ ] No background colors in print preview
- [ ] No colored text (all black/grayscale)
- [ ] Page breaks appropriately
- [ ] Fits on standard paper (A4/Letter)
- [ ] All essential info visible
- [ ] Charts hidden in print mode
- [ ] Signature section prints correctly

### Multi-Business Support

- [ ] Works for Restaurant
- [ ] Works for Grocery
- [ ] Works for Hardware
- [ ] Works for Clothing
- [ ] Each business sees only their reports
- [ ] Business isolation enforced

---

## Migration Strategy

### Step 1: Database Migration
```bash
npx prisma migrate dev --name add_saved_reports
```

### Step 2: Backfill Historical Data (Optional)
- Script to generate locked reports from historical receipt data
- Only for recent history (last 30-90 days)
- Marks as system-generated (no manager signature)

### Step 3: User Training
- Document new save/lock process
- Train managers on end-of-day procedure
- Explain end-of-week reports
- Show how to view historical locked reports

---

## File Structure

### New Files to Create

```
prisma/
  └── migrations/
      └── YYYYMMDD_add_saved_reports/
          └── migration.sql

src/
  ├── app/
  │   ├── api/
  │   │   └── reports/
  │   │       ├── save/
  │   │       │   └── route.ts           # Save report API
  │   │       ├── saved/
  │   │       │   └── route.ts           # Get saved reports API
  │   │       └── weekly/
  │   │           └── route.ts           # End-of-week data API
  │   │
  │   ├── [businessType]/
  │   │   └── reports/
  │   │       ├── end-of-week/
  │   │       │   └── page.tsx           # End-of-week report page
  │   │       └── saved/
  │   │           └── [reportId]/
  │   │               └── page.tsx       # View locked report
  │   │
  │   ├── grocery/
  │   │   └── reports/
  │   │       └── end-of-day/
  │   │           └── page.tsx           # Grocery end-of-day
  │   ├── hardware/
  │   │   └── reports/
  │   │       └── end-of-day/
  │   │           └── page.tsx           # Hardware end-of-day
  │   └── clothing/
  │       └── reports/
  │           └── end-of-day/
  │               └── page.tsx           # Clothing end-of-day
  │
  ├── components/
  │   └── reports/
  │       ├── saved-report-viewer.tsx
  │       ├── report-save-modal.tsx
  │       ├── report-history-list.tsx
  │       ├── print-report-layout.tsx
  │       └── weekly-report-layout.tsx
  │
  └── styles/
      └── print-report.css               # Print-friendly stylesheet
```

### Files to Modify

```
src/app/restaurant/reports/end-of-day/page.tsx  # Add save/lock functionality
src/app/restaurant/reports/history/page.tsx     # Query saved reports
src/app/grocery/reports/history/page.tsx        # Query saved reports
src/app/hardware/reports/history/page.tsx       # Query saved reports
src/app/clothing/reports/history/page.tsx       # Query saved reports
```

---

## Success Criteria

### Functionality
- ✅ Reports can be saved and locked
- ✅ Manager signature captured
- ✅ Historical reports display exact locked data
- ✅ End-of-week reports aggregate correctly
- ✅ Works for all 4 business types

### Print Quality
- ✅ No colors in print (ink-friendly)
- ✅ No backgrounds (paper-efficient)
- ✅ Fits on single or minimal pages
- ✅ All essential data visible
- ✅ Professional appearance

### Data Integrity
- ✅ Locked reports never change
- ✅ Cannot duplicate reports for same day
- ✅ Manager signature required
- ✅ Audit trail complete
- ✅ Can recreate reports years later

### User Experience
- ✅ Simple save/lock process
- ✅ Clear locked/unlocked indicators
- ✅ Easy navigation to historical reports
- ✅ Fast report generation
- ✅ Intuitive UI across all business types

---

## Estimated Complexity

**Total Effort:** Medium-Large (2-3 days)

**Breakdown:**
- Phase 1 (Database): 1 hour
- Phase 2 (Print CSS): 2 hours
- Phase 3-4 (APIs): 4 hours
- Phase 5-7 (UI Updates): 6 hours
- Phase 8 (Weekly Reports): 4 hours
- Phase 9 (Multi-business): 6 hours
- Phase 10 (Navigation): 2 hours
- Testing: 3 hours

**Total:** ~28 hours

---

## Dependencies

- Prisma ORM (database)
- Next.js App Router
- Existing report data structure
- Business permissions system
- User authentication

---

## Risk Assessment

**Low Risk:**
- Additive feature (doesn't break existing functionality)
- Clear requirements
- Well-defined data structure

**Potential Issues:**
- Large JSON snapshots (solution: compression or separate tables)
- Historical data backfill (solution: optional, not required)
- Print compatibility across browsers (solution: extensive testing)

---

## Future Enhancements

- **Monthly Reports** - End-of-month aggregations
- **Report Comparison** - Compare week-over-week, month-over-month
- **Export to PDF** - Generate PDF files for emailing
- **Report Templates** - Custom report formats per business
- **Automated Scheduling** - Auto-save reports at business day end
- **Email Reports** - Auto-email to managers
- **Report Analytics** - Trend analysis over time

---

## Review Section

_To be completed after implementation_

---

**Next Steps:**
1. ✅ Review this plan
2. ⏳ **Get user approval**
3. ⏳ Begin Phase 1 (Database setup)
4. ⏳ Implement phases sequentially
5. ⏳ Test thoroughly
6. ⏳ Deploy to production

---

**Status:** ✅ **PLAN COMPLETE - AWAITING USER APPROVAL**

---
