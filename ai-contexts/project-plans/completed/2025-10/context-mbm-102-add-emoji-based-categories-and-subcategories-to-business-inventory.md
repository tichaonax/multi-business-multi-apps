# Feature Development Session Template

> **Template Type:** Feature Development
> **Version:** 1.0
> **Last Updated:** October 28, 2025

---

## 🎯 Purpose

For creating new features, screens, or endpoints with structured planning.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents **IN THE EXACT ORDER LISTED BELOW**.

### Core Contexts (Load in this EXACT order - ONE AT A TIME)

**CRITICAL:** Read these files sequentially. Do not proceed to the next document until you have fully read and understood the previous one.

1. **FIRST:** `ai-contexts/master-context.md` - General principles and conventions
   - ⚠️ Contains critical instruction to read code-workflow.md
   - ⚠️ Defines operating principles
   - ⚠️ Contains mandatory workflow enforcement
   - ⚠️ Defines example adherence requirements

2. **SECOND:** `ai-contexts/code-workflow.md` - Standard workflow and task tracking
   - Contains MANDATORY workflow requirements
   - Requires creating project plan BEFORE any code changes
   - Defines approval checkpoint process

### Feature-Specific Contexts (Load as needed after core contexts)

- `ai-contexts/frontend/component-context.md` - For UI component development
- `ai-contexts/frontend/ui-context.md` - For UI consistency and styling
- `ai-contexts/backend/backend-api-context.md` - For API endpoint development
- `ai-contexts/backend/database-context.md` - For database schema changes
- `ai-contexts/testing/unit-testing-context.md` - For test coverage

### Optional Contexts

- Domain-specific contexts based on the module being developed

**How to load:** Use the Read tool to load each relevant context document before beginning work.

---

## 🚀 Session Objective

<!-- Fill in your specific feature requirements before starting -->

**Ticket:** mbm-102

**Feature Name:** Add emoji-based categories and subcategories to business inventory

**Feature Description:**
Extend the proven emoji-enhanced category system from business expenses (mbm-100) to business inventory management, creating a unified three-tier hierarchy (Domain → Category → Subcategory) with emoji integration, business-specific customization, and comprehensive CRUD operations across all business modules.

**Key Requirements:**
- Three-tier hierarchy: InventoryDomains → InventoryCategories → InventorySubcategories
- Emoji integration with 150+ emoji database and visual picker
- Business-specific domain templates for all 6 business types
- Comprehensive CRUD operations with permission controls
- Backward compatibility with existing category system
- Mobile-responsive design with accessibility support
- Performance optimized for 1000+ categories per business

**Reference Implementation:** Business Expense Categories (mbm-100) - Reuse proven patterns

**Related Completed Work:** Supplier & Location Management System provides:
- ✅ Reusable Emoji Picker Component (`src/components/common/emoji-picker.tsx`)
- ✅ Emoji Picker Enhanced (`src/components/business/emoji-picker-enhanced.tsx`)
- ✅ Emoji database integration (`src/lib/data/emoji-database.ts`)
- ✅ UI patterns for emoji selection and display
- ✅ Permission system extensions for CRUD operations

**Target Module/Component:**

**Database Schema:**
- `prisma/schema.prisma` - Create InventoryDomains, InventorySubcategories models; extend BusinessCategories

**API Routes:**
- `/api/inventory/categories` (new) - Category CRUD operations
- `/api/inventory/subcategories` (new) - Subcategory CRUD operations
- `/api/inventory/domains` (new) - Domain template management
- `/api/universal/categories` (modify) - Add emoji/color support

**UI Components:**
- `src/components/inventory/inventory-category-editor.tsx` (new)
- `src/components/inventory/inventory-subcategory-editor.tsx` (new)
- `src/components/universal/category-navigation.tsx` (modify) - Replace hardcoded icons with emojis
- `src/components/universal/product-grid.tsx` (modify) - Add emoji support

**Business Modules:**
- Clothing business (`src/app/clothing/page.tsx`)
- Hardware business (`src/app/hardware/page.tsx`)
- Grocery business (`src/app/grocery/page.tsx`)
- All POS systems across business types

**API Endpoints (if applicable):**

**New Endpoints:**
- `GET /api/inventory/domains` - List inventory domain templates
- `POST /api/inventory/domains` - Create domain template (admin only)
- `GET /api/inventory/categories` - List categories with filters (businessId, domainId, parentId)
- `POST /api/inventory/categories` - Create category with emoji and color
- `PUT /api/inventory/categories/[id]` - Update category
- `DELETE /api/inventory/categories/[id]` - Soft delete category
- `GET /api/inventory/categories/[id]/subcategories` - List subcategories
- `POST /api/inventory/subcategories` - Create subcategory
- `PUT /api/inventory/subcategories/[id]` - Update subcategory
- `DELETE /api/inventory/subcategories/[id]` - Delete subcategory

**Modified Endpoints:**
- `GET /api/universal/categories` - Add emoji and color fields to response (backward compatible)

**UI/UX Requirements:**

**Custom UI Patterns (from `custom/use-custom-ui.md`):**
- Use `useAlert()` hook instead of browser alert()
- Use `useConfirm()` hook instead of browser confirm()
- Success messages via toast notifications or alert system
- Consistent styling with app's design system

**Emoji Design System:**
- Primary display: 24px emoji size
- Compact display: 16px emoji size
- Grid cards: 32px emoji size
- Always left-aligned with 8px margin to text

**Visual Consistency:**
- Emoji colors complement category color schemes
- Color picker shows emoji preview with selected color
- Fallback text-only mode for unsupported devices

**Accessibility:**
- Emoji have proper aria-label descriptions (e.g., `<span aria-label="hammer tool">🔨</span>`)
- High contrast support (4.5:1 contrast ratio minimum)
- Screen reader compatible
- Keyboard navigation support

**Mobile Optimization:**
- Touch-friendly: minimum 44px touch targets
- Responsive grid layout adapts to screen size
- Lazy loading for large category lists
- Performance optimized for mobile devices

**Acceptance Criteria:**

**Functional Criteria:**
- [ ] Users can create, edit, and delete inventory categories with emoji selection
- [ ] Business-specific category templates available for all 6 business types
- [ ] Three-tier hierarchy (domain → category → subcategory) functions correctly
- [ ] Emoji picker suggests relevant emojis based on category name and business type
- [ ] All business modules display emoji-enhanced categories
- [ ] POS systems show emoji category navigation
- [ ] Product creation forms include emoji category selection
- [ ] Permission system controls all 6 category/subcategory operations

**Performance Criteria:**
- [ ] Category list loading: < 500ms
- [ ] Emoji search results: < 200ms
- [ ] Category creation/update: < 1000ms
- [ ] POS category navigation: < 300ms
- [ ] Support 1000+ categories per business without performance degradation

**User Experience Criteria:**
- [ ] Category creation time reduced by 40% with emoji suggestions
- [ ] POS category selection speed improved by 30% with visual emojis
- [ ] 95% of users successfully create categories without training
- [ ] Emoji sizing consistent across all interfaces
- [ ] Mobile interface maintains usability on 320px screens

**Technical Criteria:**
- [ ] 100% of existing categories migrate successfully with default emojis
- [ ] Zero data loss during migration
- [ ] All existing API integrations continue to function
- [ ] All tests passing (unit, integration, E2E)
- [ ] Backward compatibility maintained

---

## 📐 Technical Specifications

**Technologies:**
- **Database**: PostgreSQL with Prisma ORM
- **Backend**: Next.js 14+ API Routes (TypeScript)
- **Frontend**: React 18+ with TypeScript
- **UI Framework**: Tailwind CSS, shadcn/ui components
- **State Management**: React Context (BusinessPermissionsContext)
- **Emoji System**: Custom emoji database (150+ emojis) + GitHub emoji API fallback

**Dependencies:**

**Existing (Reuse):**
- Prisma Client - Database ORM
- Emoji Database (`src/lib/data/emoji-database.ts`) - 150+ categorized emojis
- EmojiPickerEnhanced component - Visual emoji selector
- EmojiLookup table - Emoji metadata and usage tracking
- BusinessPermissionsContext - Permission checking infrastructure
- useAlert/useConfirm hooks - Custom UI interactions

**New Dependencies:**
- None required - all infrastructure exists from expense category system (mbm-100)

**Data Models:**

**New Models:**

```prisma
model InventoryDomains {
  id                      String                    @id
  name                    String                    @unique
  emoji                   String
  description             String?
  businessType            String
  isActive                Boolean                   @default(true)
  isSystemTemplate        Boolean                   @default(false)
  createdAt               DateTime                  @default(now())
  inventory_categories    InventoryCategories[]
}

model InventorySubcategories {
  id            String                @id
  categoryId    String
  name          String
  emoji         String?               // Optional emoji
  description   String?
  isDefault     Boolean               @default(false)
  isUserCreated Boolean               @default(false)
  displayOrder  Int                   @default(0)
  createdAt     DateTime              @default(now())
  createdBy     String?
  category      BusinessCategories    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  users         Users?                @relation(fields: [createdBy], references: [id])
}
```

**Extended Model:**

```prisma
model BusinessCategories {
  // Existing fields preserved...

  // New fields added:
  emoji                 String                    @default("📦")
  color                 String                    @default("#3B82F6")
  domainId              String?
  isUserCreated         Boolean                   @default(false)
  createdBy             String?

  // New relations:
  domain                InventoryDomains?         @relation(fields: [domainId], references: [id])
  inventory_subcategories InventorySubcategories[]
}
```

**Integration Points:**

1. **Expense Category System (Reference Model)**
   - Reuse emoji database and search functions
   - Mirror permission structure (6 permissions)
   - Follow same three-tier hierarchy pattern
   - Use same EmojiPickerEnhanced component

2. **Business Permission System**
   - Integrate with BusinessPermissionsContext
   - Add 6 new permissions: canCreate/Edit/Delete InventoryCategories/Subcategories
   - Business membership validation for all operations

3. **Universal Product Grid**
   - Display emoji in category filters
   - Support subcategory filtering
   - Maintain product counts per category

4. **POS Systems (All Business Types)**
   - Clothing POS - emoji category buttons
   - Hardware POS - emoji category buttons
   - Grocery POS - emoji category buttons
   - Quick visual recognition for staff

5. **Category Navigation**
   - Replace hardcoded icons with database emojis
   - Display hierarchical structure (domain → category → subcategory)
   - Support expansion/collapse of subcategories

6. **Product Creation Forms**
   - Emoji-enhanced category selector
   - Subcategory dropdown (when category selected)
   - Visual feedback with emoji preview

---

## ✅ Acceptance Criteria

**Functional Criteria:**
- [ ] Users can create, edit, and delete inventory categories with emoji selection
- [x] Business-specific category templates available for all 6 business types
- [ ] Three-tier hierarchy (domain → category → subcategory) functions correctly
- [ ] Emoji picker suggests relevant emojis based on category name and business type
- [ ] All business modules display emoji-enhanced categories
- [ ] POS systems show emoji category navigation
- [ ] Product creation forms include emoji category selection
- [ ] Permission system controls all 6 category/subcategory operations

**Performance Criteria:**
- [ ] Category list loading: < 500ms
- [ ] Emoji search results: < 200ms
- [ ] Category creation/update: < 1000ms
- [ ] POS category navigation: < 300ms
- [ ] Support 1000+ categories per business without performance degradation

**User Experience Criteria:**
- [ ] Category creation time reduced by 40% with emoji suggestions
- [ ] POS category selection speed improved by 30% with visual emojis
- [ ] 95% of users successfully create categories without training
- [ ] Emoji sizing consistent across all interfaces
- [ ] Mobile interface maintains usability on 320px screens

**Technical Criteria:**
- [ ] 100% of existing categories migrate successfully with default emojis
- [ ] Zero data loss during migration
- [ ] All existing API integrations continue to function
- [ ] All tests passing (unit, integration, E2E)
- [ ] Backward compatibility maintained

---

## 🧪 Testing Requirements

**Unit Tests:**

**Database Layer:**
- Test InventoryDomains CRUD operations
- Test InventoryCategories CRUD with emoji fields
- Test InventorySubcategories CRUD
- Test cascading deletes (domain → category → subcategory)
- Test unique constraints (domainId+name, categoryId+name)
- Test default values for emoji and color

**API Endpoints:**
- Test all CRUD operations with valid/invalid data
- Test permission checks for all operations
- Test business isolation (can't access other business data)
- Test error handling (invalid IDs, missing fields, duplicates)
- Test emoji field validation

**Utility Functions:**
- Test emoji search from emoji-database.ts
- Test category validation logic
- Test domain template inheritance logic

**Integration Tests:**

**Database Migration:**
- Test migration on fresh database
- Test migration with existing BusinessCategories data
- Verify all existing categories preserved
- Verify new fields populated with defaults
- Test migration rollback
- Verify foreign key constraints

**API Integration:**
- Test creating category → creating subcategory → linking to product
- Test inheriting domain → customizing category → using in business
- Test updating category → verify subcategories reflect changes
- Test deleting category → verify subcategories marked inactive
- Test permission changes → verify API access reflects changes

**Component Integration:**
- Test InventoryCategoryEditor → API → Database flow
- Test emoji picker → category save → display in navigation
- Test domain selector → category creation → business display

**E2E Tests:**

**Critical User Flows:**

1. **Create Custom Category:**
   - Navigate to category management
   - Click "Add Category"
   - Search for emoji
   - Select emoji and enter name
   - Save category
   - Verify appears in navigation with emoji

2. **Inherit Domain Template:**
   - Admin creates domain template
   - User views available templates
   - User selects and inherits template
   - System creates categories with emojis
   - User customizes one category
   - Verify all categories work in inventory

3. **Use Categories in POS:**
   - Create category with emoji
   - Assign products to category
   - Open POS interface
   - Verify emoji category filter works
   - Filter products by category
   - Complete transaction

4. **Manage Subcategories:**
   - Create parent category
   - Create multiple subcategories
   - Assign products to subcategories
   - Verify hierarchy displays correctly
   - Test filtering by subcategory

5. **Permission-Based Access:**
   - Create user without permissions
   - Verify read-only view
   - Grant canCreateInventoryCategories
   - Verify can now create
   - Verify still can't delete

**Cross-Browser Testing:**
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Android)
- Emoji rendering consistency across platforms

**Accessibility Testing:**
- Screen reader announces emoji names
- Keyboard navigation through categories
- High contrast mode maintains readability
- ARIA labels on interactive elements

**Performance Testing:**
- Load 1000+ categories: < 2 seconds
- Emoji search: < 200ms
- Mobile performance: smooth scrolling

---

## 📝 Session Notes

**Key Findings from Codebase Analysis:**

**Reference Implementation Success:**
- Business Expense Categories (mbm-100) provides proven architecture
- Three-tier hierarchy works well: ExpenseDomains → ExpenseCategories → ExpenseSubcategories
- Emoji integration successful with 150+ emoji database
- Permission system with 6 granular permissions proven effective

**Current Inventory System Gaps:**
- No emoji support (hardcoded icons per business type)
- No domain/template system (each business reinvents categories)
- No subcategories (only 2-level hierarchy via parentId)
- No user tracking (unknown who created/modified categories)
- No color differentiation for categories

**Architecture Decisions:**

1. **Reuse vs. Rebuild**: REUSE proven expense category patterns
   - Same three-tier hierarchy
   - Same emoji database and picker
   - Same permission model
   - Same API patterns

2. **Migration Strategy**: Additive changes only
   - Keep existing BusinessCategories table
   - Add new fields (emoji, color, domainId, etc.)
   - Create new tables alongside (not replacing)
   - Backward compatible - existing code continues to work

3. **Emoji Strategy**: Hybrid approach
   - Primary: Custom emoji database (150+ emojis, offline-capable)
   - Fallback: GitHub emoji API for extended emojis
   - Usage tracking via EmojiLookup table

4. **Permission Strategy**: Follow expense model exactly
   - 6 permissions: Create/Edit/Delete for Categories and Subcategories
   - Business-level isolation enforced in all APIs
   - System admin role for domain template creation

**Domain Templates by Business Type:**
- **Clothing**: Men's 👔, Women's 👗, Kids 👶, Footwear 👟
- **Hardware**: Hand Tools 🔨, Power Tools ⚡, Building Materials 🧱
- **Grocery**: Fresh Produce 🥬, Meat & Seafood 🥩, Dairy 🥛
- **Restaurant**: Appetizers 🥗, Main Courses 🍽️, Beverages ☕

**Risk Mitigation:**
- Comprehensive database backup before migration
- Staged rollout: local → staging → production
- Feature flags for gradual emoji rollout
- Rollback procedures tested in advance

**Technical Constraints:**
- Must maintain < 500ms API response times
- Must support 1000+ categories per business
- Must work on mobile devices (320px minimum width)
- Must support emoji rendering on all major browsers

**Last Updated**: 2025-10-28 (synced with project plan)


---

## ✅ Start Session

Ready to begin feature development. Please:

1. Review the feature requirements
2. Propose an implementation plan
3. Identify technical challenges or considerations
4. Suggest a testing strategy

---
