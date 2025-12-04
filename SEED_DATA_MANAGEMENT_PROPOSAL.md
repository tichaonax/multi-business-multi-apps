# Seed Data Management System - Proposal

## Overview
A comprehensive system for admin users to create, maintain, and distribute seed product data across all business types using the universal inventory workflow. This enables continuous improvement of seed datasets as products are refined with better metadata.

---

## Core Concept

### Current State
- Seed data is **static JSON files** in `seed-data/` directory
- Example: `seed-data/clothing-categories/final-8-departments.json` (1067 products)
- Seeding imports products with zero quantities to help new businesses
- Once seeded, button is disabled (products exist)

### Proposed State
- **Dynamic seed data management** through admin UI
- Export live products → seed data templates
- Import seed data templates → new business instances
- Continuous refinement as metadata improves
- Version control and change tracking

---

## Architecture

### 1. Database Schema Changes

#### New Table: `seed_data_templates`
```prisma
model SeedDataTemplates {
  id              String   @id @default(uuid())
  name            String   // "Clothing Products v2.5", "Restaurant Menu Standard"
  businessType    String   // "clothing", "restaurant", "hardware", "grocery"
  version         String   // "2.5.0" - semver
  description     String?
  isActive        Boolean  @default(true)
  isSystemDefault Boolean  @default(false) // The default template for new businesses
  productCount    Int      @default(0)
  categoryCount   Int      @default(0)
  
  // Metadata
  createdBy       String   // User ID who created/exported this
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // JSON data structure
  templateData    Json     // Complete seed data including products, categories, metadata
  
  // Audit trail
  sourceBusinessId String?  // If exported from a live business
  exportNotes      String?  // Admin notes about changes/improvements
  
  // Relations
  user            Users    @relation(fields: [createdBy], references: [id])
  sourceBusiness  Businesses? @relation(fields: [sourceBusinessId], references: [id])
  
  @@unique([businessType, version])
  @@index([businessType, isActive])
  @@index([isSystemDefault])
  @@map("seed_data_templates")
}
```

#### Template Data JSON Structure
```typescript
interface SeedDataTemplate {
  version: string
  businessType: string
  metadata: {
    exportedAt: string
    exportedBy: string
    exportedFrom?: string // business name
    totalProducts: number
    totalCategories: number
    totalSubcategories: number
    departments?: string[]
  }
  
  // Department structure (clothing specific, optional)
  departments?: {
    [key: string]: {
      emoji: string
      name: string
      description: string
      domainId: string
      items: ProductSeedItem[]
    }
  }
  
  // Flat product list (universal)
  products: ProductSeedItem[]
  
  // Category definitions
  categories: CategorySeedItem[]
  subcategories: SubcategorySeedItem[]
  
  // Domain definitions (if new ones introduced)
  domains?: DomainSeedItem[]
}

interface ProductSeedItem {
  sku: string
  name: string
  description?: string
  categoryName: string
  subcategoryName?: string
  department?: string // clothing specific
  domainId?: string
  basePrice?: number
  costPrice?: number
  attributes?: Record<string, any>
  
  // Enhanced metadata (the goal!)
  brandName?: string
  tags?: string[]
  seasonality?: string
  targetAudience?: string
  materials?: string[]
  careInstructions?: string
  sustainability?: string
  // ... extensible for each business type
}

interface CategorySeedItem {
  name: string
  emoji?: string
  color?: string
  description?: string
  domainId?: string
  displayOrder?: number
}

interface SubcategorySeedItem {
  name: string
  categoryName: string
  emoji?: string
  displayOrder?: number
}

interface DomainSeedItem {
  id: string
  name: string
  emoji: string
  description: string
  isActive: boolean
}
```

---

## 2. Admin UI Components

### A. Seed Template Management Page
**Route:** `/admin/seed-templates`

**Features:**
- List all seed templates by business type
- View template details (product count, version, last updated)
- Activate/deactivate templates
- Set system default template per business type
- Delete old/unused templates

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🌱 Seed Data Template Management                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Business Type: [Clothing ▼] [Restaurant] [Hardware] [All]   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 👔 Clothing Products v2.5 ⭐ DEFAULT                   │  │
│ │ 1,067 products • 48 categories • 156 subcategories     │  │
│ │ Created: Nov 15, 2025 by Admin User                   │  │
│ │ Source: HXI Fashions (refined metadata)               │  │
│ │                                                        │  │
│ │ [View Details] [Export JSON] [Set as Default] [Edit]  │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 👔 Clothing Products v2.0                              │  │
│ │ 1,012 products • 42 categories • 120 subcategories     │  │
│ │ Created: Oct 1, 2025 by System                        │  │
│ │ Legacy version (deprecated)                            │  │
│ │                                                        │  │
│ │ [View Details] [Export JSON] [Archive]                │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [+ Create New Template from Business]                       │
└─────────────────────────────────────────────────────────────┘
```

---

### B. Export Seed Template Workflow
**Route:** `/admin/seed-templates/export`

**Process:**
1. **Select Source Business**
   - Dropdown of businesses with products
   - Filter by business type
   - Show product count preview

2. **Configure Export**
   ```
   Template Name: [Clothing Products v3.0____]
   Version: [3.0.0____] (semver)
   Description: [Enhanced with sustainability data___]
   
   Export Options:
   ☑ Include all products (1,234 products)
   ☑ Include categories and subcategories
   ☑ Include domains (if custom ones exist)
   ☐ Zero out all prices (create price template)
   ☑ Zero out all quantities (always zero for seed)
   ☐ Strip business-specific data
   
   Advanced Filters:
   ☑ Only active products
   ☐ Only products with images
   ☐ Only products added/updated after: [Date picker]
   ☐ Exclude products with SKUs matching: [Pattern___]
   ```

3. **Preview & Validate**
   - Show sample products (first 10)
   - Validation checks:
     - All SKUs unique ✓
     - All categories exist ✓
     - All required fields present ✓
     - No business-specific IDs ✗ (warning)
   
4. **Save Template**
   - Store in database
   - Generate JSON file in `seed-data/templates/`
   - Create changelog entry

---

### C. Import/Apply Template Workflow
**Integrated into Business Inventory Pages**

**Two Modes:**

#### Mode 1: New Business Setup (Empty)
```typescript
// When business has 0 products
if (productCount === 0) {
  showSeedButton({
    text: "🌱 Seed Products",
    action: "apply-default-template",
    template: getDefaultTemplate(businessType)
  })
}
```

#### Mode 2: Template Manager (Advanced)
```
┌─────────────────────────────────────────────┐
│ 🌱 Seed Products                            │
├─────────────────────────────────────────────┤
│ Select Template:                            │
│ ● Clothing Products v2.5 (DEFAULT)          │
│   1,067 products, Latest version            │
│                                             │
│ ○ Clothing Products v2.0                    │
│   1,012 products, Legacy                    │
│                                             │
│ ○ Custom Template (Upload JSON)             │
│   [Choose File...]                          │
│                                             │
│ Import Mode:                                │
│ ● Skip existing SKUs (safe)                 │
│ ○ Update existing SKUs (overwrite)          │
│ ○ Create new SKUs only                      │
│                                             │
│ [Cancel] [Import Products →]                │
└─────────────────────────────────────────────┘
```

---

### D. Template Version Comparison
**Route:** `/admin/seed-templates/compare`

Compare two versions to see what changed:
```
┌─────────────────────────────────────────────────────────┐
│ Compare: v2.0 ←→ v2.5                                   │
├─────────────────────────────────────────────────────────┤
│ Products:    1,012 → 1,067 (+55)                        │
│ Categories:     42 → 48 (+6)                            │
│ Subcategories: 120 → 156 (+36)                          │
│                                                         │
│ New Products (55):                                      │
│ • SKU-1234: Sustainable Cotton T-Shirt                  │
│ • SKU-1235: Eco-Friendly Hoodie                         │
│ ...                                                     │
│                                                         │
│ Updated Products (234):                                 │
│ • SKU-0045: Added sustainability metadata               │
│ • SKU-0067: Updated description with care instructions  │
│ ...                                                     │
│                                                         │
│ New Categories (6):                                     │
│ • Sustainable Fashion                                   │
│ • Athletic Wear                                         │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. API Endpoints

### Template Management
```typescript
// List templates
GET /api/admin/seed-templates
  ?businessType=clothing
  &isActive=true
  &limit=50

// Get specific template
GET /api/admin/seed-templates/:id

// Create new template (export from business)
POST /api/admin/seed-templates/export
Body: {
  sourceBusinessId: string
  name: string
  version: string
  description?: string
  options: {
    includeCategories: boolean
    includeDomains: boolean
    zeroPrices: boolean
    onlyActive: boolean
    filters?: FilterOptions
  }
}

// Update template metadata
PATCH /api/admin/seed-templates/:id
Body: {
  name?: string
  description?: string
  isActive?: boolean
  isSystemDefault?: boolean
}

// Delete template
DELETE /api/admin/seed-templates/:id

// Apply template to business
POST /api/admin/seed-templates/:id/apply
Body: {
  targetBusinessId: string
  importMode: "skip" | "update" | "new-only"
}

// Compare two templates
GET /api/admin/seed-templates/compare
  ?template1=id1
  &template2=id2

// Download template as JSON
GET /api/admin/seed-templates/:id/download
```

### Quick Actions
```typescript
// Get default template for business type
GET /api/admin/seed-templates/default/:businessType

// Set default template
POST /api/admin/seed-templates/:id/set-default

// Validate template data
POST /api/admin/seed-templates/validate
Body: { templateData: SeedDataTemplate }
```

---

## 4. Permission System

### New Permission
```typescript
// Add to permission-utils.ts
export type Permission = 
  | ... existing permissions
  | 'canManageSeedTemplates'  // Admin-only permission
  | 'canExportSeedTemplates'  // Can create templates from businesses
  | 'canApplySeedTemplates'   // Can apply templates to businesses
```

### Permission Matrix
```
Role                  | Manage | Export | Apply
──────────────────────|────────|────────|──────
Super Admin           |   ✓    |   ✓    |   ✓
Business Admin        |   ✗    |   ✓    |   ✓
Business Manager      |   ✗    |   ✗    |   ✓
Business Employee     |   ✗    |   ✗    |   ✗
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create database migration for `seed_data_templates` table
- [ ] Add permissions to permission system
- [ ] Create TypeScript interfaces for template data structure
- [ ] Build basic template model and repository layer

### Phase 2: Export Functionality (Week 2)
- [ ] Build export API endpoint
- [ ] Create export UI workflow
- [ ] Implement data transformation (business → template)
- [ ] Add validation logic
- [ ] Generate JSON files in `seed-data/templates/`

### Phase 3: Import/Apply Functionality (Week 2-3)
- [ ] Refactor existing seed functions to use template system
- [ ] Build apply template API endpoint
- [ ] Add import mode options (skip/update/new-only)
- [ ] Update clothing inventory page seed button
- [ ] Add progress tracking for large imports

### Phase 4: Admin UI (Week 3-4)
- [ ] Create `/admin/seed-templates` management page
- [ ] Build template list/grid view
- [ ] Add create/edit/delete flows
- [ ] Implement version comparison view
- [ ] Add template download functionality

### Phase 5: Multi-Business Support (Week 4)
- [ ] Extend to restaurant business type
- [ ] Extend to hardware business type
- [ ] Extend to grocery business type
- [ ] Test cross-business-type functionality
- [ ] Create migration guide for existing seed data

### Phase 6: Enhancement & Polish (Week 5)
- [ ] Add search/filter in template list
- [ ] Implement template versioning UI
- [ ] Add bulk operations (apply to multiple businesses)
- [ ] Create audit log for template changes
- [ ] Add export/import history tracking
- [ ] Write documentation

---

## 6. Workflow Examples

### Example A: Refining Clothing Data
```
1. HXI Fashions has 1,500 products with rich metadata
2. Admin user visits /admin/seed-templates/export
3. Select "HXI Fashions" as source
4. Configure export:
   - Name: "Clothing Products v3.0"
   - Version: "3.0.0"
   - Description: "Added sustainability and care instruction data"
   - Only products updated in last 30 days
5. Preview shows 287 products with new metadata
6. Export creates template in database + JSON file
7. Set as system default template
8. Future clothing businesses get v3.0 data automatically
```

### Example B: New Business Setup
```
1. Create new clothing business "Fashion Hub"
2. Navigate to /clothing/inventory
3. See "🌱 Seed Products" button
4. Click → loads default template (v3.0)
5. Shows preview: "Import 1,067 products with rich metadata"
6. Confirm → background job imports products
7. Products appear with zero quantities
8. Button changes to "✅ Products Seeded"
```

### Example C: Custom Template
```
1. Admin creates specialized restaurant template
2. Export from "Fine Dining Demo" business
3. Name: "Fine Dining Menu Standard"
4. Filter: Only items with prep time > 15 minutes
5. Results: 45 high-end menu items
6. Save as non-default template
7. Apply only to premium restaurant businesses manually
```

---

## 7. Benefits

### For Admins
- **Continuous improvement**: Refine seed data as businesses grow
- **Version control**: Track changes over time
- **Flexibility**: Multiple templates per business type
- **Quality control**: Review and approve before setting default

### For Businesses
- **Better starting point**: New businesses get rich, current data
- **Faster setup**: Import proven product catalogs instantly
- **Consistency**: All businesses in same type have similar structure
- **Extensibility**: Can create custom templates for franchises

### For System
- **Scalability**: Easy to add new business types
- **Maintainability**: Seed data in database, not just JSON files
- **Auditability**: Track who created/modified templates
- **Testability**: Can test with different template versions

---

## 8. Technical Considerations

### Data Migration Strategy
```typescript
// Existing JSON files → Database templates
// Run once during deployment

async function migrateExistingSeedData() {
  // 1. Read existing JSON files
  const clothingData = readJSON('seed-data/clothing-categories/final-8-departments.json')
  const restaurantData = readJSON('seed-data/restaurant-products/menu-items.json')
  
  // 2. Create template records
  await createTemplate({
    name: 'Clothing Products v2.0',
    businessType: 'clothing',
    version: '2.0.0',
    isSystemDefault: true,
    templateData: clothingData,
    createdBy: 'system'
  })
  
  // 3. Keep JSON files for backward compatibility
  // 4. Update seed functions to use database templates
}
```

### Performance Optimization
- **Pagination**: Large templates loaded in chunks
- **Caching**: Cache default templates in memory/Redis
- **Background jobs**: Import large templates async with progress
- **Batch operations**: Bulk insert products in batches

### Backward Compatibility
- Keep existing JSON files for 2-3 versions
- Existing seed functions work with both JSON and DB templates
- Gradual migration path

### Security
- Admin-only access to template management
- Validate all template data before save
- Prevent SQL injection in dynamic queries
- Rate limiting on import operations
- Audit log all template changes

---

## 9. Alternative Approaches Considered

### Approach A: Git-based Versioning
❌ **Rejected**
- Seed data in Git repository
- Pull requests for changes
- **Problem**: Non-technical users can't contribute

### Approach B: External CMS
❌ **Rejected**
- Use headless CMS for seed data
- **Problem**: Extra infrastructure, complexity

### Approach C: Spreadsheet Import/Export
⚠️ **Partial**
- Could add CSV/Excel import as enhancement
- **Current**: JSON-based for rich metadata

### Approach D: Manual JSON File Editing
❌ **Current State - Inadequate**
- Edit JSON files directly
- **Problem**: Error-prone, no versioning, no UI

---

## 10. Open Questions for Review

1. **Template Versioning**: Should we use semantic versioning (2.5.0) or date-based (2025-12-01)?

2. **Multiple Defaults**: Should we allow multiple default templates per business type (e.g., "Basic" vs "Premium")?

3. **Template Inheritance**: Should templates support inheritance (e.g., "Premium Clothing" extends "Basic Clothing")?

4. **Automatic Updates**: Should existing businesses get notified when new template versions are available?

5. **Template Marketplace**: Future feature - share templates across installations?

6. **Rollback**: Should we keep history of applied templates per business to enable rollback?

7. **Partial Imports**: Should we support importing only categories, or only products, separately?

8. **Template Scheduling**: Should template application be schedulable (e.g., "apply at midnight")?

9. **Multi-language**: Should templates support multiple languages for product names/descriptions?

10. **Price Zones**: Should templates support regional pricing (e.g., US prices vs EU prices)?

---

## 11. Success Metrics

### Quantitative
- Time to seed products: < 30 seconds for 1,000+ products
- Template export time: < 60 seconds for any business
- Zero duplicate SKUs in templates
- Admin user adoption: 80%+ use template system vs manual JSON

### Qualitative
- Improved product metadata quality over time
- Reduced onboarding time for new businesses
- Easier maintenance by non-technical admins
- Positive feedback from business owners on seed data quality

---

## Conclusion

This proposal provides a **complete, scalable solution** for managing seed data across all business types. It transforms seed data from static JSON files into a **living, improvable dataset** that grows in quality over time.

The phased approach allows incremental development while maintaining backward compatibility. The admin UI makes it accessible to non-technical users, while the API provides flexibility for advanced use cases.

**Recommendation**: Proceed with implementation starting with Phase 1 (Foundation), using clothing business as the pilot business type.
