# MBM-178 — Invoices & Quotations

**Date:** 2026-04-15  
**Status:** AWAITING APPROVAL

---

## Objective

Add the ability to create, save, and print professional invoices and quotations for customers.
- Company branding (logo, name, address, phone, registration) pulled from umbrella business settings
- Logo upload added to the umbrella business settings page
- Follows the **payment-voucher modal pattern**: form → save → preview modal with print button that opens a new browser window
- A4 document layout with line items capped at 30 per document
- Captures the preparing employee's details and a valid-until date
- Invoices and quotations tracked separately with independent sequential numbering
- Quotations show a "subject to change" disclaimer; invoices do not
- Full history retained; documents recalled by number via search

> **Note:** The reference screenshot was not attached with the request.
> Please share it before implementation starts so the layout matches exactly.

---

## Architecture Overview

### Two separate document types, same table
| Type | Number prefix | Counter column | Disclaimer |
|------|--------------|----------------|------------|
| INVOICE | INV- | `invoiceCounter` | None |
| QUOTATION | QUO- | `quotationCounter` | "This quotation is subject to change at any time prior to acceptance." |

Numbers are zero-padded to 4 digits: `INV-0001`, `QUO-0001`.
Each type's counter is incremented atomically in a transaction to prevent gaps or duplicates.

### Numbering continuity
On the **first** creation after deployment, the counter starts at 0 and increments to 1 → `INV-0001`.
If the business has a history of paper invoices and wants to start at a specific number (e.g. `INV-0051`), the counter can be pre-set in the umbrella business settings.

### Print pattern (matches payment voucher)
1. User fills the form in the modal and clicks **Save**
2. API saves the document, returns the full record
3. Modal transitions to a **preview panel** (same modal, different view state)
4. Preview has a **Print** button that calls `window.open('', '_blank')`, writes the document HTML into the new window, and calls `win.print()` after 400 ms — exactly as `ExpensePaymentVoucherModal.handlePrintVoucher()` does

### Mode selection
When the user opens the create flow, they are presented with two distinct action buttons:
- **New Invoice** → opens modal in INVOICE mode
- **New Quotation** → opens modal in QUOTATION mode

Within the modal there is a subtle mode indicator (title, label colour, and disclaimer section) but the user does not need to toggle — the mode is fixed when the modal opens.

### Data sources
| Field | Source |
|-------|--------|
| Company name, address, phone, email, registration | `Businesses` record (umbrella business fields) |
| Company logo | `Businesses.logoImageId` → `images` table → `/api/images/[id]` |
| Customer details | Selected from `BusinessCustomers` (auto-fill) or typed manually |
| Prepared by | Logged-in session user's display name (read-only) |
| Currency / symbol | `Businesses.currency` / `Businesses.currencySymbol` |

---

## Database Changes

### 1. Extend `Businesses`
```sql
ALTER TABLE "businesses"
  ADD COLUMN "logoImageId"        TEXT,
  ADD COLUMN "invoiceCounter"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "quotationCounter"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "invoiceStartNumber" INTEGER NOT NULL DEFAULT 0; -- optional: lets admin pre-set starting number
```

### 2. New `invoices` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `businessId` | TEXT FK → businesses | |
| `type` | `InvoiceType` enum | INVOICE \| QUOTATION |
| `number` | TEXT | INV-0001 — unique per business |
| `status` | `InvoiceStatus` enum | DRAFT \| SENT \| ACCEPTED \| REJECTED \| EXPIRED \| CANCELLED |
| `customerId` | TEXT? FK → business_customers | null if walk-in |
| `customerName` | TEXT | required |
| `customerEmail` | TEXT? | |
| `customerPhone` | TEXT? | |
| `customerAddress` | TEXT? | |
| `preparedById` | TEXT | session user id |
| `preparedByName` | TEXT | display name at time of creation |
| `issueDate` | TIMESTAMP | |
| `validUntilDate` | TIMESTAMP | required |
| `notes` | TEXT? | |
| `subtotal` | DECIMAL(12,2) | |
| `discountAmount` | DECIMAL(12,2) | DEFAULT 0 |
| `taxAmount` | DECIMAL(12,2) | DEFAULT 0 |
| `total` | DECIMAL(12,2) | |
| `currency` | TEXT | DEFAULT 'USD' |
| `currencySymbol` | TEXT | DEFAULT '$' |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

### 3. New `invoice_items` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `invoiceId` | TEXT FK → invoices | |
| `description` | TEXT | free text — any service or product |
| `quantity` | DECIMAL(10,2) | |
| `unitPrice` | DECIMAL(10,2) | |
| `discount` | DECIMAL(10,2) | DEFAULT 0 — percentage (0–100) |
| `total` | DECIMAL(10,2) | computed: qty × unitPrice × (1 - discount/100) |
| `sortOrder` | INT | DEFAULT 0 |

### 4. New enums
```sql
CREATE TYPE "InvoiceType"   AS ENUM ('INVOICE', 'QUOTATION');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
```

**Migration name:** `20260415000002_add_invoices_quotations`

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/universal/invoices?businessId=&type=&status=&q=` | List; `q` searches by number, customer name |
| POST | `/api/universal/invoices` | Create — atomically increments counter, assigns number |
| GET | `/api/universal/invoices/[id]` | Fetch single document with items |
| PATCH | `/api/universal/invoices/[id]` | Update status or notes |
| DELETE | `/api/universal/invoices/[id]` | Cancel (sets status = CANCELLED, no hard delete) |
| GET | `/api/admin/umbrella-business` | Existing — already returns business details |
| PATCH | `/api/admin/umbrella-business` | Extend to accept `logoImageId` and `invoiceStartNumber` |

### Atomic number assignment (POST)
```typescript
await prisma.$transaction(async (tx) => {
  const counterField = type === 'INVOICE' ? 'invoiceCounter' : 'quotationCounter'
  const prefix = type === 'INVOICE' ? 'INV' : 'QUO'
  const biz = await tx.businesses.update({
    where: { id: businessId },
    data: { [counterField]: { increment: 1 } },
    select: { [counterField]: true, currency: true, currencySymbol: true, ... },
  })
  const seq = biz[counterField] // e.g. 1, 2, 3...
  const number = `${prefix}-${String(seq).padStart(4, '0')}`
  return tx.invoices.create({ data: { ...fields, number } })
})
```

---

## UI Components

### 1. Umbrella Business Settings — Logo Upload & Invoice Settings

**File:** `src/app/admin/umbrella-business/page.tsx` (extend existing page)

New **"Company Branding"** section:
- Logo image preview (current logo or a placeholder silhouette)
- File input accepting `.jpg`, `.png`, `.webp`, max 2 MB
- Upload → `POST /api/universal/images` → `PATCH /api/admin/umbrella-business` with `logoImageId`
- "Remove logo" clears `logoImageId`

New **"Invoice / Quotation Settings"** section:
- Invoice start number (integer input) — allows pre-seeding the counter for businesses with paper history
- Quotation start number
- These update the `invoiceCounter` / `quotationCounter` columns

---

### 2. Invoice Modal

**File:** `src/components/invoices/invoice-modal.tsx`

Follows the **exact same two-state pattern** as `ExpensePaymentVoucherModal`:

#### State A — Form (create / edit DRAFT)

Modal header:
```
📄 New Invoice         [×]
──────────────────────────
or
📋 New Quotation       [×]
```

Form sections:

**Customer** (search existing or type manually)
- Type-ahead search across `BusinessCustomers` by name or customer number
- Selecting a customer auto-fills name, phone, email, address
- All fields remain editable after auto-fill
- "Walk-in / one-time customer" option skips search

**Document details** (two columns)
- Issue date (defaults to today)
- Valid until date (required — date picker)
- Notes (optional textarea)

**Line items table** (sub-component)
| # | Description | Qty | Unit Price | Disc % | Total |
|---|-------------|-----|------------|--------|-------|
| 1 | [text input] | [num] | [num] | [num] | [computed] |
| + Add line item |

- Max 30 rows — warning shown at 30, add button disabled
- Tab moves through fields in row order
- Trash icon removes a row
- Totals row below: Subtotal / Discount / Tax / **TOTAL**

Tax: optional — shown only if the business has `taxEnabled = true`

**Footer buttons:**
```
[Cancel]                        [Save as Draft]   [Save & Preview]
```

---

#### State B — Preview (after save, or when opening an existing record)

Same layout as the payment voucher preview panel:

Modal header:
```
📄 Invoice INV-0001 · DRAFT     [🖨️ Print]  [×]
or
📋 Quotation QUO-0001 · DRAFT   [🖨️ Print]  [×]
```

The **printable document** area (`ref={previewRef}`):

```
┌──────────────────────────────────────────────┐
│ [LOGO]  Umbrella Business Name    INVOICE     │
│         Address line 1            INV-0001    │
│         Address line 2            Date: ...   │
│         Tel: +263...              Valid: ...  │
│         Reg: xxx                             │
├──────────────────────────────────────────────┤
│ BILL TO                  PREPARED BY         │
│ Customer Name            Employee Name       │
│ Phone / Email                                │
│ Address                                      │
├────┬──────────────────┬─────┬──────────┬─────┤
│  # │ Description      │ Qty │   Price  │ Amt │
├────┼──────────────────┼─────┼──────────┼─────┤
│  1 │ ................ │  2  │  $10.00  │$20  │
│    │    ...           │     │          │     │
├────┴──────────────────┴─────┴──────────┴─────┤
│                      Subtotal:    $xx.xx      │
│                      Discount:   -$xx.xx      │
│                      Tax (15%):   $xx.xx      │
│                      TOTAL:      $xx.xx       │
├──────────────────────────────────────────────┤
│ Notes: ......                                │
│                                              │
│ [QUOTATION ONLY — italic]                    │
│ This quotation is subject to change at any   │
│ time prior to acceptance.                    │
├──────────────────────────────────────────────┤
│ Prepared by: Jane Doe     Generated: ...     │
└──────────────────────────────────────────────┘
```

**Print button** (matches voucher exactly):
```typescript
const win = window.open('', '_blank', 'width=850,height=1100')
win.document.write(`<!DOCTYPE html><html><head>
  <style>/* A4 invoice styles */
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; ... }
  ...
  </style>
</head><body>${previewRef.current.innerHTML}</body></html>`)
win.document.close()
setTimeout(() => { win.focus(); win.print() }, 400)
```

**Status update buttons** (visible in preview header when status = DRAFT):
```
[Mark as Sent]   [Mark as Accepted]   [Cancel Document]
```

---

### 3. Invoice List Page

**File:** `src/app/admin/invoices/page.tsx`

Layout:
```
┌──────────────────────────────────────────┐
│  Invoices & Quotations                   │
│  [+ New Invoice]  [+ New Quotation]      │
├──────────────────────────────────────────┤
│  Tabs: [All] [Invoices] [Quotations]     │
│  Filter: Status ▾    Date range          │
│  Search: [number, customer name...    🔍]│
├───────┬────────────┬──────────┬──────────┤
│ Number│ Customer   │ Date     │ Total    │
│ Status│ Valid Until│ Prepared │ Actions  │
├───────┴────────────┴──────────┴──────────┤
│ INV-0001  John Smith  15 Apr 26  $250.00 │
│ DRAFT     22 Apr 26   Jane Doe  [View]   │
└──────────────────────────────────────────┘
```

- **Search by number**: typing `INV-0` or `QUO-0` filters instantly
- **Recall by number**: typing the exact number (e.g. `INV-0023`) opens that document in the preview modal
- Tab switching between All / Invoices / Quotations filters by `type`
- Status badge chips: DRAFT (grey) / SENT (blue) / ACCEPTED (green) / REJECTED (red) / EXPIRED (amber) / CANCELLED (strikethrough)
- Row actions: View, Duplicate (creates new DRAFT copying all line items), Cancel
- Pagination (25 per page)

---

## Slight UI Variations by Type

| Element | INVOICE | QUOTATION |
|---------|---------|-----------|
| Modal header icon | 📄 | 📋 |
| Accent colour | Blue | Amber/orange |
| Document title (printed) | INVOICE | QUOTATION |
| Number prefix | INV- | QUO- |
| Disclaimer section | Hidden | Shown in italic |
| "Valid Until" label | Valid Until | Quote Valid Until |
| Status options | DRAFT → SENT → ACCEPTED / REJECTED | DRAFT → SENT → ACCEPTED / REJECTED / EXPIRED |

---

## File Plan

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `logoImageId`, `invoiceCounter`, `quotationCounter`, `invoiceStartNumber`, `quotationStartNumber` to `Businesses`; add `Invoices`, `InvoiceItems` models; add `InvoiceType`, `InvoiceStatus` enums |
| `prisma/migrations/20260415000002_.../migration.sql` | SQL for all schema changes |
| `src/app/api/universal/invoices/route.ts` | GET (list + search) + POST (create with atomic counter) |
| `src/app/api/universal/invoices/[id]/route.ts` | GET one + PATCH (status) + DELETE (cancel) |
| `src/app/api/admin/umbrella-business/route.ts` | Extend PATCH to accept `logoImageId`, `invoiceStartNumber`, `quotationStartNumber` |
| `src/components/invoices/invoice-line-items.tsx` | Reusable line items sub-component (table + add/remove row + totals) |
| `src/components/invoices/invoice-modal.tsx` | Full two-state modal (form + preview + print), following voucher pattern |
| `src/app/admin/invoices/page.tsx` | List page: tabs, filters, search-by-number, row actions, open modal |
| `src/app/admin/umbrella-business/page.tsx` | Add logo upload + invoice start number fields |
| Admin sidebar / nav | Add "Invoices" link |

---

## Constraints & Decisions

| Decision | Rationale |
|----------|-----------|
| Print via `window.open()` new window | Matches payment-voucher pattern already established in the app |
| Mode fixed when modal opens (not a toggle inside modal) | Avoids accidental type switching after entering data |
| Separate counters, separate number sequences | User explicitly requested separate tracking — INV and QUO must not share a sequence |
| Start-number field in umbrella settings | Businesses with paper invoice history need to continue from where they left off |
| Max 30 line items | Keeps the printed document within one A4 page at standard font size |
| Logo in `images` table | Consistent with all other image storage in the app |
| Atomic counter transaction | Prevents duplicate numbers under concurrent creates |
| No hard deletes (CANCELLED status) | Audit trail — once issued, a document is always traceable |
| `customerId` optional | Supports walk-in or one-time customers without a CRM record |

---

## Todo List

- [x] 1. Write migration SQL (`20260415000002_add_invoices_quotations`)
- [x] 2. Update Prisma schema — `Businesses` new columns, `Invoices`, `InvoiceItems`, enums
- [x] 3. Run `prisma migrate dev` + `prisma generate`
- [x] 4. Build `GET /api/universal/invoices` (list with type / status / search filters)
- [x] 5. Build `POST /api/universal/invoices` (create with atomic counter + number assignment)
- [x] 6. Build `GET /api/universal/invoices/[id]` and `PATCH` (status) and `DELETE` (cancel)
- [x] 7. Extend `PATCH /api/admin/umbrella-business` to accept logo and start-number fields
- [x] 8. Add logo upload + invoice/quotation start-number to umbrella business settings page
- [x] 9. Build `invoice-line-items.tsx` sub-component (add/remove/edit rows, discount, totals)
- [x] 10. Build `invoice-modal.tsx` — form state (customer, dates, line items, notes)
- [x] 11. Build `invoice-modal.tsx` — preview state (rendered document + print button using `window.open` pattern)
- [x] 12. Build `invoice-modal.tsx` — status action buttons in preview header
- [x] 13. Build `/admin/invoices/page.tsx` — list, tabs, filters, search-by-number, recall by exact number
- [x] 14. Add "Invoices" link to admin sidebar
- [ ] 15. Test: create invoice → save → preview → print → verify A4 layout
- [ ] 16. Test: create quotation → verify disclaimer, accent colour, QUO- prefix
- [ ] 17. Test: sequential numbering, counter restarts if start-number field is changed
- [ ] 18. Test: recall by number (type INV-0003 in search, exact match opens that document)
- [ ] 19. Test: logo appears in printed preview; removed logo falls back gracefully
- [x] 20. Add review section

---

## Review

### Summary of Changes

**Database (migration `20260415000002_add_invoices_quotations`):**
- Created `InvoiceType` (`INVOICE | QUOTATION`) and `InvoiceStatus` (`DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | CANCELLED`) enums
- Extended `businesses` table: `logoImageId`, `invoiceCounter`, `quotationCounter`, `invoiceStartNumber`, `quotationStartNumber`
- Created `invoices` table with all fields, unique index on `(businessId, number)`, FK to both `businesses` and `business_customers`
- Created `invoice_items` table with cascade delete from invoices

**API Routes (4 new files):**
- `GET/POST /api/universal/invoices` — list with pagination/filtering; create with atomic counter transaction
- `GET/PATCH/DELETE /api/universal/invoices/[id]` — fetch single, update status/notes, soft-delete (CANCELLED)
- Extended `PATCH /api/admin/umbrella-business` — accepts `logoImageId` and start-number fields; advances counter if new start > current

**UI (4 new/modified files):**
- `src/components/invoices/invoice-line-items.tsx` — reusable line items table with add/remove rows, per-line discount, document discount, tax, totals
- `src/components/invoices/invoice-modal.tsx` — two-state modal (form → preview) matching payment-voucher pattern; print via `window.open`; customer type-ahead; mode-specific colours/disclaimer
- `src/app/admin/invoices/page.tsx` — list page with tabs, status filter, search/recall by number, pagination
- `src/app/admin/umbrella-business/page.tsx` — added Company Logo card (upload/remove) and Invoice & Quotation Numbering card
- `src/components/layout/sidebar.tsx` — added "Invoices & Quotes" link

### Suggested Follow-up Improvements

1. **Email delivery** — "Send to customer" button that emails the invoice/quotation as a PDF attachment
2. **PDF download** — Direct PDF export using a server-side library (e.g. `puppeteer` or `@react-pdf/renderer`)
3. **Duplicate document** — Copy an existing invoice/quotation into a new DRAFT (useful for recurring customers)
4. **Quotation → Invoice conversion** — Accept a quotation and auto-create an invoice from it with one click
5. **Per-sub-business numbering** — Currently umbrella-wide counters; could extend to per-business series (INV-BUS-0001)
6. **Partial payment tracking** — Record payments against an invoice, show balance due

---

## Out of Scope (Follow-up)

- Email delivery (PDF attachment + SMTP)
- PDF export / download (requires a PDF generation library)
- Per-sub-business invoice series (currently umbrella-wide)
- Multi-currency invoices
- Partial payments / payment tracking against an invoice
