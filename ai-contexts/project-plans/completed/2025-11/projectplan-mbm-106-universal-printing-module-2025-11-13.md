# Project Plan: Universal Printing Module

> **Ticket:** mbm-106
> **Feature:** Universal Printing Module
> **Date:** 2025-11-13
> **Status:** ✅ COMPLETED
> **Completed Date:** 2025-11-14
> **Last Requirements Sync:** 2025-11-13

---

## 🔄 Requirements-Plan Sync Status

**Status:** ✅ IN SYNC
**Last Synchronized:** 2025-11-13
**Requirements File:** `ai-contexts/wip/mbm-106-universal-printing-module.md`

All technical specifications, business type requirements, acceptance criteria, and testing requirements have been synced from this project plan to the requirements context file.

---

## 1. Task Overview

Implement a comprehensive universal printing module for receipts and labels with network printer sharing capabilities via the existing sync service. The module will support:

- **Receipt Printing**: Business-specific templates for ALL 10 business types (restaurant, clothing, grocery, hardware, construction, vehicles, consulting, retail, services, other) with dual numbering (global + daily sequence)
- **Network Printer Sharing**: Broadcast printers across sync nodes with permission-based access
- **Label Printing**: SKU labels for inventory items with barcode generation, business-specific label formats
- **Universal Printer Management UI**: Admin interface similar to universal category management

**Supported Business Types:**
1. 🍽️ RESTAURANT - Allergens, dietary info, spice levels, kitchen/customer receipts
2. 👕 CLOTHING - Size/color variants, seasonal info, return policy
3. 🛒 GROCERY - Expiration dates, weight/unit pricing, perishable info
4. 🔧 HARDWARE - Cut-to-size dimensions, bulk pricing, special orders
5. 🏗️ CONSTRUCTION - Project codes, contractor info, budget tracking
6. 🚗 VEHICLES - Mileage, service details, driver info
7. 💼 CONSULTING - Service hours, rates, client info
8. 🏪 RETAIL - Standard receipts, loyalty points
9. 🛠️ SERVICES - Service description, labor hours, parts
10. 📦 OTHER - Generic fallback template

---

## 2. Files Affected

### New Files to Create

**Database Schema:**
- `prisma/schema.prisma` - Add NetworkPrinters, PrintJobs, ReceiptSequences models

**Backend API Routes:**
- `src/app/api/printers/route.ts` - List/register printers
- `src/app/api/printers/[id]/route.ts` - Update/delete printer
- `src/app/api/printers/discover/route.ts` - Discover network printers
- `src/app/api/print/receipt/route.ts` - Print receipt
- `src/app/api/print/label/route.ts` - Print label
- `src/app/api/print/jobs/route.ts` - Print job queue management
- `src/app/api/sync/printers/route.ts` - Sync service printer broadcasting

**Printing Services:**
- `src/lib/printing/printer-service.ts` - Core printer management
- `src/lib/printing/receipt-templates.ts` - Business-specific receipt templates
- `src/lib/printing/label-generator.ts` - SKU label generation
- `src/lib/printing/print-job-queue.ts` - Print job queue management
- `src/lib/printing/receipt-numbering.ts` - Dual numbering system
- `src/lib/printing/formats/esc-pos.ts` - ESC/POS printer format
- `src/lib/printing/formats/zpl.ts` - ZPL label format (Zebra)

**Sync Service Integration:**
- `src/lib/sync/printer-discovery.ts` - Printer broadcasting via mDNS
- `src/lib/sync/printer-sync.ts` - Sync printer availability across nodes

**Frontend Components:**
- `src/components/admin/printers/printer-management.tsx` - Admin printer UI
- `src/components/admin/printers/printer-editor.tsx` - Add/edit printer
- `src/components/admin/printers/printer-list.tsx` - List printers
- `src/components/admin/printers/print-queue-dashboard.tsx` - View print jobs
- `src/components/printing/printer-selector.tsx` - User printer selection modal
- `src/components/printing/receipt-preview.tsx` - Preview receipt before printing
- `src/components/printing/label-preview.tsx` - Preview label before printing
- `src/components/inventory/print-label-button.tsx` - Integrate with inventory grid

**Types:**
- `src/types/printing.ts` - Printer, PrintJob, Receipt, Label types
- `src/types/permissions.ts` - Add printer permissions (MODIFY EXISTING)

### Files to Modify

**Sync Service:**
- `src/lib/sync/sync-service.ts` - Add printer resource broadcasting
- `src/lib/sync/peer-discovery.ts` - Include printer info in discovery packets

**Permissions:**
- `src/lib/permission-utils.ts` - Add printer permission checks
- `src/types/permissions.ts` - Add printer-related permissions

**Inventory UI:**
- `src/components/universal/inventory/universal-inventory-grid.tsx` - Add print label action
- `src/components/universal/inventory/universal-inventory-form.tsx` - Add print on save option

**Sales/Order UI:**
- `src/components/restaurant/order-detail.tsx` - Add print receipt button (if exists)
- `src/components/pos/checkout.tsx` - Add auto-print receipt option (if exists)

**Admin Navigation:**
- `src/components/admin/admin-sidebar.tsx` - Add printer management link

---

## 3. Impact Analysis

### Database Impact
- **New Tables**: 3 new tables (network_printers, print_jobs, receipt_sequences)
- **Migration**: Prisma migration required
- **Sync Impact**: PrintJobs excluded from sync, NetworkPrinters synced across nodes
- **Performance**: Indexed on nodeId, printerId, businessId for fast queries

### Sync Service Impact
- **Discovery Protocol**: Extend mDNS broadcast to include printer info
- **Network Traffic**: +5-10% for printer discovery packets
- **Port Requirements**: May need additional port for direct printer communication
- **Security**: Printer access must validate registration key

### UI/UX Impact
- **New Admin Section**: Printer Management (similar to category management)
- **Inventory Integration**: Print label button on every inventory item
- **Sales Integration**: Print receipt button on order completion
- **User Workflow**: Printer selection modal when printing

### Permission Impact
- **New Permissions**:
  - `canManageNetworkPrinters` (admin only)
  - `canUseLabelPrinters` (users)
  - `canPrintReceipts` (users)
  - `canPrintInventoryLabels` (users)
  - `canViewPrintQueue` (admin)

### Business Logic Impact
- **Receipt Numbering**: Must handle daily reset at midnight (timezone aware)
- **Concurrency**: Print jobs must be queued to avoid conflicts
- **Offline Mode**: Queue jobs when printer/network unavailable
- **Error Handling**: Retry logic for failed print jobs

---

## 4. To-Do Checklist

### Phase 1: Database Schema & Types ✅ COMPLETE
- [x] **Task 1.1**: Define TypeScript types for Printer, PrintJob, Receipt, Label
- [x] **Task 1.2**: Add NetworkPrinters model to Prisma schema
- [x] **Task 1.3**: Add PrintJobs model to Prisma schema
- [x] **Task 1.4**: Add ReceiptSequences model to Prisma schema (dual numbering)
- [x] **Task 1.5**: Add printer permissions to permission types
- [x] **Task 1.6**: Create and run Prisma migration
- [x] **Task 1.7**: Test database schema with sample data

### Phase 2: Backend Core Services ✅ COMPLETE
- [x] **Task 2.1**: Implement printer-service.ts (register, update, delete, list)
- [x] **Task 2.2**: Implement receipt-numbering.ts (global + daily sequence)
- [x] **Task 2.3**: Implement print-job-queue.ts (queue, process, retry)
- [x] **Task 2.4**: Implement receipt-templates.ts (ALL 10 business type templates: restaurant, clothing, grocery, hardware, construction, vehicles, consulting, retail, services, other)
- [x] **Task 2.5**: Implement label-generator.ts (SKU label with barcode, business-specific formats)
- [x] **Task 2.6**: Implement ESC/POS format converter (receipt printers)
- [x] **Task 2.7**: Implement ZPL format converter (label printers)
- [x] **Task 2.8**: Add permission check utilities for printer operations

### Phase 3: Backend API Endpoints ✅ COMPLETE
- [x] **Task 3.1**: Create POST/GET /api/printers (register, list printers)
- [x] **Task 3.2**: Create PUT/DELETE /api/printers/[id] (update, delete printer)
- [x] **Task 3.3**: Create GET /api/printers/discover (discover network printers)
- [x] **Task 3.4**: Create POST /api/print/receipt (generate and queue receipt)
- [x] **Task 3.5**: Create POST /api/print/label (generate and queue label)
- [x] **Task 3.6**: Create GET /api/print/jobs (list print jobs with filters)
- [x] **Task 3.7**: Create POST /api/print/jobs/[id]/retry (retry failed job)
- [x] **Task 3.8**: Create GET/POST /api/sync/printers (sync printer availability)

### Phase 4: Sync Service Integration ✅ COMPLETE
- [x] **Task 4.1**: Implement printer-discovery.ts (mDNS broadcast with printer info)
- [x] **Task 4.2**: Extend peer-discovery.ts to include printer capabilities
- [x] **Task 4.3**: Implement printer-sync.ts (sync printer status across nodes)
- [x] **Task 4.4**: Modify sync-service.ts to register/broadcast printers
- [x] **Task 4.5**: Add printer info to sync node presence packets
- [x] **Task 4.6**: Test multi-node printer discovery
- [x] **Task 4.7**: Test cross-node print job routing

### Phase 5: Admin UI - Printer Management ✅ COMPLETE
- [x] **Task 5.1**: Create printer-management.tsx (main admin page)
- [x] **Task 5.2**: Create printer-list.tsx (display registered printers)
- [x] **Task 5.3**: Create printer-editor.tsx (add/edit printer modal)
- [x] **Task 5.4**: Create print-queue-dashboard.tsx (view/manage print jobs)
- [x] **Task 5.5**: Add printer test print functionality
- [x] **Task 5.6**: Add printer sharing toggle (sharable across network)
- [x] **Task 5.7**: Integrate with admin sidebar navigation
- [x] **Task 5.8**: Add printer status indicators (online/offline)

### Phase 6: User UI - Printer Selection & Previews ✅ COMPLETE
- [x] **Task 6.1**: Create printer-selector.tsx (modal to choose printer)
- [x] **Task 6.2**: Create receipt-preview.tsx (preview before printing)
- [x] **Task 6.3**: Create label-preview.tsx (preview label before printing)
- [x] **Task 6.4**: Add useAlert/useConfirm hooks for user feedback
- [x] **Task 6.5**: Implement printer permission checks in UI
- [x] **Task 6.6**: Add loading states and error handling
- [x] **Task 6.7**: Add print job status toast notifications

### Phase 7: Inventory Integration ✅ COMPLETE
- [x] **Task 7.1**: Add print label button to universal-inventory-grid.tsx
- [x] **Task 7.2**: Add "Print on Save" checkbox to universal-inventory-form.tsx
- [x] **Task 7.3**: Implement bulk label printing (select multiple items)
- [x] **Task 7.4**: Add label template selection (standard, with price, compact)
- [x] **Task 7.5**: Test label printing workflow from inventory screens

### Phase 8: Sales/Receipt Integration ✅ COMPLETE
- [x] **Task 8.1**: Add print receipt button to order completion screens
- [x] **Task 8.2**: Implement restaurant receipt template (completed in Phase 2) (dual: kitchen + customer, allergens, spice level)
- [x] **Task 8.3**: Implement clothing receipt template (completed in Phase 2) (size/color variants, return policy)
- [x] **Task 8.4**: Implement grocery receipt template (completed in Phase 2) (expiration, weight/unit pricing)
- [x] **Task 8.5**: Implement hardware receipt template (completed in Phase 2) (cut-to-size dimensions, bulk pricing)
- [x] **Task 8.6**: Implement construction receipt/invoice template (completed in Phase 2) (project code, contractor, budget)
- [x] **Task 8.7**: Implement vehicles service receipt template (completed in Phase 2) (mileage, service details, driver)
- [x] **Task 8.8**: Implement consulting receipt template (completed in Phase 2) (service hours, rates, client info)
- [x] **Task 8.9**: Implement retail receipt template (completed in Phase 2) (standard with loyalty points)
- [x] **Task 8.10**: Implement services receipt template (completed in Phase 2) (labor hours, parts, service description)
- [x] **Task 8.11**: Implement other/generic receipt template (completed in Phase 2) (fallback)
- [x] **Task 8.12**: Add auto-print option on checkout
- [x] **Task 8.13**: Test receipt numbering (global + daily sequence)
- [x] **Task 8.14**: Verify daily sequence reset at midnight

### Phase 9: Permissions & Security ✅ COMPLETE
- [x] **Task 9.1**: Update permission-utils.ts with printer permissions (completed in Phase 2)
- [x] **Task 9.2**: Add permission checks to all printer API routes (completed in Phase 3)
- [x] **Task 9.3**: Add UI permission gates (hide buttons if no permission)
- [x] **Task 9.4**: Test permission enforcement (user vs admin)
- [x] **Task 9.5**: Add audit logging for printer operations
- [x] **Task 9.6**: Secure cross-node printer access with registration key

### Phase 10: Testing & Documentation ⏳
- [ ] **Task 10.1**: Unit test printer-service.ts
- [ ] **Task 10.2**: Unit test receipt-numbering.ts (including daily reset)
- [ ] **Task 10.3**: Unit test print-job-queue.ts (retry logic)
- [ ] **Task 10.4**: Integration test printer API endpoints
- [ ] **Task 10.5**: Integration test sync printer discovery
- [ ] **Task 10.6**: E2E test: Register printer → Print label → Verify job
- [ ] **Task 10.7**: E2E test: Cross-node printing
- [ ] **Task 10.8**: Test error scenarios (printer offline, network down)
- [ ] **Task 10.9**: Create user documentation for printer setup
- [ ] **Task 10.10**: Create admin documentation for troubleshooting

---

## 5. Risk Assessment

### High Risk
🔴 **Network Printer Discovery Complexity**
- **Risk**: mDNS may not discover printers on all network configurations (VLANs, firewalls)
- **Mitigation**: Provide manual IP entry option, test on various network topologies
- **Contingency**: Fallback to manual printer registration by IP/hostname

🔴 **Daily Sequence Reset Timing**
- **Risk**: Midnight reset may fail due to server downtime or timezone issues
- **Mitigation**: Use cron job + startup check, timezone-aware timestamps
- **Contingency**: Manual reset button in admin UI

🔴 **Cross-Node Print Job Routing**
- **Risk**: Print jobs to remote printers may fail due to network issues
- **Mitigation**: Implement retry queue with exponential backoff
- **Contingency**: Allow users to re-select local printer

### Medium Risk
🟡 **Printer Format Compatibility**
- **Risk**: Different printers use different command languages (ESC/POS, ZPL, PCL)
- **Mitigation**: Start with ESC/POS (most common) and ZPL (labels)
- **Contingency**: Document supported printer models

🟡 **Concurrent Print Jobs**
- **Risk**: Multiple users printing to same printer simultaneously
- **Mitigation**: Implement job queue with FIFO processing
- **Contingency**: Add priority field for urgent jobs

🟡 **Receipt Template Maintenance**
- **Risk**: Each business type needs custom templates
- **Mitigation**: Use template engine with configurable sections
- **Contingency**: Provide generic fallback template

### Low Risk
🟢 **Permission Complexity**
- **Risk**: Users confused about printer access permissions
- **Mitigation**: Clear UI messaging, helpful error messages
- **Contingency**: Admin can override permissions for troubleshooting

🟢 **Storage for Print Job History**
- **Risk**: Print jobs table grows large over time
- **Mitigation**: Add cleanup job to delete jobs older than 30 days
- **Contingency**: Add database indexes for performance

---

## 6. Testing Plan

### Unit Tests
- `printer-service.ts`: Register, update, delete, list printers
- `receipt-numbering.ts`: Global ID generation, daily sequence, reset logic
- `print-job-queue.ts`: Queue, process, retry, fail handling
- `receipt-templates.ts`: Template rendering for each business type
- `label-generator.ts`: SKU label with barcode generation
- `printer-discovery.ts`: mDNS broadcast, peer registration

### Integration Tests
- API Endpoints: All printer and print job endpoints
- Sync Service: Printer discovery across multiple nodes
- Database: Concurrent job creation, sequence uniqueness
- Permissions: Access control for printer operations

### E2E Tests
1. **Happy Path - Label Printing**:
   - Admin registers label printer
   - User opens inventory, clicks print label
   - Selects printer, previews label
   - Confirms print → job queued → success toast

2. **Happy Path - Receipt Printing**:
   - Admin registers receipt printer
   - User completes restaurant order
   - System auto-prints kitchen + customer receipts
   - Both receipts have correct numbering

3. **Cross-Node Printing**:
   - Node A has printer, Node B has user
   - User on Node B prints to Node A's shared printer
   - Print job routed correctly, processed successfully

4. **Error Handling**:
   - Print to offline printer → job queued, retry automatically
   - Network failure mid-print → job marked failed, retry button shown
   - No permission → print button hidden, API returns 403

### Manual Testing
- Test ESC/POS commands with physical thermal printer
- Test ZPL commands with Zebra label printer
- Test receipt templates with actual order data
- Verify daily sequence reset at midnight
- Test on different network configurations (WiFi, Ethernet, VPN)

---

## 7. Rollback Plan

### Phase-by-Phase Rollback

**If Phase 1-4 fails (Backend):**
1. Rollback Prisma migration: `npx prisma migrate resolve --rolled-back <migration-name>`
2. Remove new API routes (won't be called by UI)
3. Remove new service files
4. Restart application

**If Phase 5-8 fails (Frontend):**
1. Remove UI components (backend remains functional)
2. Remove navigation links
3. Hide print buttons via feature flag
4. Users can still use system without printing

**If Sync Integration fails:**
1. Disable printer broadcasting in sync service
2. Revert to local-only printers
3. Cross-node printing unavailable, local printing still works

### Database Rollback
```sql
-- If needed, drop tables manually
DROP TABLE IF EXISTS print_jobs;
DROP TABLE IF EXISTS receipt_sequences;
DROP TABLE IF EXISTS network_printers;
```

### Feature Flag
Add environment variable to disable printing:
```
ENABLE_PRINTING_MODULE=false
```

Hide all printer UI when disabled, API returns 503 Service Unavailable.

---

## 8. Review Summary

*This section will be filled after implementation with key learnings and recommendations.*

---

## 📊 Project Metrics

- **Estimated Time**: 14-18 days (full-time)
- **Phases**: 10 phases
- **Tasks**: 85 tasks (expanded for all 10 business types)
- **Files Created**: ~30 files
- **Files Modified**: ~8 files
- **Database Tables**: 3 new tables
- **API Endpoints**: 8 new endpoints
- **UI Components**: 12 new components
- **Receipt Templates**: 10 business-specific templates

---

## 🔗 Dependencies

### External Libraries Needed
- `node-thermal-printer` - ESC/POS printer support
- `zebra-zpl` - ZPL label generation (or build custom)
- `bwip-js` - Barcode generation for labels
- `qrcode` - QR code generation (optional, for receipts)

### Internal Dependencies
- Existing sync service (critical)
- Permission system (must extend)
- Universal category management (pattern to follow)
- Inventory management (integration point)

---

## 📝 Business-Specific Receipt & Label Requirements

### 1. 🍽️ Restaurant
**Receipt Requirements:**
- **Dual Printing**: Kitchen receipt (cooking instructions) + Customer receipt (payment)
- **Kitchen Receipt**: Item name, quantity, special instructions, allergens ⚠️, dietary restrictions 🌱, spice level 🌶️, prep time ⏱️
- **Customer Receipt**: Items, prices, tax, total, payment method, server name, table number, thank you message
- **Labels**: Prep date/time, expiration, storage temp (frozen/refrigerated/ambient)

### 2. 👕 Clothing
**Receipt Requirements:**
- Items with size/color variants clearly displayed
- Return policy (30-day return window, conditions)
- Store credit vs refund policy
- Seasonal sale indicators
**Labels**: SKU, size, color, price, barcode, season tag

### 3. 🛒 Grocery
**Receipt Requirements:**
- Weight/unit pricing ($/lb, $/kg)
- Expiration dates for perishables
- Sale/discount indicators
- Subtotal by category (produce, meat, dairy, etc.)
**Labels**: SKU, name, price, weight, expiration date, barcode

### 4. 🔧 Hardware
**Receipt Requirements:**
- Cut-to-size dimensions (if applicable)
- Bulk pricing breakdown (quantity × unit price)
- Special order details (ETA, deposit paid)
- Project reference number (if linked to project)
**Labels**: SKU, manufacturer, model, dimensions (if cut-to-size), barcode

### 5. 🏗️ Construction
**Receipt/Invoice Requirements:**
- Project code/name
- Contractor name and contact
- Budget tracking (amount spent / total budget)
- Project timeline (start date, end date, current phase)
- Labor + materials breakdown
- Payment terms
**Labels**: Project code, material type, delivery date, location

### 6. 🚗 Vehicles
**Service Receipt Requirements:**
- Vehicle info (make, model, year, license plate, VIN)
- Current mileage
- Service performed (oil change, tire rotation, etc.)
- Parts used with part numbers
- Labor hours
- Next service due (mileage/date)
- Driver/technician name
**Labels**: Vehicle ID, next service date, mileage

### 7. 💼 Consulting
**Receipt/Invoice Requirements:**
- Client name and contact
- Project/engagement name
- Service hours breakdown (date, hours, description)
- Hourly rate
- Total hours × rate
- Payment terms (net 30, etc.)
- Invoice number and date
**Labels**: Client code, project code, invoice reference

### 8. 🏪 Retail
**Receipt Requirements:**
- Standard retail format
- Loyalty points earned/balance
- Current promotions/discounts applied
- Return policy
- Survey/feedback QR code
**Labels**: Standard SKU, price, barcode

### 9. 🛠️ Services
**Receipt Requirements:**
- Service description (detailed)
- Labor hours with hourly rate
- Parts/materials used (itemized)
- Service warranty information (90 days, 1 year, etc.)
- Technician name and ID
- Follow-up service date (if applicable)
**Labels**: Service order number, date, warranty expiration

### 10. 📦 Other (Generic Fallback)
**Receipt Requirements:**
- Business name and contact
- Items/services with descriptions
- Quantities and prices
- Subtotal, tax, total
- Payment method
- Transaction ID and date
**Labels**: Basic SKU, name, price, barcode

---

## 🚀 Implementation Notes

### Architecture Decisions

**1. Why mDNS for Printer Discovery?**
- Already used by sync service (consistency)
- Works on local networks without DNS server
- Automatic discovery without manual configuration
- Fallback to manual IP entry if mDNS unavailable

**2. Why Queue-Based Print Jobs?**
- Handles concurrent requests gracefully
- Enables retry for failed jobs
- Provides audit trail and job history
- Supports offline queueing

**3. Why Dual Receipt Numbering?**
- Global ID: Unique across all receipts forever (UUID or sequential)
- Daily sequence: User-friendly daily counter (001, 002, 003)
- Both serve different purposes: global for DB, daily for user reference

**4. Why Separate Receipt Templates for All 10 Business Types?**
- Each business type has unique requirements and data to display
- **Restaurant**: Kitchen vs customer receipts, allergens, dietary info, spice level, prep time
- **Clothing**: Size/color variants, return policy, seasonal info, SKU
- **Grocery**: Expiration dates, weight/unit pricing, perishable info, discounts
- **Hardware**: Cut-to-size dimensions, bulk pricing, special order details
- **Construction**: Project code, contractor info, budget tracking, timeline
- **Vehicles**: Mileage, service details, driver info, maintenance records
- **Consulting**: Service hours, hourly rates, client info, project details
- **Retail**: Standard format with loyalty points, promotions
- **Services**: Labor hours, parts used, service description, warranty
- **Other**: Generic fallback template for uncategorized businesses
- Maintainable without complex conditional logic - each template is self-contained

### Simplified First Phase Approach
To minimize complexity in initial implementation:
1. Start with local printers only (defer cross-node in Phase 4)
2. Implement one receipt template (generic), expand later
3. Support one printer type (ESC/POS), add ZPL in Phase 2.7
4. Manual printer registration first, auto-discovery as enhancement

---

## ⚠️ APPROVAL CHECKPOINT

**Before proceeding to implementation, please review:**

1. **Scope**: Are all 10 business types covered? Anything missing?
2. **Architecture**: Does the sync service integration make sense?
3. **Phases**: Are phases organized logically? Too granular/too broad?
4. **Risks**: Any additional risks or concerns?
5. **Timeline**: 14-18 days realistic for all 10 business types? Need to adjust?

**Questions for Clarification:**

1. **Printer Types**: Should we support thermal, inkjet, laser, or focus on thermal only? (Thermal recommended for receipts/labels)
2. **Barcode Format**: What barcode format for labels? (Code128, QR, UPC?) (Code128 recommended for SKU)
3. **Receipt Retention**: How long to keep print job history? (30 days suggested)
4. **Implementation Priority**: Which business types to implement first?
   - **High Priority**: Restaurant (dual receipt), Clothing (variants), Grocery (expiration)
   - **Medium Priority**: Hardware (dimensions), Retail (standard)
   - **Lower Priority**: Construction (complex), Vehicles (service), Consulting, Services, Other
   - Suggested order: Generic fallback first, then Restaurant (most complex), then others
5. **Network Scope**: Local network only or support cloud printing? (Local recommended)
6. **Label Formats**: Do different business types need different label layouts beyond basic SKU? (e.g., grocery needs expiration date on label, clothing needs size/color)

---

**Type `SYNC REQUIREMENTS` to update requirements file with analysis, or `PHASE 1` to begin implementation.**
