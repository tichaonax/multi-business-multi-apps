# Vehicle Renewal Receipt — Project Plan

## Context: Source documents

### Document A — Standard renewal receipt (3 licences in one transaction)
| Section | Data captured |
|---------|--------------|
| **Vehicle Particulars** | Registration no., Make, Model, **Tax class**, **Vehicle usage**, Licence expiry |
| **Insurance** | Insurance company, Policy number, Insurance expiry |
| **Payment** | Receipt no., Date paid, Paid by, Arrears, Penalties, Admin fee, Transaction fee, Surcharge, Deposit, **Total** |
| **Radio/TV Licence** | Radio licence no., Radio expiry, Radio usage |

### Document B — Exemption Certificate (UDC AFZ4916)
Two pages issued together when a vehicle qualifies for exemption:

**Page 1 — ZBC Radio/TV Licence Exemption Certificate**
| Field | Example value |
|-------|--------------|
| Exemption type | ADD RADIO/TV LICENSE EXEMPTION |
| Start date | 4 May 2026 |
| End date | 31 August 2026 |
| Exemption reason | NO RADIO/TV FITTED |
| Requested by name | T HWANDAZA |
| Requested by contact | 0713185245 |
| Data capturing official | Nasser Kadiki |
| Login user ID | zwol8wwc |
| Issue office | ZAS HAMRE SHOWGROUNDS |
| Issue date | 04/05/2026 |

**Page 2 — Receipt and Exempted Vehicle Licence**
| Field | Example value |
|-------|--------------|
| Tax class | HEAVY VEHICLE (4601-9000KG) |
| Vehicle usage | NO USE PUBLIC ROAD |
| Insurance company | NOT APPLICABLE |
| Insurance status | EXEMPT |
| Arrears | USD0 |
| Penalties | USD0 |
| Admin fee | USD0 |
| Transaction fee | USD18 |
| **Debt management amount** | USD0 *(replaces "Surcharge" on exempt receipts)* |
| Deposit | USD0 |
| Total | USD18 |
| Receipt number | R026011794 |

---

## Data Mapping

### Permanent vehicle fields (captured once at registration)
| Field | Maps to | Status |
|-------|---------|--------|
| Registration number | `Vehicles.licensePlate` | ✅ exists |
| Make | `Vehicles.make` | ✅ exists |
| Model | `Vehicles.model` | ✅ exists |
| **Tax class** | `Vehicles.taxClass` | ❌ ADD |
| **Vehicle usage** | `Vehicles.vehicleUsage` | ❌ ADD |
| **Is exempt vehicle** | `Vehicles.isExempt` | ❌ ADD — flag for vehicles that habitually qualify for exemption |

> `vehicleUsage` options include: PRIVATE, COMMERCIAL, PUBLIC SERVICE, **NO USE PUBLIC ROAD** (for exempt vehicles)

### Renewal event fields (new `VehicleRenewalReceipts` table — one per renewal)
| Field | Column | Notes |
|-------|--------|-------|
| Receipt number | `receiptNumber` | e.g. R025394267 |
| Transaction type | `transactionType` | "VEHICLE LICENSING" |
| Date paid | `datePaid` | 25 MARCH 2026 |
| Payment received by | `paymentReceivedBy` | RODWELL MAZWIDZO |
| Office of issue | `officeOfIssue` | NICOZ DIAMOND - SAMORA MACHEL HARARE |
| Arrears | `arrears` | ZiG3920 |
| Penalties | `penalties` | ZiG3920 |
| Administration fee | `administrationFee` | ZiG280 |
| Transaction fee | `transactionFee` | ZiG1120 |
| Surcharge | `surcharge` | ZiG0 — used on standard receipt |
| **Debt management amount** | `debtManagementAmount` | USD0 — used on exempt receipt (replaces surcharge) |
| Deposit | `deposit` | ZiG0 |
| Total paid | `totalPaid` | ZiG9240 |
| Currency | `currency` | default "ZiG" |
| **Is exempt renewal** | `isExempt` | Boolean — true when vehicle is renewed under exemption |
| Scanned receipt doc | `documentUrl` / `documentName` | PDF/JPG upload |

### Per-licence fields added to `VehicleLicenses`
| Field | Column | Applicable types |
|-------|--------|-----------------|
| Link to receipt | `renewalReceiptId` | All types in a renewal |
| Licence usage | `usage` | RADIO ("PRIVATE VEHICLE") |
| **Late fee** | `lateFee` | All (already in form/route, missing from schema) |
| **Is exempt** | `isExempt` | Boolean — true when this specific licence is exempt (e.g. INSURANCE = EXEMPT) |

> REGISTRATION licence stores its `licenseNumber` (=registration no.), `expiryDate`, `issuingAuthority`.  
> RADIO licence stores radio `licenseNumber` (ZBC265634009), `expiryDate`, `usage`.  
> INSURANCE licence: when exempt, `licenseNumber = 'EXEMPT'`, `issuingAuthority = 'NOT APPLICABLE'`, `isExempt = true`.

### Exemption certificate fields (new `VehicleExemptions` table — one per ZBC/other exemption cert)
| Field | Column | Notes |
|-------|--------|-------|
| Vehicle | `vehicleId` | FK to `vehicles` |
| Exemption type | `exemptionType` | e.g. RADIO_TV_LICENCE |
| Start date | `startDate` | 4 May 2026 |
| End date | `endDate` | 31 August 2026 |
| Exemption reason | `exemptionReason` | e.g. NO RADIO/TV FITTED |
| Reason description | `exemptionReasonDescription` | Free text |
| Requested by name | `requestedByName` | T HWANDAZA |
| Requested by email | `requestedByEmail` | |
| Requested by contact | `requestedByContact` | 0713185245 |
| Official name | `dataCapturingOfficialName` | Nasser Kadiki |
| Login user ID | `loginUserId` | zwol8wwc |
| Issue office | `issueOffice` | ZAS HAMRE SHOWGROUNDS |
| Issue date | `issueDate` | 04/05/2026 |
| Scanned cert doc | `documentUrl` / `documentName` | PDF/JPG upload |

---

## Schema Changes

### 1. `Vehicles` — 3 new nullable columns
```sql
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "taxClass" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "vehicleUsage" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "isExempt" BOOLEAN NOT NULL DEFAULT false;
```

### 2. New `vehicle_renewal_receipts` table
```sql
CREATE TABLE "vehicle_renewal_receipts" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "vehicleId"             TEXT NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
  "receiptNumber"         TEXT,
  "transactionType"       TEXT,
  "datePaid"              TIMESTAMPTZ,
  "paymentReceivedBy"     TEXT,
  "officeOfIssue"         TEXT,
  "arrears"               DECIMAL(10,2),
  "penalties"             DECIMAL(10,2),
  "administrationFee"     DECIMAL(10,2),
  "transactionFee"        DECIMAL(10,2),
  "surcharge"             DECIMAL(10,2),
  "debtManagementAmount"  DECIMAL(10,2),
  "deposit"               DECIMAL(10,2),
  "totalPaid"             DECIMAL(10,2),
  "currency"              TEXT NOT NULL DEFAULT 'ZiG',
  "isExempt"              BOOLEAN NOT NULL DEFAULT false,
  "documentUrl"           TEXT,
  "documentName"          TEXT,
  "notes"                 TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "vehicle_renewal_receipts_vehicleId_idx" ON "vehicle_renewal_receipts"("vehicleId");
```

### 3. `vehicle_licenses` — 4 new nullable columns
```sql
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "renewalReceiptId" TEXT REFERENCES "vehicle_renewal_receipts"("id") ON DELETE SET NULL;
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "usage" TEXT;
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "lateFee" DECIMAL(10,2);
ALTER TABLE "vehicle_licenses" ADD COLUMN IF NOT EXISTS "isExempt" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "vehicle_licenses_renewalReceiptId_idx" ON "vehicle_licenses"("renewalReceiptId");
```

### 4. New `vehicle_exemptions` table (ZBC / other exemption certificates)
```sql
CREATE TABLE "vehicle_exemptions" (
  "id"                            TEXT NOT NULL PRIMARY KEY,
  "vehicleId"                     TEXT NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
  "exemptionType"                 TEXT NOT NULL,
  "startDate"                     TIMESTAMPTZ,
  "endDate"                       TIMESTAMPTZ,
  "exemptionReason"               TEXT,
  "exemptionReasonDescription"    TEXT,
  "requestedByName"               TEXT,
  "requestedByEmail"              TEXT,
  "requestedByContact"            TEXT,
  "dataCapturingOfficialName"     TEXT,
  "loginUserId"                   TEXT,
  "issueOffice"                   TEXT,
  "issueDate"                     TIMESTAMPTZ,
  "documentUrl"                   TEXT,
  "documentName"                  TEXT,
  "notes"                         TEXT,
  "createdAt"                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "vehicle_exemptions_vehicleId_idx" ON "vehicle_exemptions"("vehicleId");
```

---

## Migration Rules (CRITICAL)
- **Never** use `prisma db push` or `prisma migrate dev`
- Edit `prisma/schema.prisma` → write raw SQL `migration.sql` → run `npm run db:deploy` → `npx prisma generate`
- Migration dir: `prisma/migrations/20260504000001_vehicle_renewal_receipts/migration.sql`

---

## Todo List

- [x] 1. Edit `prisma/schema.prisma`
- [x] 2. Create & apply migration SQL
- [x] 3. Update `src/types/vehicle.ts`
- [x] 4. Create renewal receipt API routes
- [x] 5. Create exemption certificate API routes
- [x] 6. Update vehicle API (`/api/vehicles/route.ts`)
- [x] 7. Update `vehicle-form.tsx`
- [x] 8. Create `RenewalReceiptForm` modal
- [x] 9. Create `ExemptionForm` modal
- [x] 10. Update `vehicle-detail-modal.tsx`
- [x] 11. Update `license-form-modal.tsx`

---

## Review

### What was implemented

**Database (migration `20260504000001_vehicle_renewal_receipts`)**
- `vehicles` table: 3 new columns — `taxClass`, `vehicleUsage`, `isExempt`
- New `vehicle_renewal_receipts` table: full receipt header, payment breakdown (including `debtManagementAmount` for exempt receipts), `isExempt` flag, doc upload
- `vehicle_licenses` table: 4 new columns — `usage`, `lateFee` (was in UI but never persisted), `isExempt`, `renewalReceiptId` FK
- New `vehicle_exemptions` table: ZBC/other exemption certificates with all fields from the PDF — dates, reason, requesting official, data capturing official, issue office

**API routes (new)**
- `POST/GET /api/vehicles/renewal-receipts` — create receipt + linked licenses atomically; list by vehicleId
- `GET/DELETE /api/vehicles/renewal-receipts/[receiptId]` — single receipt with licenses
- `POST/GET /api/vehicles/exemptions` — record/list exemption certificates
- `DELETE /api/vehicles/exemptions/[exemptionId]` — remove exemption record

**Types (`src/types/vehicle.ts`)**
- `Vehicle`: added `taxClass`, `vehicleUsage`, `isExempt`, `renewalReceipts`, `exemptions`
- `VehicleLicense`: added `usage`, `isExempt`, `renewalReceiptId`
- New `VehicleRenewalReceipt` interface
- New `VehicleExemption` interface
- `CreateVehicleData`: added `taxClass`, `vehicleUsage`, `isExempt`

**UI components**
- `vehicle-form.tsx`: Tax Class dropdown, Vehicle Usage dropdown, Exempt checkbox
- `renewal-receipt-form.tsx` (new): 6-section modal — receipt header, payment breakdown (surcharge vs debt mgmt amount toggled by isExempt), 3 licence tabs (Registration / Radio / Insurance), document upload
- `exemption-form.tsx` (new): Exemption certificate form with all ZBC cert fields + document upload
- `vehicle-detail-modal.tsx`: 2 new sections — "Renewal Receipts" and "Exemptions" with lazy-load + action buttons
- `license-form-modal.tsx`: Usage field (Radio only), Exempt checkbox, `lateFee` now actually persisted

### Pending
- `npx prisma generate` — must be run after stopping the dev server (EPERM locks DLL while server runs)

### Suggested follow-up improvements
1. Add a "View receipt details" expand panel in the Renewal Receipts list
2. Add delete button for exemption records in the UI (API supports it already)
3. Show active exemption badge on the vehicle card when `vehicle.isExempt = true`
4. Sync `vehicle.isExempt` automatically when a ROAD_USE exemption is recorded
  - Issue office + issue date
  - Document upload (ZBC cert PDF/JPG)
  - On submit: POST to `/api/vehicles/exemptions`

- [ ] 10. Update `vehicle-detail-modal.tsx`
  - Add "Renewal Receipts" section — "Record Renewal" button opens `RenewalReceiptForm`
  - List receipts: receipt no., date paid, total, exempt flag badge
  - Add "Exemptions" section — "Add Exemption" button opens `ExemptionForm`
  - List exemptions: type, date range, reason, status (active / expired)

- [ ] 11. Update `license-form-modal.tsx`
  - Add `usage` field (shown only when `licenseType === 'RADIO'`)
  - Add `isExempt` checkbox
  - Ensure `lateFee` is now included in Prisma write (already in form, just not persisted)

---

## Impact Analysis
- Schema: all new nullable columns and two new tables — zero breaking changes to existing data
- `vehicle-form.tsx`: 3 new optional fields below existing fields
- `vehicle-detail-modal.tsx`: two new sections added at bottom — no existing UI disrupted
- `license-form-modal.tsx`: 1 conditional field + `isExempt` checkbox + lateFee now persisted
- New files: `renewal-receipt-form.tsx`, `exemption-form.tsx`, `api/vehicles/renewal-receipts/...`, `api/vehicles/exemptions/...`
- Existing `VehicleLicenses` records: unaffected (`renewalReceiptId` nullable, `isExempt` defaults FALSE)
- Existing `Vehicles` records: unaffected (`isExempt` defaults FALSE)

---

## Review
_(to be filled after implementation)_
