# Fresh Deployment Guide

## Post-Deployment Steps for New Server Installation

After running a fresh deployment on a new server, follow these steps to seed default data:

### 1. Seed Default Inventory Categories

The system needs default inventory categories for each business type (clothing, hardware, grocery, restaurant). These categories are shared across all businesses of the same type.

**Run this command after fresh deployment:**

```bash
npm run seed:categories
```

Or directly:

```bash
node scripts/seed-type-categories.js
```

**What this does:**
- Creates default categories for clothing, hardware, grocery, and restaurant businesses
- Creates subcategories for each category
- Categories are shared by `businessType` (not `businessId`)
- Only runs if categories don't already exist
- Requires at least one business of each type to exist first

### 2. Expected Output

```
🌱 Starting Type-Level Category Seeding...

📦 Processing clothing business type...
   ✅ Created category: Men's Fashion
      └─ Created 4 subcategories
   ✅ Created category: Women's Fashion
      └─ Created 4 subcategories
   ...

====================================================================
✅ SEEDING COMPLETE
====================================================================
📊 Categories created: 20
📊 Subcategories created: 52

📋 Final Category Count by Business Type:

   clothing: 5 categories
   hardware: 5 categories
   grocery: 6 categories
   restaurant: 4 categories

✅ Done!
```

### 3. Verify Categories Were Seeded

```sql
-- Check categories by business type
SELECT businessType, name, emoji, isUserCreated
FROM business_categories
WHERE isUserCreated = false
ORDER BY businessType, displayOrder;

-- Check subcategories
SELECT bc.businessType, bc.name as category, s.name as subcategory
FROM inventory_subcategories s
JOIN business_categories bc ON s.categoryId = bc.id
WHERE bc.isUserCreated = false
ORDER BY bc.businessType, bc.displayOrder, s.displayOrder;
```

## Category Structure

### Clothing (5 categories, 17 subcategories)
- Men's Fashion: Shirts, Pants, Suits, Outerwear
- Women's Fashion: Dresses, Tops, Bottoms, Outerwear
- Kids Fashion: Boys, Girls, Baby
- Footwear: Casual Shoes, Formal Shoes, Sports Shoes
- Accessories: Bags, Jewelry, Watches

### Hardware (5 categories, 14 subcategories)
- Hand Tools: Hammers, Screwdrivers, Wrenches, Measuring Tools
- Power Tools: Drills, Saws, Sanders
- Building Materials: Lumber, Cement & Concrete, Paint & Supplies
- Plumbing: Pipes, Fittings
- Electrical: Wire & Cable, Switches & Outlets

### Grocery (6 categories, 15 subcategories)
- Fresh Produce: Fruits, Vegetables, Herbs
- Meat & Seafood: Beef, Chicken & Poultry, Seafood
- Dairy Products: Milk, Cheese, Yogurt
- Bakery: Bread, Pastries
- Beverages: Soft Drinks, Juices
- Pantry & Canned Goods: Canned Goods, Pasta & Rice

### Restaurant (4 categories, 13 subcategories)
- Appetizers: Salads, Soups, Finger Foods
- Main Courses: Meat Dishes, Seafood, Vegetarian, Pasta
- Desserts: Cakes, Ice Cream
- Beverages: Hot Beverages, Cold Beverages, Alcoholic

## Important Notes

### Categories are Shared by Type
- All businesses of the same `businessType` see the same categories
- Example: All clothing stores see the same 5 clothing categories
- This prevents duplication and ensures consistency

### When to Run
- ✅ After fresh database deployment
- ✅ After creating the first business of a new type
- ❌ Not needed if categories already exist

### Prerequisites
- Database must be migrated (all migrations applied)
- At least one business of each type should exist
- If no business exists for a type, categories will be skipped for that type

## Troubleshooting

### "No business exists yet for type X"
**Problem:** You're trying to seed categories before creating any businesses.

**Solution:** 
1. Create at least one business first (via admin UI or seed script)
2. Then run `npm run seed:categories`

### "Categories already exist"
**Problem:** The script detected existing categories and skipped seeding.

**Solution:** This is normal behavior. Categories only need to be seeded once.

### Duplicate Key Error (P2002)
**Problem:** A category with the same name already exists for that business type.

**Solution:** The script automatically skips duplicates. This is expected behavior.

## Complete Fresh Deployment Workflow

```bash
# 1. Install dependencies
npm install

# 2. Run database migrations
npm run db:deploy

# 3. Generate Prisma client
npm run db:generate

# 4. Create first admin user (if needed)
npm run create-admin

# 5. Seed default categories
npm run seed:categories

# 6. Start the application
npm run build
npm start

# 7. Start sync service (if applicable)
npm run sync-service:start
```

## Related Files

- **Migration:** `prisma/migrations/20251031200000_seed_default_business_categories/migration.sql`
- **Seed Script:** `scripts/seed-type-categories.js`
- **Schema:** `prisma/schema.prisma` (BusinessCategories model)
- **API:** `src/app/api/inventory/[businessId]/categories/route.ts`

## Support

If you encounter issues:
1. Check that all migrations have been applied: `npx prisma migrate status`
2. Verify database connection in `.env` file
3. Check that at least one business exists: `SELECT COUNT(*) FROM businesses;`
4. Review script output for specific error messages
