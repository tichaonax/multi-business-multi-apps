# API Documentation: Category Sharing System

**Last Updated**: October 31, 2025  
**Version**: 2.0 (mbm-104 Category Sharing Implementation)  
**Status**: Production Ready

---

## Overview

The category system now uses a **shared resource model** where categories are tied to `businessType` rather than individual `businessId`. This enables all businesses of the same type (e.g., all clothing stores) to dynamically share the same category pool.

### Key Changes from v1.0

- ✅ Categories now shared across all businesses of the same type
- ✅ New businesses automatically see all type-level categories
- ✅ Adding a category makes it instantly visible to all same-type businesses
- ✅ Products remain business-specific (not shared)

---

## API Endpoints

### GET /api/inventory/[businessId]/categories

**Purpose**: Retrieve all categories for a business's type

**Authentication**: Required (session-based)

**Parameters**:
- `businessId` (path parameter): The ID of the business

**Request Example**:
```http
GET /api/inventory/abc123-business-id/categories
```

**Response Example**:
```json
{
  "categories": [
    {
      "id": "cat-001",
      "name": "Women's Fashion",
      "businessType": "clothing",
      "description": "Women's clothing and accessories",
      "emoji": "👗",
      "color": "#E91E63",
      "displayOrder": 1,
      "isUserCreated": false,
      "isActive": true
    },
    {
      "id": "cat-002",
      "name": "Custom Category",
      "businessType": "clothing",
      "description": "User-added category",
      "emoji": "⭐",
      "color": "#FFC107",
      "displayOrder": 99,
      "isUserCreated": true,
      "isActive": true
    }
  ]
}
```

**Implementation Details**:
```typescript
// Query pattern (internal)
const business = await prisma.businesses.findUnique({
  where: { id: businessId },
  select: { type: true }
})

const categories = await prisma.businessCategories.findMany({
  where: { 
    businessType: business.type,  // ← Query by TYPE, not ID
    isActive: true 
  },
  orderBy: { displayOrder: 'asc' }
})
```

**Behavior**:
- Returns ALL categories for the business's type
- Includes both system categories (`isUserCreated: false`) and custom categories (`isUserCreated: true`)
- Categories are shared across all businesses of the same type
- New businesses immediately see existing type-level categories

**Error Responses**:
- `401 Unauthorized`: No valid session
- `404 Not Found`: Business ID doesn't exist
- `500 Internal Server Error`: Database error

---

### POST /api/inventory/[businessId]/categories

**Purpose**: Create a new category for a business type

**Authentication**: Required (session-based)

**Parameters**:
- `businessId` (path parameter): The ID of the business creating the category

**Request Body**:
```json
{
  "name": "New Category Name",
  "description": "Optional description",
  "emoji": "📦",
  "color": "#3B82F6",
  "displayOrder": 10
}
```

**Response Example (Success)**:
```json
{
  "category": {
    "id": "cat-new-123",
    "name": "New Category Name",
    "businessType": "clothing",
    "businessId": "abc123-business-id",
    "description": "Optional description",
    "emoji": "📦",
    "color": "#3B82F6",
    "displayOrder": 10,
    "isUserCreated": true,
    "isActive": true,
    "createdAt": "2025-10-31T12:00:00Z"
  }
}
```

**Implementation Details**:
```typescript
// 1. Get business type
const business = await prisma.businesses.findUnique({
  where: { id: businessId },
  select: { type: true }
})

// 2. Check for duplicate at TYPE level (not business level)
const existing = await prisma.businessCategories.findFirst({
  where: { 
    businessType: business.type,
    name: body.name 
  }
})

if (existing) {
  return res.status(409).json({ 
    error: 'Category with this name already exists for this business type' 
  })
}

// 3. Create category at TYPE level
const category = await prisma.businessCategories.create({
  data: {
    businessId,           // Required field (for tracking)
    businessType: business.type,  // Used for queries
    name: body.name,
    isUserCreated: true,  // Mark as custom
    // ... other fields
  }
})
```

**Behavior**:
- Creates category at `businessType` level (shared across all same-type businesses)
- Prevents duplicate category names within the same business type
- Automatically sets `isUserCreated: true` for user-created categories
- New category immediately visible to ALL businesses of that type

**Error Responses**:
- `401 Unauthorized`: No valid session
- `404 Not Found`: Business ID doesn't exist
- `409 Conflict`: Category name already exists for this business type
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Database error

---

## Database Schema

### BusinessCategories Model

```prisma
model BusinessCategories {
  id                String              @id @default(uuid())
  businessId        String              // Required: Which business created it
  businessType      String              // Key field: Categories queried by this
  name              String              // Category name
  description       String?
  emoji             String              @default("📦")
  color             String              @default("#3B82F6")
  displayOrder      Int                 @default(0)
  isActive          Boolean             @default(true)
  isUserCreated     Boolean             @default(false)
  domainId          String?             // Link to template (system categories)
  createdBy         String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime

  // Relations
  businesses        Businesses          @relation(fields: [businessId], references: [id])
  business_products BusinessProducts[]
  
  // Unique constraint: One category name per business type
  @@unique([businessType, name])
  @@map("business_categories")
}
```

**Key Fields**:
- `businessType`: Used for querying - categories shared by this field
- `businessId`: Required for audit trail (which business created it)
- `isUserCreated`: Distinguishes system categories from user-added ones
- `domainId`: Links to template (null for user-created categories)

**Unique Constraint**:
- `@@unique([businessType, name])`: Prevents duplicate category names per type
- Example: Only one "Women's Fashion" category can exist for "clothing" type
- Different types can have same name: "Beverages" in grocery AND restaurant

---

## Migration Guide

### Schema Changes

**Migration**: `20251031000000_shared_categories_by_type`

**SQL Applied**:
```sql
-- Drop old unique constraint (businessId, name)
ALTER TABLE "business_categories" 
  DROP CONSTRAINT IF EXISTS "business_categories_businessId_name_key";

-- Add new unique constraint (businessType, name)
ALTER TABLE "business_categories" 
  ADD CONSTRAINT "business_categories_businessType_name_key" 
  UNIQUE ("businessType", "name");
```

**Impact**:
- Categories are now unique per TYPE, not per business
- Enables true sharing across businesses of same type
- Existing category references preserved (no data loss)

---

## Usage Examples

### Frontend: Fetching Categories for a Business

```typescript
// In your component
async function fetchCategories(businessId: string) {
  const response = await fetch(`/api/inventory/${businessId}/categories`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }
  
  const data = await response.json()
  return data.categories
}

// Categories are automatically filtered by business type
// No need to manually filter - API handles it
```

### Frontend: Creating a Custom Category

```typescript
async function createCategory(businessId: string, categoryData: {
  name: string
  description?: string
  emoji?: string
  color?: string
}) {
  const response = await fetch(`/api/inventory/${businessId}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData)
  })
  
  if (response.status === 409) {
    // Category name already exists for this business type
    throw new Error('A category with this name already exists')
  }
  
  if (!response.ok) {
    throw new Error('Failed to create category')
  }
  
  const data = await response.json()
  // New category is immediately visible to all same-type businesses
  return data.category
}
```

### Displaying Categories with System/Custom Indicators

```typescript
function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <div>
      {categories.map(category => (
        <div key={category.id} className="category-item">
          <span>{category.emoji} {category.name}</span>
          {category.isUserCreated && (
            <span className="badge">Custom</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Behavior Guide

### New Business Creation

**Old Behavior (v1.0)**:
- New business created
- Category dropdown is empty ❌
- User must manually create all categories

**New Behavior (v2.0)**:
- New business created
- Category dropdown automatically populated ✅
- Shows all categories for that business type
- Ready to use immediately

### Adding a Custom Category

**Scenario**: Business A (clothing store) adds "Premium Collection" category

**What Happens**:
1. Category created with `businessType: 'clothing'`
2. Unique constraint checks: no other "Premium Collection" for clothing
3. Category saved successfully
4. **Business A** sees the new category immediately
5. **All other clothing businesses** also see "Premium Collection" immediately
6. Grocery, hardware, restaurant businesses don't see it (different type)

### Category Sharing Flow

```
User adds "Premium Collection" to Clothing Store A
           ↓
Category created with businessType='clothing'
           ↓
Database: 1 record added
           ↓
Query from ANY clothing business: WHERE businessType='clothing'
           ↓
Returns: All clothing categories including "Premium Collection"
           ↓
Result: Visible to ALL clothing businesses instantly
```

---

## Common Questions

### Q: Why does my new business already have categories?

**A**: Categories are now shared at the business type level. When you create a new clothing store, it automatically sees all existing clothing categories. This is the intended behavior.

### Q: If I add a category, will other businesses see it?

**A**: Yes, but only businesses of the **same type**. If you add a category to a clothing store, all clothing stores see it. Grocery stores won't see it because they're a different type.

### Q: Can I delete a category?

**A**: You can soft-delete categories by setting `isActive: false`. Be careful - this affects ALL businesses of that type. Consider the impact before deactivating system categories.

### Q: What if I try to create a duplicate category name?

**A**: The API will return a `409 Conflict` error. Category names must be unique within each business type. Use a different name or modify the existing category.

### Q: Are products shared like categories?

**A**: No. Products remain tied to their specific `businessId`. Only categories are shared by type. This is intentional - inventory is business-specific, but categorization is type-level.

### Q: What happens to categories when I change my business type?

**A**: Changing business type is not a supported operation. If needed, you would need to create a new business of the desired type, which will see categories for that type.

---

## Testing

### Test: New Business Sees Categories

```bash
# Run automated test
npx tsx scripts/test-category-sharing.ts
```

Expected: New clothing business sees 5 clothing categories immediately.

### Test: Custom Category Sharing

```bash
# Create test category via API
curl -X POST http://localhost:3000/api/inventory/[businessId]/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Category","emoji":"⭐"}'

# Query from different same-type business
curl http://localhost:3000/api/inventory/[otherBusinessId]/categories

# Expected: Test Category appears in both responses
```

---

## Support & Troubleshooting

### Issue: Categories not appearing

**Check**:
1. Is the business type correct? (`SELECT type FROM businesses WHERE id = ?`)
2. Do categories exist for that type? (`SELECT * FROM business_categories WHERE businessType = ?`)
3. Are categories active? (`WHERE isActive = true`)

### Issue: Can't create category - 409 error

**Cause**: Category name already exists for this business type

**Solution**: 
- Use a different name, or
- Check existing categories: `SELECT * FROM business_categories WHERE businessType = ? AND name = ?`

### Issue: Category visible to wrong business type

**Check**: Verify `businessType` field is correct:
```sql
SELECT id, name, businessType FROM business_categories WHERE name = ?
```

If incorrect, update:
```sql
UPDATE business_categories SET businessType = 'correct-type' WHERE id = ?
```

---

## Version History

### v2.0 (October 2025) - mbm-104

- ✅ Changed category architecture from business-instance to business-type sharing
- ✅ Updated unique constraint to `[businessType, name]`
- ✅ Categories now dynamically shared across same-type businesses
- ✅ New businesses automatically see type-level categories
- ✅ Improved scalability and reduced data duplication

### v1.0 (Previous)

- Categories tied to individual `businessId`
- Each business had isolated category pool
- New businesses started with empty categories
- Manual category setup required

---

**Documentation Maintained By**: Development Team  
**Questions**: Contact system administrator or refer to project documentation
