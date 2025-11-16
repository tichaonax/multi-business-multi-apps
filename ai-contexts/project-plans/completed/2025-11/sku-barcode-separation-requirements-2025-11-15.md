# Requirements Document: SKU and Barcode Separation

**Project ID:** NOTKT-SKU-BARCODE-SEPARATION
**Date Created:** 2025-11-15
**Status:** 🟢 APPROVED - Ready for Implementation
**Priority:** HIGH - Fundamental Architecture Fix
**Estimated Duration:** 5-6 weeks

---

## 📋 Executive Summary

### Problem Statement
The current system incorrectly treats **SKU (Stock Keeping Unit)** and **barcode (scan code)** as interchangeable identifiers, storing them in a single field and searching them together. This fundamental design flaw prevents the system from supporting universal product codes (UPC/EAN) that are shared across multiple businesses.

### Solution Overview
Implement a new `ProductBarcodes` table that separates barcode management from SKU identification, enabling:
- Multiple barcodes per product/variant (UPC, EAN, QR codes, warehouse codes)
- Universal barcode lookup across all businesses
- Proper distinction between business-internal SKUs and physical scan codes
- Support for multiple barcode types with proper metadata

### Business Impact
- **Retailers:** Can now use manufacturer UPCs for scanning
- **Multi-location businesses:** Can share UPC data while maintaining separate SKUs
- **Inventory management:** More accurate tracking with proper barcode typing
- **Future integrations:** Enables UPC database lookups and price comparison

---

## 🎯 Approved Requirements

### User Answers to Open Questions

| Question | Decision | Impact |
|----------|----------|--------|
| **Barcode Validation** | Allow Flexible | Custom barcodes permitted, no strict format enforcement |
| **Historical Data** | YES - Preserve | Track which barcode was scanned in order/transaction history |
| **UPC Database Integration** | NOT at the moment | Can be added as future enhancement |
| **Variant SKU Uniqueness** | Option B: Maintain current (unique within business) | No breaking change to existing SKU logic |
| **Primary Barcode Priority** | Universal UPC (if exists) | UPC takes precedence for scanning |
| **Timeline** | Implement everything (5-6 weeks) | Full implementation, no phased rollout |
| **Backward Compatibility** | NO - Fresh migration | Clean break: backup → fresh install → restore data |

---

## 🏗️ System Architecture

### Current State (Flawed)

```
BusinessProducts
├─ sku: "DR-18V-001"          ← Business-internal ID
└─ barcode: "012345678901"    ← Single field, ambiguous

ProductVariants
├─ sku: "DR-18V-001-STD"      ← Globally unique (wrong!)
└─ barcode: "012345678902"    ← Single field

Barcode Lookup:
OR [
  { sku: barcode },            ← Treats SKU as barcode
  { barcode: barcode }         ← Can't distinguish types
]
```

### Target State (Correct)

```
BusinessProducts
├─ sku: "DR-18V-001"                    ← Business-internal ID
└─ product_barcodes[] ← NEW RELATION
    ├─ ProductBarcode
    │   ├─ code: "088381652001"
    │   ├─ type: "UPC_A"
    │   ├─ isPrimary: true
    │   ├─ isUniversal: true            ← Shared across businesses
    │   └─ label: "Retail UPC"
    ├─ ProductBarcode
    │   ├─ code: "HW-DR-001"
    │   ├─ type: "CODE128"
    │   ├─ isUniversal: false           ← Business-specific
    │   └─ label: "Warehouse Location"
    └─ ProductBarcode
        ├─ code: "https://shop.com/..."
        ├─ type: "QR_CODE"
        └─ label: "Mobile App QR"

ProductVariants
├─ sku: "DR-18V-001-STD"               ← Business-scoped
└─ product_barcodes[] ← NEW RELATION
    └─ (inherits or has own barcodes)
```

---

## 📊 Data Model Requirements

### New Table: `ProductBarcodes`

**Required Fields:**
```prisma
id                String          @id @default(uuid())

// Ownership
productId         String?         // Parent product (optional)
variantId         String?         // Specific variant (optional)

// Barcode data
code              String          // Actual barcode value
type              BarcodeType     // ENUM: UPC_A, EAN_13, CODE128, QR_CODE, etc.

// Classification
isPrimary         Boolean         @default(false)
isUniversal       Boolean         @default(false)
isActive          Boolean         @default(true)

// Descriptive metadata
label             String?         // "Retail UPC", "Case Barcode"
notes             String?

// Business association (for custom barcodes only)
businessId        String?         // NULL for universal codes

// Audit
createdAt         DateTime        @default(now())
updatedAt         DateTime        @updatedAt
```

**Constraints:**
- ✅ One barcode can belong to EITHER product OR variant (not both)
- ✅ At least one of `productId` or `variantId` must be set
- ✅ Unique constraint: `[code, type, variantId]` (prevent duplicates on same variant)
- ✅ Universal barcodes (UPC/EAN) must have `businessId: null`
- ✅ Custom barcodes must have `businessId` set

**Indexes (for performance):**
```prisma
@@index([code, type])                    // Fast barcode lookup
@@index([code, type, businessId])        // Business-scoped search
@@index([productId])                     // Product's barcodes
@@index([variantId])                     // Variant's barcodes
@@index([isUniversal, type])             // Universal code search
```

### New Enum: `BarcodeType`

**Standard Types:**
- `UPC_A` - 12-digit Universal Product Code (North America)
- `UPC_E` - 6-digit UPC (compressed format)
- `EAN_13` - 13-digit European Article Number
- `EAN_8` - 8-digit EAN (compressed format)
- `CODE128` - Variable length, high density (warehouse)
- `CODE39` - Alphanumeric (legacy systems)
- `ITF` - Interleaved 2 of 5 (shipping cartons)
- `CODABAR` - Libraries, blood banks, airbills
- `QR_CODE` - 2D matrix barcode (mobile apps)
- `DATA_MATRIX` - 2D barcode (small items)
- `PDF417` - 2D stacked barcode (IDs, tickets)
- `CUSTOM` - Business-specific format
- `SKU_BARCODE` - Barcode representation of internal SKU

---

## 🔧 Functional Requirements

### FR-1: Multiple Barcodes per Product

**Requirement:** Each product/variant must support unlimited barcodes of different types.

**Acceptance Criteria:**
- ✅ Product can have multiple barcodes (UPC + warehouse code + QR)
- ✅ Variant can override product barcodes or inherit them
- ✅ Each barcode has proper type classification
- ✅ One barcode designated as "primary"
- ✅ UI displays all barcodes with type badges

**Example:**
```javascript
Product: "Cordless Drill"
  ├─ Barcode 1: "088381652001" (UPC_A, Primary, Universal)
  ├─ Barcode 2: "HW-DRL-001" (CODE128, Warehouse)
  └─ Barcode 3: "https://..." (QR_CODE, Mobile App)

Variant: "Drill + Battery Combo"
  └─ Barcode: "088381652018" (UPC_A, Different from product)
```

### FR-2: Universal Barcode Lookup

**Requirement:** Users can search for products by UPC across ALL businesses in the system.

**Acceptance Criteria:**
- ✅ New endpoint: `GET /api/products/by-upc/{upc}`
- ✅ Returns list of all businesses selling that UPC
- ✅ Shows each business's price, stock, SKU
- ✅ Can filter by business type (hardware, grocery, etc.)

**Use Case:**
```
Scan UPC: 088381652001
Results:
  - Ace Hardware Downtown: $89.99, SKU: ACE-DRL-001, Stock: 25
  - Home Depot North: $84.99, SKU: HD-TOOL-42, Stock: 15
  - Smith Tools: $92.50, SKU: ST-PWR-001, Stock: 8
```

### FR-3: Barcode Type Classification

**Requirement:** System must identify and validate barcode types.

**Acceptance Criteria:**
- ✅ Auto-detect UPC-A (12 digits), EAN-13 (13 digits), etc.
- ✅ Validate UPC/EAN check digits (optional, warn on failure)
- ✅ Allow custom barcodes without validation
- ✅ Display barcode type badge in UI
- ✅ Filter/search by barcode type

**Validation Rules:**
- UPC-A: Exactly 12 digits, valid check digit
- EAN-13: Exactly 13 digits, valid check digit
- QR_CODE: Any valid URL or text
- CUSTOM: Any alphanumeric string

### FR-4: Primary Barcode Selection

**Requirement:** When multiple barcodes exist, system uses consistent priority for scanning.

**Acceptance Criteria:**
- ✅ Priority 1: Universal UPC (if exists)
- ✅ Priority 2: First barcode marked as `isPrimary: true`
- ✅ Priority 3: First barcode in list
- ✅ User can manually set primary barcode
- ✅ Barcode scanner uses primary for display/receipts

### FR-5: Historical Barcode Tracking

**Requirement:** System must preserve which barcode was used for each transaction.

**Acceptance Criteria:**
- ✅ Order items store scanned barcode code and type
- ✅ Stock movement logs include barcode scanned
- ✅ Reports can filter by barcode type used
- ✅ Audit trail shows barcode changes over time

**Database Changes:**
```prisma
BusinessOrderItems {
  scannedBarcodeCode   String?
  scannedBarcodeType   BarcodeType?
}

BusinessStockMovements {
  scannedBarcodeCode   String?
  scannedBarcodeType   BarcodeType?
}
```

### FR-6: SKU Independence

**Requirement:** SKU must remain distinct from barcode, business-scoped identifier.

**Acceptance Criteria:**
- ✅ SKU uniqueness: `@@unique([businessId, sku])` (unchanged)
- ✅ Variant SKU: Unique within business (current behavior maintained)
- ✅ SKU never used as barcode value
- ✅ SKU search separate from barcode search
- ✅ UI clearly distinguishes SKU from barcode fields

---

## 🎨 UI/UX Requirements

### UR-1: Barcode Manager Component

**Requirement:** Unified component for managing multiple barcodes.

**Features:**
- Add/Edit/Delete barcodes
- Drag-to-reorder (primary first)
- Barcode type dropdown with icons
- "Universal UPC/EAN" checkbox
- Label/description field
- Visual indicator for primary barcode
- Validation feedback

**Mock:**
```
┌─ Barcodes ─────────────────────────────────────────┐
│ [⭐ Primary] 088381652001 [UPC_A] 🌍 Universal     │
│   Label: Retail UPC                                │
│   [Edit] [Remove]                                  │
│                                                     │
│ HW-DRL-001 [CODE128] 🏢 Business-Specific          │
│   Label: Warehouse Location                        │
│   [Edit] [Remove] [Set as Primary]                 │
│                                                     │
│ [+ Add Barcode]                                    │
└─────────────────────────────────────────────────────┘
```

### UR-2: Barcode Scanner Enhancement

**Requirement:** Scanner must display matched barcode type and metadata.

**Features:**
- Show which barcode matched (UPC vs warehouse code)
- Display barcode type badge
- Indicate if match was universal or business-specific
- Show product name, SKU, and price
- Visual feedback for barcode type (color coding)

**Display Example:**
```
✅ Product Found!

Cordless Drill - 18V
SKU: DR-18V-001-STD
Price: $89.99

Matched: 088381652001 [UPC_A] 🌍 Universal
```

### UR-3: Inventory Form Updates

**Requirement:** Product creation/edit forms must support multiple barcodes.

**Changes:**
- Replace single "Barcode" input with "Barcodes" section
- Integrate BarcodeManager component
- Validate barcode format on blur
- Suggest barcode type based on format
- Warn if UPC already exists in system

---

## 🔌 API Requirements

### API-1: Enhanced Barcode Lookup

**Endpoint:** `GET /api/products/by-barcode/{businessId}/{barcode}`

**New Features:**
- Query param: `?type=UPC_A` (optional, for precision)
- Query param: `?universal=true` (search across businesses)
- Response includes matched barcode metadata

**Response:**
```json
{
  "success": true,
  "data": {
    "product": { /* UniversalProduct */ },
    "variantId": "var-123",
    "matchedBarcode": {
      "code": "088381652001",
      "type": "UPC_A",
      "isPrimary": true,
      "isUniversal": true,
      "label": "Retail UPC"
    },
    "matchType": "variant_barcode"
  }
}
```

### API-2: Universal UPC Lookup

**Endpoint:** `GET /api/products/by-upc/{upc}`

**Purpose:** Find all businesses selling a specific UPC.

**Response:**
```json
{
  "success": true,
  "data": {
    "upc": "088381652001",
    "type": "UPC_A",
    "businesses": [
      {
        "businessId": "ace-hardware-001",
        "businessName": "Ace Hardware Downtown",
        "product": { /* full product details */ },
        "variantId": "var-456",
        "price": 89.99,
        "stock": 25,
        "sku": "ACE-DRL-001"
      },
      /* ... more businesses */
    ]
  }
}
```

### API-3: Barcode CRUD Endpoints

**New Endpoints:**
```
POST   /api/universal/products/{productId}/barcodes
PUT    /api/universal/products/{productId}/barcodes/{barcodeId}
DELETE /api/universal/products/{productId}/barcodes/{barcodeId}
GET    /api/universal/products/{productId}/barcodes

POST   /api/universal/variants/{variantId}/barcodes
PUT    /api/universal/variants/{variantId}/barcodes/{barcodeId}
DELETE /api/universal/variants/{variantId}/barcodes/{barcodeId}
GET    /api/universal/variants/{variantId}/barcodes
```

**Bulk Operations:**
```
POST   /api/universal/products/barcodes/bulk-assign
       Body: [{ productId, barcodes: [...] }]

POST   /api/universal/products/barcodes/import-csv
       Body: FormData with CSV file
```

---

## 📦 Data Migration Requirements

### DM-1: Migration Strategy

**Requirement:** NO backward compatibility - Clean migration with backup/restore.

**Process:**
1. **Pre-Migration:**
   - Full database backup
   - Export all barcode data to CSV
   - Generate migration report

2. **Migration:**
   - Run Prisma migration to create new table
   - Copy all existing `barcode` values to `ProductBarcodes`
   - Set `type: "CUSTOM"` for unknown formats
   - Auto-detect UPC/EAN and update type
   - Set `isPrimary: true` for all migrated barcodes

3. **Post-Migration:**
   - Validate 100% of barcodes migrated
   - Remove old `barcode` columns (no transition period)
   - Update all API routes to use new table
   - Deploy all code changes simultaneously

**No Transition Period:**
- ❌ No maintaining old `barcode` field
- ❌ No fallback lookup logic
- ❌ No deprecation warnings
- ✅ Clean break: Old field removed immediately after migration

### DM-2: UPC Detection

**Requirement:** Automatically identify universal product codes.

**Detection Rules:**
```javascript
function detectBarcodeType(code) {
  if (/^\d{12}$/.test(code)) {
    if (validateUPCCheckDigit(code)) return 'UPC_A'
  }
  if (/^\d{13}$/.test(code)) {
    if (validateEANCheckDigit(code)) return 'EAN_13'
  }
  if (/^\d{8}$/.test(code)) {
    if (validateEANCheckDigit(code)) return 'EAN_8'
  }
  // ... other patterns
  return 'CUSTOM'
}
```

**Auto-flag Universal:**
- UPC-A, UPC-E → `isUniversal: true`, `businessId: null`
- EAN-13, EAN-8 → `isUniversal: true`, `businessId: null`
- All others → `isUniversal: false`, keep `businessId`

---

## 🧪 Testing Requirements

### Test Coverage Goals

- **Unit Tests:** 90%+ coverage for barcode logic
- **Integration Tests:** All API endpoints
- **E2E Tests:** Critical user flows (scan, create, lookup)

### Critical Test Scenarios

**T-1: Multiple Barcodes**
```
GIVEN a product with 3 barcodes (UPC, warehouse, QR)
WHEN user scans any of the 3 codes
THEN correct product is found
AND matched barcode metadata is shown
```

**T-2: Universal UPC Lookup**
```
GIVEN same UPC exists in 3 businesses
WHEN user searches by UPC
THEN all 3 businesses are returned
AND each shows correct price/stock/SKU
```

**T-3: Barcode Type Validation**
```
GIVEN user enters "088381652001"
WHEN barcode is saved
THEN system detects type as "UPC_A"
AND validates check digit
AND sets isUniversal: true
AND sets businessId: null
```

**T-4: Historical Tracking**
```
GIVEN product scanned with UPC during order
WHEN order is created
THEN order item stores: scannedBarcodeCode: "088381652001"
AND scannedBarcodeType: "UPC_A"
```

**T-5: Primary Barcode Priority**
```
GIVEN product with 3 barcodes: UPC (primary), CODE128, QR
WHEN product displayed in POS
THEN UPC is shown as primary
AND receipt prints UPC
```

---

## 🚀 Performance Requirements

### Response Time Targets

| Operation | Current | Target | Max |
|-----------|---------|--------|-----|
| Barcode lookup (single business) | 95ms | < 100ms | 150ms |
| UPC lookup (all businesses) | N/A | < 200ms | 300ms |
| Product page load | 180ms | < 180ms | 250ms |
| Barcode CRUD operations | N/A | < 150ms | 200ms |

### Scalability Requirements

- Support 100,000+ barcodes in system
- Support 1,000+ concurrent barcode lookups
- Bulk barcode import: 10,000 records in < 60 seconds
- Database query optimization with proper indexes

---

## 📝 Documentation Requirements

### Developer Documentation

**API Documentation:**
- OpenAPI/Swagger spec for all new endpoints
- Request/response examples
- Error code reference
- Migration guide

**Code Documentation:**
- Inline comments explaining barcode logic
- TypeScript interfaces for all barcode types
- Database schema documentation
- Architecture decision records (ADR)

### User Documentation

**User Guides:**
- "Understanding SKU vs Barcode"
- "How to Add UPC Codes"
- "Managing Multiple Barcodes"
- "Barcode Type Reference"

**Admin Guides:**
- Barcode migration process
- Bulk barcode assignment
- Troubleshooting barcode issues
- Barcode coverage reporting

---

## ✅ Acceptance Criteria

### Phase 1: Database & Migration
- [ ] New `ProductBarcodes` table created
- [ ] `BarcodeType` enum with all 13 types
- [ ] All existing barcodes migrated (100% success)
- [ ] UPC/EAN barcodes auto-detected and flagged
- [ ] Old `barcode` columns removed
- [ ] No data loss confirmed

### Phase 2: API Implementation
- [ ] Enhanced barcode lookup functional
- [ ] Universal UPC lookup working
- [ ] Barcode CRUD endpoints operational
- [ ] All endpoints return proper barcode metadata
- [ ] Historical tracking fields populated

### Phase 3: UI Updates
- [ ] BarcodeManager component implemented
- [ ] Barcode scanner shows type/metadata
- [ ] Inventory form supports multiple barcodes
- [ ] All POS pages updated
- [ ] Product cards display barcode types

### Phase 4: Business Logic
- [ ] Printing uses correct barcode type
- [ ] Orders/laybys track scanned barcode
- [ ] Stock movements log barcode used
- [ ] Search works across all barcodes

### Phase 5: Testing & Docs
- [ ] 90%+ test coverage achieved
- [ ] All critical scenarios passing
- [ ] API docs published
- [ ] User guides created
- [ ] Admin guides available

---

## 🎯 Success Metrics

### Quantitative Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Products with barcodes | 45% | 95% | After seed script updates |
| UPC coverage | 0% | 80% | Products with valid UPC |
| Barcode lookup errors | 5% | < 0.5% | Error rate in logs |
| Average barcodes per product | 1 | 2.5 | Mean barcode count |
| Scanner scan time | 1.2s | < 1.0s | Time to product lookup |

### Qualitative Metrics

- ✅ Users understand SKU vs barcode distinction
- ✅ No confusion about barcode types in UI
- ✅ Scanning workflow feels natural
- ✅ Multi-barcode management is intuitive
- ✅ Admin confidence in barcode data quality

---

## 🔄 Future Enhancements (Out of Scope)

These are NOT required for initial implementation but documented for future reference:

1. **UPC Database Integration**
   - Auto-populate product info from UPCitemdb.com
   - Price comparison across online retailers
   - Product image lookup by UPC

2. **Advanced Barcode Features**
   - Barcode generation/printing
   - Custom barcode formats per business
   - Barcode expiration dates
   - Batch/lot tracking via barcodes

3. **Analytics & Reporting**
   - Most scanned barcodes
   - Barcode type usage statistics
   - UPC coverage by category
   - Barcode quality scoring

4. **Mobile App Integration**
   - Native barcode scanner
   - QR code generation for products
   - Customer-facing barcode lookup

---

## 📞 Stakeholder Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Project Owner | User | 2025-11-15 | ✅ APPROVED |
| Technical Lead | Claude | 2025-11-15 | ✅ READY |
| Database Admin | TBD | Pending | - |
| QA Lead | TBD | Pending | - |

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Next Review:** Upon Phase 1 completion
