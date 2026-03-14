# Admin Seed Buttons — Reference Guide

All seed buttons are on the `/admin` page. Most use the **AdminSeedPromptModal** (confirmation handled automatically). A few have inline confirmation text boxes.

---

## Quick Reference

| Button | Section | What it seeds | Safe to re-run |
|--------|---------|---------------|:-:|
| 🎯 Seed Complete Demo | Developer Seeds | All 4 businesses + all features | ✅ |
| Seed Reference Data | Developer Seeds (blue) | ID formats, job titles, comp types, benefits | ✅ |
| Seed Restaurant Demo | Developer Seeds | Restaurant business + products | ✅ |
| Seed Grocery Demo | Developer Seeds | Grocery business + products | ✅ |
| Seed Hardware Demo | Developer Seeds | Hardware business + 50 products | ✅ |
| Seed Clothing Demo | Developer Seeds | Clothing business + products | ✅ |
| Seed Clothing Bales | Developer Seeds | 12 bale categories + 12 demo bales | ✅ |
| Seed Attendance (90 days) | Developer Seeds | 90 days of attendance for all demo employees | ✅ |
| Seed Contractors Demo | Developer Seeds | Construction/contractor business | ✅ |
| Seed Realistic Employees | Developer Seeds | Full employee roster across all businesses | ✅ |
| Create Dev Seed | Developer Seeds | Vehicles, drivers, maintenance records | ✅ |
| Seed Test Data | Developer Seeds (blue) | Generic test businesses (non-demo IDs) | ✅ |
| Create Admin User | Developer Seeds (blue) | admin@business.local account | ✅ |
| Regenerate Contract PDFs | Developer Seeds | Rebuilds PDF data for seeded contracts | ✅ |
| Remove Dev Seed | Developer Seeds | Deletes dev-seed businesses/data | ⚠️ |
| Unseed Restaurant Demo | Developer Seeds | Deletes restaurant demo business | ⚠️ |
| Unseed Grocery Demo | Developer Seeds | Deletes grocery demo business | ⚠️ |
| Unseed Hardware Demo | Developer Seeds | Deletes hardware demo business | ⚠️ |
| Unseed Clothing Demo | Developer Seeds | Deletes clothing demo business | ⚠️ |
| Unseed Contractors Demo | Developer Seeds | Deletes contractors demo data | ⚠️ |
| Sanitize WiFi Tokens | WiFi Token Maintenance | Disables tokens not on ESP32 device | ⚠️ |
| Reset Today's Clock-In | Clock-In Data Reset | Deletes today's attendance records | ⚠️ |
| Reset All Attendance | Clock-In Data Reset | Deletes ALL attendance history | 🔴 |

---

## Recommended Seeding Order (fresh install)

```
1. Seed Reference Data          ← must be first (job titles, comp types, etc.)
2. 🎯 Seed Complete Demo        ← creates all businesses + employees + financial data in one go
   -- OR run individually --
2a. Seed Restaurant Demo
2b. Seed Grocery Demo
2c. Seed Hardware Demo
2d. Seed Clothing Demo
2e. Seed Clothing Bales         ← bale stock for the clothing business
2f. Seed Contractors Demo
2g. Seed Realistic Employees
2h. Seed Attendance (90 days)   ← clock-in history for all demo employees
2i. Seed Customers Demo         ← customers for all businesses + links orders to customers
2j. Seed Meal Program           ← restaurant employee meal program (participants + 60-day transactions)
2k. Seed Promo Campaigns        ← promotional campaigns + rewards for all businesses
3. Regenerate Contract PDFs     ← optional, rebuilds PDF data for contracts
```

---

## Button Details

### 🎯 Seed Complete Demo
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-complete-demo`

The master seed. Runs all business + feature seeds in sequence:

| Step | Script | Required |
|------|--------|:--------:|
| Restaurant business | `seed-restaurant-demo.js` | ✅ |
| Grocery business | `seed-grocery-demo.js` | ✅ |
| Hardware business | `seed-hardware-demo.js` | ✅ |
| Clothing business | `seed-clothing-demo.js` | ✅ |
| Demo employees | `seed-demo-employees.js` | ✅ |
| Sales orders | `seed-sales-orders-all-businesses.js` | optional |
| Expense accounts | `seed-demo-expense-accounts.js` | optional |
| Business expenses | `seed-demo-business-expenses.js` | optional |
| Demo customers | `seed-demo-customers-all-businesses.js` | optional |
| Meal program | `seed-meal-program-demo.js` | optional |
| Promo campaigns | `seed-promo-campaigns-demo.js` | optional |
| ESP32 WiFi tokens | `seed-esp32-tokens-demo.js` | optional |
| R710 WiFi tokens | `seed-r710-tokens-demo.js` | optional |
| Printers | `seed-printers-demo.js` | optional |
| Thermal printer settings | `seed-thermal-printer-settings-demo.js` | optional |
| Payroll accounts | `seed-payroll-accounts-demo.js` | optional |
| Payroll periods | `seed-payroll-demo.js` | optional |
| Employee benefits | `seed-employee-benefits-demo.js` | optional |
| Employee loans | `seed-employee-loans-demo.js` | optional |
| Leave management | `seed-leave-management-demo.js` | optional |
| Salary increases | `seed-salary-increases-demo.js` | optional |
| Construction projects | `seed-construction-projects-demo.js` | optional |

Optional steps are skipped on failure and don't abort the run. Required steps will abort on failure.

---

### Seed Reference Data
**Location:** Developer Seeds (blue card) — requires typing `SEED REFERENCE DATA`
**Endpoint:** `POST /api/admin/seed-reference-data`
**Script:** `seed-all-employee-data.js`

Creates the 89 essential records that every business depends on:
- ID format templates (National ID, Employee ID, etc.)
- Job titles (Manager, Sales Associate, Driver, etc.)
- Compensation types (Monthly salary, Hourly, Commission, etc.)
- Benefit types (Medical aid, Pension, Housing allowance, etc.)

**Run this first** on any fresh install or after a full data reset.

---

### Seed Restaurant Demo
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-restaurant`
**Business ID:** `restaurant-demo-business`

Creates:
- Restaurant demo business + business account + expense account
- 101 menu items across 14 categories (Appetizers, Main Courses, Sides, Salads, Soups, Desserts, Beverages, Breakfast, Lunch, Dinner, Seafood, Vegetarian, Vegan, Specials)
- Realistic USD pricing ($0.80 bottled water → $22.00 family deal)
- Zimbabwe local dishes (Sadza, Road Runner, Rice & Goat, Russian sausage, etc.)
- Suppliers

---

### Seed Grocery Demo
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-grocery`
**Business ID:** `grocery-demo-1` (and `grocery-demo-2`)

Creates grocery demo businesses with products, stock, and suppliers.

---

### Seed Hardware Demo
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-hardware`
**Business ID:** `hardware-demo-business`

Creates:
- Hardware demo business + accounts
- **50 products** across all 5 predefined hardware categories:
  - **Hand Tools** (13 items) — hammers, screwdrivers, wrenches, tape measures, sockets, etc.
  - **Power Tools** (8 items) — cordless drills, circular saw, jigsaw, angle grinder, generator, etc.
  - **Building Materials** (9 items) — cement, paint, plywood, nails, caulk, sandpaper, etc.
  - **Plumbing** (8 items) — PVC pipes (20mm, 32mm), elbows, tees, ball valves, taps, PTFE tape, etc.
  - **Electrical** (12 items) — wire (2.5mm², 6mm²), switches, sockets, LED bulbs, MCBs, extension leads
- Single supplier: BuildPro Hardware Wholesale
- All variants idempotent (stable SKU: `{sku}-STD`)

---

### Seed Clothing Demo
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-clothing`
**Business ID:** `clothing-demo-business`

Creates:
- Clothing demo business + accounts
- 7 hero products with multiple size/colour variants
- Barcodes for all products and variants
- Suppliers (Fashion Forward Imports, Quality Fabrics Co, Accessory Warehouse)

> **Tip:** After seeding clothing, use the **Seed Clothing Bales** button to add bale stock data.

---

### Seed Clothing Bales
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-clothing-bales`
**Script:** `seed-clothing-bales-demo.js`

Seeds bale stock data for the clothing demo business. Requires the clothing business to exist (run **Seed Clothing Demo** first).

Creates:
- **12 bale categories** — Ladies T-Shirts, Gents Jeans, Kids Mixed Clothing, Ladies Dresses, Gents Shirts, Ladies Skirts, Baby Wear, Gents Trousers, Ladies Jackets & Coats, Gents Suits, Mixed Shoes, Ladies Jeans
- **12 bales** with realistic unit prices ($1.50–$18/item), cost prices, item counts, remaining stock (partially sold), and 2 BOGO deals (Kids Mixed 3-for-deal, Baby Wear 5-for-deal)

---

### Seed Attendance (90 days)
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-attendance`
**Script:** `seed-attendance-demo.js`

Generates 90 days of clock-in/clock-out attendance records for all demo employees. Requires demo employees to exist first.

- **Mon–Fri** for all employees
- **Saturdays** for retail businesses (restaurant, clothing, grocery) — 60% chance, 8am–1pm half-day
- Natural variation: ~2.5% absent, ~1.5% leave, ~2% half-day, ~8% late arrival, remainder normal
- Clock-in: 7:50–8:10 AM Zimbabwe time; Clock-out: 5:00–5:25 PM
- **Deterministic** — running it twice produces the same records (no random drift on re-run)

---

### Seed Customers Demo
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-customers`
**Script:** `seed-demo-customers-all-businesses.js`

Creates customer profiles for all 4 demo businesses + links ~40% of existing completed orders to those customers and updates `totalSpent` per customer:
- **Restaurant:** 30 customers — 5 VIP, 20 Regular, 5 New
- **Grocery:** 25 customers — 3 VIP, 4 Wholesale, 11 Regular, 7 New
- **Hardware:** 15 customers — 2 VIP, 4 Contractor, 4 Wholesale, 3 Regular, 2 New
- **Clothing:** 20 customers — 3 VIP, 12 Regular, 5 New

Zimbabwe names, local phone numbers, realistic loyalty points. VIP customers get proportionally more orders linked to them.

> **Dependency:** Run after `Seed Sales Orders` (via complete demo) so there are orders to link.

---

### Seed Meal Program
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-meal-program`
**Script:** `seed-meal-program-demo.js`

Restaurant only — seeds the employee meal subsidy program:
- Registers all restaurant demo employees as `MealProgramParticipants`
- Marks 4 items as eligible (Garlic Bread, Soup of the Day, Caesar Salad, Coca-Cola)
- Generates **60 days** of meal transactions (Mon–Fri, ~85% daily attendance)
- Each meal = 1 `BusinessOrder` (COMPLETED) + 1 `MealProgramTransaction` with $0.50 subsidy
- Subsidy charges deducted from the restaurant's expense account

> **Dependency:** Run after `Seed Restaurant Demo` and `Seed Demo Employees`.

---

### Seed Promo Campaigns
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-promo-campaigns`
**Script:** `seed-promo-campaigns-demo.js`

Creates promotional campaigns and issues `CustomerRewards` to qualifying customers across all 4 businesses:

| Business | Campaigns | Thresholds |
|----------|-----------|-----------|
| Restaurant | Loyal Diner ($5 credit), VIP Feast ($20 credit) | Spend $50 / $150 |
| Grocery | Regular Shopper ($8 credit), Bulk Buyer ($25 credit) | Spend $80 / $200 |
| Hardware | Trade Discount ($10 credit) | Spend $100 |
| Clothing | Fashion Reward ($6 credit), Style VIP ($15 credit) | Spend $60 / $120 |

~30% of issued rewards are marked as already REDEEMED with a past redemption date.

> **Dependency:** Run after `Seed Customers Demo` (requires customers with `totalSpent` populated).

---

### Seed Contractors Demo
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-contractors`

Creates construction/contractor demo data including contractors, projects, and contract data.

---

### Seed Realistic Employees
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-realistic-employees`
**Script:** `seed-realistic-employees-complete.js`

Creates a full employee roster across all demo businesses with:
- Realistic names, employee numbers, national IDs
- User accounts linked to employees
- Role-based permissions per business type

---

### Create Dev Seed
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/seed-dev-data`
**Script:** `seed-dev-data.js`

Seeds vehicles, drivers, and maintenance records for vehicle management testing. Not related to the main business demos — this is for the Vehicles module specifically.

---

### Seed Test Data
**Location:** Developer Seeds (blue card) — requires typing `CREATE TEST DATA`
**Endpoint:** `POST /api/admin/seed-test-data`

Creates 4 generic test businesses with non-demo IDs:
- TechCorp Solutions (construction)
- Savanna Restaurant (restaurant)
- Green Grocers (grocery)
- Fashion Forward (clothing)

Unlike the individual demo seeds, these use auto-generated IDs and are not stable across resets. **Use the individual demo seeds instead for consistent demo data.**

---

### Create Admin User
**Location:** Developer Seeds (blue card) — requires typing `CREATE ADMIN USER`
**Endpoint:** `POST /api/admin/create-admin`

Creates or resets the default admin account:
- **Email:** `admin@business.local`
- **Password:** `admin123`

Use this on fresh installs or if the admin account is lost. Safe to run again — it upserts the account.

---

### Regenerate Contract PDFs
**Location:** Developer Seeds (green card)
**Endpoint:** `POST /api/admin/regenerate-contract-pdfs`

Rebuilds the `pdfGenerationData` JSON for seeded contracts (employee numbers `EMP001`–`EMP004`, `EMP1009`). Run this after changing contract templates or if contract PDFs are missing data.

---

## Unseed Buttons

All unseed buttons use the same modal confirmation flow and **permanently delete** the demo business and all its associated data (products, orders, employees, accounts, etc.).

| Button | Endpoint | Deletes |
|--------|----------|---------|
| Unseed Restaurant Demo | `/api/admin/unseed-restaurant` | `restaurant-demo-business` and all related data |
| Unseed Grocery Demo | `/api/admin/unseed-grocery` | Grocery demo businesses and all related data |
| Unseed Hardware Demo | `/api/admin/unseed-hardware` | `hardware-demo-business` and all related data |
| Unseed Clothing Demo | `/api/admin/unseed-clothing` | `clothing-demo-business` and all related data |
| Unseed Contractors Demo | `/api/admin/unseed-contractors` | Contractors/construction demo data |
| Remove Dev Seed | `/api/admin/cleanup-dev-data` | All data created by Create Dev Seed (vehicles, drivers, etc.) |

> ⚠️ These are not reversible. You will need to re-run the corresponding Seed button to restore the data.

---

## Other Buttons

### Sanitize WiFi Tokens
**Location:** WiFi Token Maintenance card (system admin only)
**Endpoint:** `POST /api/wifi-portal/admin/sanitize-tokens`

Iterates all WiFi tokens across all businesses, checks each one against the ESP32 device, and disables any token that is not found on the device. Prevents selling tokens that cannot be redeemed. Safe to run at any time but only useful if ESP32 hardware is connected.

---

### Reset Today's Clock-In Records
**Location:** Clock-In Data Reset card
**Endpoint:** `POST /api/admin/reset-clock-in` `{ scope: "today" }`

Deletes all `EmployeeAttendance` records for today. Useful during testing when you want to re-run a clock-in demo from scratch for the current day.

---

### Reset All Attendance Records
**Location:** Clock-In Data Reset card — requires typing `RESET ALL ATTENDANCE`
**Endpoint:** `POST /api/admin/reset-clock-in` `{ scope: "all" }`

🔴 **Destructive.** Deletes all attendance history and any clock-in-linked payroll adjustments. Use only in test/dev environments to reset the attendance module completely.

---

## Command-Line Equivalents

These seeds are also available as npm scripts for direct terminal use:

```bash
npm run seed:categories          # Reference data (type-level categories)
npm run seed:expense-flat        # Expense categories
npm run seed:clothing-bales      # Clothing bale categories + 12 demo bales
npm run seed:hardware            # Hardware demo business + 50 products
npm run seed:attendance          # 90 days of realistic attendance for demo employees
npm run seed:sales-orders        # Demo sales orders for all businesses
npm run seed:customers           # 90 customers across 4 businesses + order linking
npm run seed:meal-program        # Restaurant meal program (participants + 60-day transactions)
npm run seed:promo-campaigns     # Promotional campaigns + rewards for all businesses
npm run seed:all                 # Employee reference data (seed-all-employee-data.js)
```

All of the above also have corresponding admin UI buttons on the `/admin` page.
