# Global Barcode Scanning Modal - Requirements

**Date:** 2025-11-15
**Type:** New Feature Requirements
**Status:** 📋 REQUIREMENTS ANALYSIS - Phase 1 Permission System Completed
**Priority:** HIGH - Core User Experience Enhancement

---

## 🎯 Problem Statement

### Current Limitation
Users can only scan barcodes within specific POS pages or inventory screens. When a product is scanned outside of these contexts (e.g., from the main dashboard, business overview, or other app sections), there's no way to quickly check inventory availability or initiate a sale.

### User Pain Points
- **Limited Scanning Context**: Barcode scanning only works in dedicated POS/inventory pages
- **No Cross-Business Visibility**: Can't see if a product is available in other businesses
- **Manual Navigation Required**: Users must navigate to specific POS pages to sell scanned items
- **Lost Sales Opportunities**: Customers may leave if staff can't quickly check/fill orders

### Business Impact
- Reduced efficiency in multi-business operations
- Missed sales opportunities
- Poor user experience compared to dedicated POS systems
- Inconsistent workflow across different app sections

---

## 🎨 Proposed Solution

### High-Level Concept

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Barcode Modal                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User scans barcode anywhere in app → Modal appears         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Product Found!                        │    │
│  │  ┌─────────────────────────────────────────────────┐ │    │
│  │  │  [Product Image]  Cordless Drill 18V          │ │    │
│  │  │  SKU: ACE-PWR-DRL-001                         │ │    │
│  │  │  UPC: 088381652001                            │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  Available in these businesses:                        │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐ │    │
│  │  │ 🏪 Ace Hardware Downtown                        │ │    │
│  │  │ 💰 $89.99  📦 25 in stock                       │ │    │
│  │  │ [Select for POS]                                 │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐ │    │
│  │  │ 🏪 Home Depot North                             │ │    │
│  │  │ 💰 $92.50  📦 12 in stock                       │ │    │
│  │  │ [Select for POS]                                 │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐ │    │
│  │  │ 🏪 Lowe's Central                               │ │    │
│  │  │ ❌ Out of stock                                  │ │    │
│  │  │ [Check Inventory]                                │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │  [× Close]                                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Global Scanning**: Barcode scanning works from any page in the application
2. **Cross-Business Inventory**: Shows real-time stock levels across all accessible businesses
3. **Smart Navigation**: One-click navigation to appropriate POS page with item pre-filled
4. **Permission-Aware**: Only shows businesses user has access to
5. **Fallback Options**: If out of stock, provides inventory management shortcuts

---

## 📋 Detailed Requirements

### Functional Requirements

#### 1. Global Event Listening
- **Scope**: Application-wide barcode scanning capability
- **Trigger**: Any barcode scan detected anywhere in the app
- **Context Independence**: Works regardless of current page/route
- **Permission Check**: Verify user has global barcode scanning permission

#### 2. Product Lookup & Modal Display
- **Barcode Resolution**: Use existing ProductBarcodes table for lookup
- **Universal Support**: Handle UPC/EAN codes that exist in multiple businesses
- **Business Filtering**: Only show businesses user has access to
- **Real-time Data**: Current stock levels and pricing
- **Product Details**: Image, name, SKU, barcode type, description

#### 3. Business Selection Interface
- **Visual Layout**: Business cards with logos/icons, names, pricing, stock
- **Stock Indicators**: Color-coded stock status (in stock, low stock, out of stock)
- **Price Display**: Current selling price for each business
- **Action Buttons**: "Select for POS" or "Check Inventory" based on stock

#### 4. Navigation & POS Integration
- **Seamless Transition**: Navigate to appropriate POS page for selected business
- **Item Pre-fill**: Automatically add scanned item to POS cart
- **Context Preservation**: Return to original page after transaction (optional)
- **POS Type Detection**: Route to correct POS (grocery, hardware, restaurant, clothing)

#### 5. Permission System
- **Primary Permission**: `canAccessGlobalBarcodeScanning` - Allows global barcode scanning within accessible businesses
- **Extended Permission**: `canViewGlobalInventoryAcrossBusinesses` - Allows viewing inventory from businesses user doesn't have access to (informational only)
- **Business Access Control**:
  - Users with primary permission only: See inventory from businesses they have membership access to
  - Users with both permissions: See all businesses (accessible = full interaction, inaccessible = informational only)
  - Administrators: Full access to all businesses
- **Role-Based**: Configurable per user role with principle of least privilege
- **Audit Trail**: Log all global barcode scans with user/business context and permission level

### Non-Functional Requirements

#### Performance
- **Scan Response**: Modal appears within 500ms of barcode detection
- **Inventory Query**: Cross-business lookup completes within 2 seconds
- **UI Responsiveness**: Smooth animations and transitions
- **Memory Management**: Clean up event listeners when not needed

#### Security
- **Permission Enforcement**: Server-side validation of access rights
- **Audit Logging**: Track all global barcode scans with user/business context
- **Data Privacy**: Only show business data user is authorized to see

#### Usability
- **Intuitive Design**: Clear visual hierarchy and obvious actions
- **Keyboard Navigation**: Full keyboard accessibility
- **Mobile Responsive**: Works on all device sizes
- **Error Handling**: Graceful handling of network issues or invalid barcodes

---

## � Dependencies & Constraints

### Technical Dependencies
- **Existing Systems**: ProductBarcodes table, barcode scanner component, POS systems
- **Permission System**: Must integrate with existing role-based permissions
- **Database**: Cross-business queries must be optimized for performance

### Business Constraints
- **Multi-Business Context**: Must respect business boundaries and permissions
- **Real-time Data**: Stock levels must be current and accurate
- **User Experience**: Must not disrupt existing workflows

---

## � Open Questions for Clarification

1. **Permission Granularity**: ✅ **RESOLVED** - Global barcode scanning uses two-tier permission system:
   - `canAccessGlobalBarcodeScanning`: Allows scanning within accessible businesses
   - `canViewGlobalInventoryAcrossBusinesses`: Allows viewing inventory from inaccessible businesses (informational only)

2. **Modal Behavior**: When multiple businesses have the item, should we auto-select the "best" option (highest stock, lowest price), or always show the modal?

3. **Navigation Context**: After completing a POS transaction from a global scan, should we return the user to their original location, or keep them in POS?

4. **Caching Strategy**: How long should we cache cross-business inventory data? Real-time is ideal but may impact performance.

5. **Audit Requirements**: What level of audit logging is required for global barcode scans? Basic (who/when/what) or detailed (including business context, IP, etc.)?

6. **Mobile Optimization**: Should we prioritize mobile performance, or is desktop usage the primary target?

---

## � Success Criteria

### Functional Success
- [ ] Global barcode scanning works from any app page
- [ ] Cross-business inventory visible with proper permissions
- [ ] One-click navigation to POS with item pre-filled
- [ ] All security and permission requirements met

### Performance Success
- [ ] Modal appears within 500ms of barcode detection
- [ ] Cross-business lookup completes within 2 seconds
- [ ] No performance degradation in existing workflows

### User Experience Success
- [ ] Intuitive and easy to use
- [ ] Works on all device types and screen sizes
- [ ] Clear error handling and feedback

---

## 📚 References

- [Existing Barcode System](src/components/universal/barcode-scanner.tsx)
- [ProductBarcodes Table](prisma/schema.prisma)
- [POS Systems](src/app/*/pos/page.tsx)
- [Permission System](src/lib/auth/permissions.ts)

---

**Status:** 📋 REQUIREMENTS ANALYSIS - Ready for Project Planning
**Created:** 2025-11-15
**Priority:** HIGH - Core User Experience Enhancement