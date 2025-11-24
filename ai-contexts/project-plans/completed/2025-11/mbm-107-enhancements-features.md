# Feature Development Context: mbm-107 enhancements features

**Ticket:** mbm-107
**Feature:** enhancements features
**Created:** 2025-11-16
**Status:** Planning

---

## 📋 Feature Overview

**Brief Description:**
Create seed data for restaurant menu items with emoji-based inventory. The list includes both individual products (single emoji) and combo menu items (two emojis). Each combo menu item must reference two separate products that exist independently. Products can appear in multiple menu items.

**Detailed Requirements:**
- Maintain emojis as part of product names
- Single emoji = individual product (e.g., ☕ Tea, 🍞 Bread)
- Two emojis = combo menu item that references two products (e.g., ☕🍞 Tea & Bread)
- Example: "☕🍞Tea & Bread" is a combo menu that references ☕Tea and 🍞Bread as separate products
- All pricing defaults to 0 (pricing comes later)
- Non-food items excluded: 🤑Balance BF (Loan and Transfer In handled separately)
- Special revenue items: 💰Loan (borrowed money), 🦚Transfer In (inter-business transfer)
- Service products: 🛜WIFI (sells WiFi access codes with receipt - future 3rd party integration)




☕🍞Tea & Bread
🌭🍟Russain & Chips
💰Loan
🦚Transfer In
🤑Balance BF
🍽️🥩Sadza & Beef
🍽️🐔Sadza & Chicken
🍽️🐟Sadza & Fish
🍚🐔Rice & Chicken
🍚🥩Rice & Beef
🍚🐟Rice & Fish
🧃Revive
🍝🥩Spaghetti & Beef
🍝🐔Spaghetti & Chicken
🥬Vegetables
🥗Salad
🍽️ Sadza
🐟Fish
🍲Beef
🐔Chicken
🍚Rice
🍚🐐Rice & Goat
🍽️🐐Sadza & Goat
🍝🐐Spaghetti & Goat
🍛Curry Rice
🍹Beverages
🍽️🫘Sadza & Beans
🍚🫘Rice & Beans
🍽️🍲Sadza & Gango
🍽️🐓Sadza & Road Runner
🚰Bottled Water
🍚🐓Rice & Road Runner
🍽️🧭Sadza & Guru
🍽️🥛Sadza & Milk
🍽️🐟Sadza & Fish (L)
🍚🐟Rice & Fish (L)
🍽️🍲Sadza & Gango
🐟🍟Fish & Chips
🐔🍟Chicken & Chips
🥩🍟Beef & Chips
🍚🥩Rice & Liver
🍚🥩Rice & Liver
🍪Cookies
🍚🥩Sadza & Liver
🐂Beef Restock
🍟Plain Chips

**Restaurant Expenses:**
The business has certain unique operational expenses. We need to add the following ~60 expense subcategories to the existing "Restaurant" expense domain. These will be organized into logical categories in the `seed-data/expense-types/restaurant-expenses.md` file.

**Expense Subcategories to Add:**

🫑Greens
😋Royco
🛞Mayonnaise
🛜Internet
🥬Cabbage
🙉Other Expenses
🫚Spices
🧅Onions
🦜Transfer Out
🥬Vegetables
🥩Beef
🥚Eggs
🥘Flour
🥗Salad
🤑Salaries & Compensation
🔋Miscellaneous
💸Boss Hwandaza Loan
💵Bills & Subscriptions
💰Loan Repayment
👮Security Services
🐧Licenses & Permits
🐥Broiler
🐟Fish
🐔Chicken
🐓Road Runner
🐐Goat Meat
🧃Revive
🏠Rent
🍹Beverages
🫘🫛 Peas & Beans
🍟Potatoes
🍞Bread
🍅Tomatoes
🌾Rice
🌽Roller Meal
🌭Russian Sausage
🥢Utensils
⛽Fuel & Vehicle Expenses
⚡Utilities
⛽Cooking Gas
🥛Milk
🍳Cooking Oil
🧈Butter
🧄Garlic
🫚Ginger
🥦Broccoli
🥡Takeout Box
🧻Food Wrap Paper
🟩Green Bar Soap
🔥Match Lighter
🧂Salt
🍴Cutlery
💊Medicine
🧼Dish Washer
🚰Portable Water
🧢Shower Hat
🥕Carrots
🥄Spoons
🍝Spaghetti
🔌Electricity
**User Story:**
As a restaurant owner, I want to seed my menu with food items using emojis, so that my inventory system has realistic demo data with visual identifiers.

**Business Value:**
- Provides comprehensive restaurant demo data for testing
- Demonstrates emoji-based product naming in the system
- Enables testing of combo menu items (products that reference other products)
- Allows testing of product relationships and inventory management

---

## ✅ Success Criteria

**Must Have:**
- [ ] All 26 unique single-emoji products created successfully (25 food + 1 WIFI service)
- [ ] 2 special revenue items created (Loan, Transfer In)
- [ ] All 27 combo menu items created successfully
- [ ] Combo items have `isCombo: true` and valid `comboItemsData` JSON
- [ ] All products maintain emojis in their names
- [ ] All pricing defaults to 0
- [ ] Products assigned to appropriate categories (Main Courses, Beverages, Appetizers)
- [ ] Idempotent seeding (can run script multiple times safely)
- [ ] Products created in restaurant demo business (`restaurant-demo-business`)

**Should Have:**
- [ ] SKU generation follows naming convention (RST-ITEMNAME-001)
- [ ] Product attributes include emoji data
- [ ] Default product variants created for each product
- [ ] Test script to verify seeded data

**Won't Have (Out of Scope):**
- Pricing data for menu items (will be added later)
- Product images
- Inventory stock levels for menu items
- 🤑 Balance BF (brought forward balance - excluded)
- Creating new expense domains (using existing "Restaurant" domain)
- WiFi code generation/third-party API integration (future enhancement)

---

## 🎯 Functional Requirements

### Part 1: Menu Items (Inventory Products)

**1. Individual Product Creation (Single Emoji)**
   - Description: Create standalone products with single emoji identifiers
   - Behavior: Each product gets unique SKU, assigned to category, basePrice = 0
   - Products: ☕ Tea, 🍞 Bread, 🌭 Russian, 🍟 Chips, 🍽️ Sadza, 🥩 Beef, 🐔 Chicken, 🐟 Fish, 🍚 Rice, 🧃 Revive, 🍝 Spaghetti, 🥬 Vegetables, 🥗 Salad, 🐐 Goat, 🍛 Curry Rice, 🍹 Beverages, 🫘 Beans, 🍲 Gango, 🐓 Road Runner, 🚰 Bottled Water, 🧭 Guru, 🥛 Milk, 🍪 Cookies, 🐂 Beef Restock, 🥩 Liver, 🛜 WIFI
   - Total: 26 unique products (25 food items + 1 service)
   - Validation: Must have emoji in name, must have unique SKU

**1b. Special Revenue Items (Non-Sales)**
   - Description: Track non-sales revenue sources (loan, inter-business transfers)
   - Behavior: Create as special products in a "Financial/Revenue" category
   - Items:
     - 💰 Loan (borrowed money received)
     - 🦚 Transfer In (money received from another business)
   - Note: 🦜 Transfer Out already exists in expense categories as counter-balance
   - Total: 2 special revenue items
   - Validation: Must have emoji, marked as special transaction types

2. **Combo Menu Item Creation (Two Emojis)**
   - Description: Create menu items that reference two existing products
   - Behavior: Set `isCombo: true`, populate `comboItemsData` with product IDs
   - Combos: ☕🍞 Tea & Bread, 🌭🍟 Russian & Chips, 🍽️🥩 Sadza & Beef, 🍽️🐔 Sadza & Chicken, 🍽️🐟 Sadza & Fish, 🍚🐔 Rice & Chicken, 🍚🥩 Rice & Beef, 🍚🐟 Rice & Fish, 🍝🥩 Spaghetti & Beef, 🍝🐔 Spaghetti & Chicken, 🍚🐐 Rice & Goat, 🍽️🐐 Sadza & Goat, 🍝🐐 Spaghetti & Goat, 🍽️🫘 Sadza & Beans, 🍚🫘 Rice & Beans, 🍽️🍲 Sadza & Gango, 🍽️🐓 Sadza & Road Runner, 🍚🐓 Rice & Road Runner, 🍽️🧭 Sadza & Guru, 🍽️🥛 Sadza & Milk, 🍽️🐟 Sadza & Fish (L), 🍚🐟 Rice & Fish (L), 🐟🍟 Fish & Chips, 🐔🍟 Chicken & Chips, 🥩🍟 Beef & Chips, 🍚🥩 Rice & Liver
   - Total: 27 combo items (duplicates removed)
   - Validation: Both referenced products must exist first

**3. Category Assignment**
   - Main dishes (Sadza, Rice, Spaghetti combos) → Main Courses category
   - Beverages (Tea, Revive, Bottled Water) → Beverages category
   - Sides (Vegetables, Salad, Plain Chips) → Appetizers category
   - Services (WIFI) → Beverages category (or create new "Services" category)
   - Financial/Revenue (Loan, Transfer In) → Create new "Revenue" or "Financial" category

**4. WIFI Service Product**
   - Description: Sell WiFi access codes to customers
   - Behavior: Creates order item, generates receipt with WiFi code placeholder
   - Current Implementation: Simple product sale (no integration)
   - Future Enhancement: Third-party WiFi code generation API integration
   - Category: Services/Beverages
   - Pricing: Default 0 (to be set later)

### Part 2: Restaurant Expense Categories

**1. Expense Subcategory Addition**
   - Description: Add ~60 new expense subcategories to Restaurant expense domain
   - Behavior: Update markdown file, re-run seed script to populate database
   - Categories:
     - Ingredients & Food (35 items): Greens, Cabbage, Beef, Chicken, Fish, Eggs, Flour, Rice, etc.
     - Utilities & Services (5 items): Internet, Electricity, Cooking Gas, Water, Utilities
     - Operating Expenses (9 items): Rent, Salaries, Security, Licenses, Fuel, Loan Repayment, etc.
     - Supplies & Equipment (9 items): Utensils, Cutlery, Takeout Boxes, Soap, Dish Washer, etc.
     - Other (3 items): Other Expenses, Miscellaneous, Medicine
   - Total: ~60 subcategories
   - Validation: Must have emoji, must fit existing restaurant expense domain structure

### User Interface Requirements
- No UI changes required
- Products should display correctly in existing restaurant UI with emojis
- Combo items should be distinguishable from single products

### Data Requirements

**Models/Entities (Part 1 - Menu Items):**
- BusinessProducts (existing table)
- ProductVariants (existing table - create default variant for each product)

**Models/Entities (Part 2 - Expense Categories):**
- ExpenseDomains (existing - use "Restaurant" domain)
- ExpenseCategories (existing - create new categories if needed)
- ExpenseSubcategories (existing - add ~60 new subcategories)

**Fields Used (Menu Items):**
- `name` - Product name with emoji (e.g., "☕ Tea")
- `sku` - Auto-generated (e.g., "RST-TEA-001")
- `businessType` - "restaurant"
- `categoryId` - Reference to existing category
- `basePrice` - 0 (to be set later)
- `costPrice` - 0 (to be set later)
- `isActive` - true
- `isCombo` - false for single products, true for combo items
- `comboItemsData` - JSON with product references for combos
- `attributes` - JSON with emoji metadata

**Relationships:**
- Products belong to categories (existing relationship)
- Combo items reference other products via `comboItemsData` JSON
- Products have variants (one default variant per product)

**Fields Used (Expense Subcategories):**
- `categoryId` - Reference to parent expense category
- `name` - Subcategory name (e.g., "Greens", "Cabbage")
- `emoji` - Emoji identifier (e.g., "🫑", "🥬")
- `isDefault` - false (user-specific categories)
- `isUserCreated` - false (system categories)

**Validation Rules:**
- Product names must contain emojis
- SKUs must be unique
- Combo items must reference valid product IDs
- All products must belong to existing categories
- Expense subcategory names must be unique within a category
- All expense subcategories must have emojis

---

## 🔧 Technical Requirements

### Frontend
- **Framework/Library:** No frontend changes required
- **Display:** Existing restaurant UI should display products with emojis correctly
- **Testing:** Verify emojis render properly in product lists

### Backend

**Part 1 (Menu Items):**
- **Seed Script:** Create `scripts/seed-restaurant-menu-items-mbm107.js`
- **Pattern:** Follow existing seed pattern from `seed-restaurant-demo.js`
- **Idempotency:** Use upsert logic to allow multiple runs
- **Error Handling:** Log errors, continue processing remaining items

**Part 2 (Expense Categories):**
- **Markdown File:** Update `seed-data/expense-types/restaurant-expenses.md`
- **Seed Command:** `npx tsx src/lib/seed-data/expense-categories-seed.ts`
- **Pattern:** Follow markdown format with ### for categories, - for subcategories
- **Idempotency:** Built-in to expense category seed script

### Database
- **Tables Used:**
  - `business_products` - Main product storage
  - `product_variants` - Create default variant for each product
  - `business_categories` - Reference existing categories

- **Schema Fields:**
  - No schema changes required
  - Use existing `isCombo` boolean field
  - Use existing `comboItemsData` JSON field

- **Data Structures:**

**Single Product:**
```javascript
{
  name: "☕ Tea",
  sku: "RST-TEA-001",
  businessType: "restaurant",
  categoryId: "<beverages-category-id>",
  basePrice: 0,
  costPrice: 0,
  isActive: true,
  isCombo: false,
  attributes: {
    emoji: "☕",
    itemType: "beverage"
  }
}
```

**Combo Menu Item:**
```javascript
{
  name: "☕🍞 Tea & Bread",
  sku: "RST-COMBO-TEA-BREAD-001",
  businessType: "restaurant",
  categoryId: "<main-courses-category-id>",
  basePrice: 0,
  costPrice: 0,
  isActive: true,
  isCombo: true,
  comboItemsData: {
    items: [
      { productId: "<tea-product-id>", quantity: 1 },
      { productId: "<bread-product-id>", quantity: 1 }
    ]
  },
  attributes: {
    emojis: ["☕", "🍞"],
    itemType: "combo"
  }
}
```

### SKU Naming Convention
- Single products: `RST-{ITEMNAME}-001` (e.g., RST-TEA-001, RST-BREAD-001)
- Combo items: `RST-COMBO-{ITEM1}-{ITEM2}-001` (e.g., RST-COMBO-TEA-BREAD-001)

---

## 🎨 Design & UX Requirements

**Mockups/Wireframes:**
[Link to designs or describe layout]

**Design System Compliance:**
- Use custom UI hooks (useAlert, useConfirm) instead of browser alerts
- Follow existing design patterns and color schemes
- Maintain consistency with current app styling

**User Flow:**
1. [Step 1 of user journey]
2. [Step 2 of user journey]
3. [Step 3 of user journey]

---

## 🔒 Security & Permissions

**Authentication:**
- [Who can access this feature?]

**Authorization:**
- [What permissions are required?]

**Data Protection:**
- [Any sensitive data handling?]
- [Input validation requirements]
- [XSS/SQL injection prevention]

---

## 🧪 Testing Requirements

**Seed Script Testing:**
- [ ] Run seed script multiple times (verify idempotency)
- [ ] Verify product count: ~25 single products + ~27 combo items = ~52 total
- [ ] Verify all products have emojis in names
- [ ] Verify combo items have `isCombo: true`
- [ ] Verify combo items have valid `comboItemsData` JSON

**Database Verification:**
- [ ] Count products by type (single vs combo):
  ```sql
  SELECT "isCombo", COUNT(*) as count
  FROM business_products
  WHERE "businessId" = 'restaurant-demo-business'
  GROUP BY "isCombo";
  ```
- [ ] Verify combo data:
  ```sql
  SELECT name, "comboItemsData"
  FROM business_products
  WHERE "isCombo" = true
  AND "businessId" = 'restaurant-demo-business';
  ```

**Manual Testing:**
- [ ] Create test script: `scripts/check-restaurant-menu-mbm107.js`
- [ ] List all seeded products grouped by type (single/combo)
- [ ] Display combo item relationships
- [ ] Verify products appear in restaurant UI with emojis
- [ ] Verify category assignments are correct

---

## 📊 Performance & Scalability

**Performance Targets:**
- Page load time: [target]
- API response time: [target]
- Database query optimization: [considerations]

**Scalability Considerations:**
- [How will this scale with more users/data?]

---

## 🚧 Constraints & Dependencies

**Technical Constraints:**
- Must use UTF-8 encoding for emoji support
- Must follow existing seed script patterns
- Cannot modify database schema (use existing fields)

**Dependencies:**
- [x] Existing restaurant demo business (`restaurant-demo-business`)
- [x] Existing restaurant categories (Main Courses, Beverages, Appetizers)
- [x] Existing schema fields: `isCombo`, `comboItemsData`
- [ ] Reference pattern from `scripts/seed-restaurant-demo.js`

**Execution Order:**
- Individual products MUST be created before combo items
- Categories MUST exist before creating products
- Restaurant demo business MUST exist

**Data Integrity:**
- Combo items can only reference products that exist
- Products must have valid category IDs
- SKUs must be unique per business

---

## 📝 Open Questions

~~1. Should non-food items (💰Loan, 🦚Transfer In, 🤑Balance BF) be seeded?~~
   **RESOLVED:** No, exclude from seed data

~~2. How to handle duplicate items (Rice & Liver appears twice, Sadza & Gango appears twice)?~~
   **RESOLVED:** Treat as single item, seed once

3. Should product variants (Small, Regular, Large) be created for each item?
   **DECISION NEEDED:** Default variant only for now, or size variants?

---

## 🔄 Future Enhancements (Post-MVP)

- [Enhancement idea 1]
- [Enhancement idea 2]

---

## 📚 References

**Related Tickets:**
- [Link to related tickets]

**Documentation:**
- [Links to relevant docs]

**Design Assets:**
- [Links to mockups, prototypes]

---

## Notes

**Implementation Files:**
- Create: `scripts/seed-restaurant-menu-items-mbm107.js` - Main seed script
- Create: `scripts/check-restaurant-menu-mbm107.js` - Verification/test script

**Product Counts:**
- 25 unique single-emoji products
- 27 combo menu items (2-emoji combinations)
- Total: 52 products to seed

**Category Mapping:**
- Main dishes (Sadza, Rice, Spaghetti combos) → Main Courses
- Beverages (Tea, Revive, Bottled Water) → Beverages
- Sides (Vegetables, Salad, Plain Chips) → Appetizers

**Risk Mitigation:**
- Emoji encoding: Use UTF-8, test with actual emojis
- Duplicate products: Use upsert logic with unique SKUs
- Missing categories: Auto-seed if missing (follow existing pattern)
- Invalid combo references: Create all individual products first

**Rollback Plan:**
If seeding fails, delete products with SKU pattern `RST-*` from restaurant-demo-business:
```javascript
await prisma.businessProducts.deleteMany({
  where: {
    businessId: 'restaurant-demo-business',
    sku: { startsWith: 'RST-' }
  }
});
```

**Implementation Notes:**
- Part 1 and Part 2 are independent and can be done in any order
- Expense categories are global (not business-specific)
- Menu items are business-specific (restaurant demo business)
- Both parts use emoji-based naming for consistency

**Revenue Tracking:**
- 💰 Loan: Money received as borrowed funds (income)
- 🦚 Transfer In: Money received from another business (income)
- 🦜 Transfer Out: Money sent to another business (expense - already in expense categories)

**Service Products:**
- 🛜 WIFI: Sells WiFi access with receipt code (future: 3rd party integration)

**Last Synced:** 2025-11-16 (Added expense categories, WIFI service, revenue items)
