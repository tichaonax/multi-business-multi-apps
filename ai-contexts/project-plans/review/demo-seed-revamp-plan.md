# Demo Seed Data Revamp Plan — v2
**Date:** 2026-02-28
**Status:** DRAFT — Awaiting Review Before Implementation

---

## 1. Executive Summary

The existing demo seed data is shallow, inconsistent, and missing entire layers needed for realistic testing. This plan creates **five fully-fledged demo companies** (plus an umbrella/parent entity) with realistic rosters, hierarchies, financials, suppliers, contractors, customers, and operating data — all resettable and reseedable at any time via a single admin action.

**Core goals:**
- Every business has a complete management hierarchy (owner/director → department managers → supervisors → staff)
- All new DB columns (contract schedule fields, `EmployeeLoginLog`, payroll OT types) are seeded
- Suppliers, contractors, and customers are realistic with transaction history
- Expense accounts reflect real operating costs with proper payment categories
- A stable, idempotent reset/reseed system using prefixed demo IDs
- Full vehicle/driver module coverage across applicable businesses
- Each business can be individually seeded or reset

---

## 2. Demo Companies

| # | Business Name | Type | Demo ID Prefix |
|---|---|---|---|
| 0 | **Umbrella Holdings (Pvt) Ltd** | `umbrella` | `demo-umb-` |
| 1 | **The Grand Café** | `restaurant` | `demo-rest-` |
| 2 | **FreshMart Grocery** | `grocery` | `demo-groc-` |
| 3 | **Urban Threads Clothing** | `clothing` | `demo-clth-` |
| 4 | **BuildPro Hardware** | `hardware` | `demo-hdwr-` |
| 5 | **ProServices Group** | `services` | `demo-svc-` |

> All demo records use these stable prefixes for their IDs, making targeted reset trivial.

---

## 3. Reset / Reseed Architecture

### 3.1 Idempotent Design Principles
- Every seeded record has an ID that starts with its business's demo prefix (e.g., `demo-rest-emp-001`)
- Seed scripts use `upsert` (not `create`) so re-running doesn't duplicate
- Scripts accept a `--businessId` flag to seed/reset one business at a time
- Ordering is enforced via the orchestrator (businesses must exist before employees, etc.)

### 3.2 Reset Mechanism

**Admin API: `POST /api/admin/demo/reset`**
Body: `{ scope: 'all' | 'restaurant' | 'grocery' | 'clothing' | 'hardware' | 'services', confirm: true }`

Deletion order (reverse of dependency):
```
1. EmployeeLoginLog (demo employees)
2. EmployeeAttendance (demo employees)
3. PayrollAdjustments → PayrollEntryBenefits → PayrollEntries → PayrollPeriods
4. CustomerLaybyPayment → CustomerLayby
5. BusinessStockMovements
6. BusinessOrderItems → BusinessOrders
7. VehicleExpenses → VehicleMaintenanceRecords → VehicleTrips → VehicleDrivers → VehicleLicenses → Vehicles
8. ProjectContractors → ConstructionExpenses → ProjectTransactions → ProjectStages → Projects
9. ContractBenefits → ContractRenewals → EmployeeContracts
10. EmployeeLeaveRequests → EmployeeLeaveBalance
11. EmployeeLoanPayments → EmployeeLoans
12. EmployeeBenefits → EmployeeBonuses → EmployeeDeductions → EmployeeAllowances
13. EmployeeBusinessAssignments → Employees (deletes Users for demo employees too)
14. BusinessCustomers
15. ExpenseAccountPayments → ExpenseAccountDeposits → ExpenseAccountLoans → ExpenseAccounts
16. InterBusinessLoans
17. BusinessSuppliers
18. ProductImages → ProductBarcodes → ProductVariants → BusinessStockMovements → BusinessProducts
19. BusinessCategories
20. Businesses (demo businesses only, preserves umbrella)
```

**Admin API: `POST /api/admin/demo/reseed`**
Body: `{ scope: 'all' | businessType, features: ['all'] | [...specific features] }`

Runs seed scripts in the correct dependency order (see Section 11).

### 3.3 Admin UI Panel

A seed management page at `/admin/demo-data` with:
- **Status cards** per business: shows record counts (employees, products, orders, attendance, etc.)
- **Seed** button (individual business or all)
- **Reset** button (individual or all, requires typing "RESET" to confirm)
- **Reset & Reseed** combo button
- **Feature toggles**: WiFi / Payroll / HR / Vehicles / Attendance / Login Logs / Layby
- **Date range**: Attendance and orders history depth (7 / 14 / 30 / 45 days)

---

## 4. The Grand Café (Restaurant)

### 4.1 Employee Roster — 15 employees

**Management Tier (4):**

| ID | Name | Role / Job Title | Salary/month | Schedule | System User |
|---|---|---|---|---|---|
| `demo-rest-emp-001` | Marco Rossi | General Manager | $850 | Mon–Sat 07:00–17:00 (6 days) | Yes — manager role |
| `demo-rest-emp-002` | Sandra Ncube | Operations Supervisor | $620 | Mon–Sat 08:00–18:00 (6 days) | Yes — manager role |
| `demo-rest-emp-003` | Tendai Mhaka | Head Chef | $700 | Tue–Sun 05:30–15:30 (6 days) | No |
| `demo-rest-emp-004` | Priya Sharma | Sous Chef | $580 | Tue–Sun 06:00–16:00 (6 days) | No |

**Operations Tier (8):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-rest-emp-005` | Farai Dube | Senior Cook | $420 | Tue–Sun 06:00–15:00 |
| `demo-rest-emp-006` | Blessing Chimuka | Cook | $380 | Wed–Mon 06:00–15:00 |
| `demo-rest-emp-007` | Gift Chidemo | Senior Waiter | $350 | Wed–Mon 10:00–20:00 |
| `demo-rest-emp-008` | Rudo Mutasa | Waitress | $320 | Wed–Mon 11:00–21:00 |
| `demo-rest-emp-009` | Rutendo Chikwanda | Cashier | $310 | Mon–Sat 07:00–16:00 |
| `demo-rest-emp-010` | Charmaine Dube | Barista | $330 | Mon–Sat 06:00–15:00 |
| `demo-rest-emp-011` | Agnes Mpofu | Kitchen Assistant | $280 | Tue–Sun 06:00–14:00 |
| `demo-rest-emp-012` | Solomon Nyoni | Kitchen Porter | $250 | Mon–Sat 05:00–13:00 |

**Support Tier (3):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-rest-emp-013` | Tapiwa Moyo | Cleaner | $220 | Mon–Sat 05:00–09:00 + 20:00–22:00 |
| `demo-rest-emp-014` | Jealousy Banda | Security Guard | $280 | Mon–Sun 06:00–18:00 (7 days, rotating) |
| `demo-rest-emp-015` | Miriam Zvobgo | Store/Delivery Driver | $300 | Mon–Sat 07:00–16:00 (vehicle driver) |

**Contracts:** All 15 with `workDaysPerWeek`, `dailyStartTime`, `dailyEndTime`, `annualVacationDays=14`, schedule data in `pdfGenerationData`.

---

### 4.2 Suppliers (6)

| Supplier | Contact | What They Supply | Payment Terms | Credit Limit |
|---|---|---|---|---|
| Sunrise Fresh Produce | Gideon Mufunda, 0771-234567 | Vegetables, fruit, herbs | Net 7 days | $500 |
| Metro Meats Wholesale | Tapiwa Chigodora, 0782-345678 | Beef, chicken, pork, fish | COD | $800 |
| Continental Beverage Co | Patricia Banda, 0773-456789 | Soft drinks, juices, water, coffee | Net 14 days | $1,200 |
| ZimDairy Distributors | Charles Mutete, 0712-567890 | Milk, cream, cheese, butter, eggs | Net 7 days | $600 |
| Savanna Bakery Supplies | Ruth Zimba, 0774-678901 | Bread flour, pastry supplies, sugar | Net 14 days | $700 |
| Kitchen Essentials Ltd | Andrew Nkosi, 0733-789012 | Cooking oil, condiments, spices, packaging | Net 30 days | $1,000 |

**Supplier payment history (last 30 days):** 3–6 purchases per supplier with matching `ExpenseAccountPayments` to the Operating Expenses account.

---

### 4.3 Contractors (Persons — 4)

| Person | Company | Service | Rate | Contract |
|---|---|---|---|---|
| `demo-rest-per-001` | CleanMaster Services — Sipho Dlamini | Commercial kitchen deep-clean | $350/month retainer | Monthly |
| `demo-rest-per-002` | ProPest Control — Francis Chirwa | Pest control | $120/quarter | Quarterly |
| `demo-rest-per-003` | CoolEquip Maintenance — Isaac Murambe | Refrigeration & kitchen equipment service | $200/quarter | Quarterly |
| `demo-rest-per-004` | ArtWork Studio — Nomsa Sithole | Menu design, social media graphics | $150/project | Project |

Linked via `ProjectContractors` to a **"Restaurant Operations"** project under The Grand Café.

---

### 4.4 Customers (12)

| Customer | Type | Notes |
|---|---|---|
| Walk-in Customer | INDIVIDUAL | Default for POS sales |
| Tendai Zvobgo | INDIVIDUAL | Regular; has active layby (cutlery set from gift shop) |
| Blessed Mpofu | INDIVIDUAL | Regular; loyalty points accumulated |
| Sunrise School | CORPORATE | Weekly catering order; 5% discount |
| City Events Co | CORPORATE | Event catering; monthly invoice |
| Grace Chikwanda | INDIVIDUAL | Has completed layby |
| *(+7 more regular individuals)* | INDIVIDUAL | Various loyalty point balances |

**Layby records (3):**
- Tendai Zvobgo: $45 total, $15 deposit paid, 2 more installments of $15
- Grace Chikwanda: $30 total, fully paid, items collected (COMPLETED)
- Sunrise School: $120 catering deposit, balance pending event date

---

### 4.5 Expense Accounts (5)

| Account | Number | Balance | Purpose |
|---|---|---|---|
| Operating Expenses | `EXP-REST-OPS` | $3,500 | Rent, utilities, licensing fees |
| Petty Cash | `EXP-REST-PTTY` | $450 | Day-to-day small purchases, staff taxis |
| Vehicle Account | `EXP-REST-VEH` | $800 | Fuel, vehicle maintenance for delivery van |
| Marketing & Promotions | `EXP-REST-MKT` | $600 | Flyers, social media, promotions |
| Staff Welfare | `EXP-REST-WELF` | $350 | Staff meals, uniforms, medical |

**Expense payment history (last 30 days) per account:**
- Operating: Monthly rent ($1,200), electricity ($380), water ($95), internet ($85), gas ($220), liquor license ($150)
- Petty Cash: Taxi receipts ($15–45 each, 8 entries), cleaning supplies ($85), light bulbs ($32), misc stationery ($28)
- Vehicle: Fuel × 12 receipts ($35–65 each), insurance ($120/month), 1 tyre replacement ($85)
- Marketing: Facebook ads ($180), printed menus ($95), loyalty card printing ($65)
- Staff Welfare: Staff meals allowance ($210), 2 uniform purchases ($95 each), 1 medical claim ($120)

**InterBusinessLoan:** Umbrella Holdings → Grand Café: $5,000 at 0% interest (working capital loan, status=active, $3,200 remaining)

---

### 4.6 Menu Products (50 items)

| Category | Items |
|---|---|
| Breakfast | Full English Breakfast $5.50, Omelette (Cheese/Veg/Meat) $4.50, Pancakes with syrup $3.50, French Toast $4.00, Fruit Bowl $3.00, Avocado Toast $4.50, Croissant & Butter $2.50 |
| Soups & Starters | Tomato Soup $3.50, Chicken Soup $4.00, Bruschetta $3.50, Garlic Bread $2.00, Spring Rolls (4) $4.50 |
| Mains — Lunch | Grilled Chicken & Chips $7.50, Beef Burger & Chips $8.00, Fish & Chips $8.50, Vegetable Curry & Rice $6.50, Caesar Salad $5.50, Club Sandwich $6.00, Pasta Bolognaise $7.00 |
| Mains — Dinner | T-Bone Steak $14.00, Grilled Salmon $12.00, Roast Lamb $13.00, Prawn Stir-Fry $11.50, Pasta Carbonara $9.00, Chicken Peri-Peri $10.00, Beef Ribs $13.50 |
| Sides | Chips/Fries $2.50, Garden Salad $2.50, Coleslaw $2.00, Onion Rings $2.50, Steamed Veg $2.00 |
| Beverages | Espresso $1.50, Cappuccino $2.00, Latte $2.20, Tea (various) $1.20, Fresh Orange Juice $2.50, Coke/Fanta/Sprite $1.50, Milkshake $3.50, Water 500ml $0.80, Sparkling Water $1.20 |
| Desserts | Chocolate Lava Cake $4.50, Cheesecake slice $3.50, Ice Cream (2 scoops) $2.50, Fruit Salad $3.00, Malva Pudding $4.00 |
| WiFi Tokens | 1 Hour $1.00, 2 Hours $1.80, Day Pass $4.50 |

**Menu Combos:** Breakfast Combo (Full English + Coffee) $7.00, Lunch Combo (Main + Juice) $9.50, Family Deal (2 Mains + 2 Sides + 2 Drinks) $22.00

**Orders (45 days):** ~25 orders/day weekdays, ~40 orders/day weekends. Total ~1,300 orders.

---

### 4.7 Attendance & Payroll

**Attendance (last 30 days):** All 15 staff
- Marco (Manager): Always on time or early. No OT (management)
- Sandra (Supervisor): On time. 2 late incidents (8 min, 12 min) = 2 deductions
- Tendai (Head Chef): Arrives 5:20am most days → consistent 10-min OT credit. 2 days >30 min OT (45 min, 60 min) → 1.5× OT
- Gift (Senior Waiter): 3 late arrivals (late lunch rush, 15 min each). 1 absent day
- Tapiwa (Cleaner): Clocks out 20 min early on Fridays × 4 = 4 deduction adjustments
- Jealousy (Security): 7-day rotation → overtime from scheduled 6-day contract

**Payroll Periods:**
- **Last month:** `closed/paid` — all adjustments approved, shows net pay
- **Current month (draft):** 15 days synced — pending OT approvals visible
- **Vacation payout:** Tendai Mhaka's contract ending → `vacation_payout` adjustment pending

**Benefits per employee:**
- All: Medical Aid contribution $45/month (employer), Meal Allowance $2.50/shift
- Management: Pension Fund $60/month
- Drivers: Vehicle Allowance $80/month

---

## 5. FreshMart Grocery

### 5.1 Employee Roster — 18 employees

**Management Tier (4):**

| ID | Name | Role | Salary/month | Schedule | System User |
|---|---|---|---|---|---|
| `demo-groc-emp-001` | Dorothy Sibanda | Store Manager | $900 | Mon–Sat 07:00–17:00 | Yes |
| `demo-groc-emp-002` | Charles Banda | Deputy Manager | $720 | Tue–Sun 07:00–17:00 | Yes |
| `demo-groc-emp-003` | Loveness Dube | Head Cashier / Finance | $580 | Mon–Sat 07:00–16:00 | No |
| `demo-groc-emp-004` | Arnold Mutasa | Stock & Receiving Manager | $540 | Mon–Fri 06:00–15:00 | No |

**Operations Tier (11):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-groc-emp-005` | Tatenda Zvobgo | Cashier | $330 | Mon–Sat 08:00–17:00 |
| `demo-groc-emp-006` | Chipo Makoni | Cashier | $330 | Tue–Sun 08:00–17:00 |
| `demo-groc-emp-007` | Ruvimbo Chikosi | Cashier (Part-time) | $220 | Wed–Sat 09:00–17:00 |
| `demo-groc-emp-008` | Peter Nyamhunga | Produce Manager | $420 | Mon–Fri 05:00–14:00 |
| `demo-groc-emp-009` | Ruth Murambwe | Dairy & Frozen Section | $360 | Mon–Sat 06:00–15:00 |
| `demo-groc-emp-010` | Solomon Ncube | Butcher | $440 | Tue–Sun 05:30–14:30 |
| `demo-groc-emp-011` | Faith Chimuka | Baker / Deli | $400 | Mon–Sat 04:00–13:00 |
| `demo-groc-emp-012` | Mercy Chikwanda | Shelf Packer (day) | $280 | Mon–Sat 08:00–16:00 |
| `demo-groc-emp-013` | Lawrence Dube | Shelf Packer (night) | $310 | Mon–Sat 14:00–22:00 |
| `demo-groc-emp-014` | Brighton Chihuri | Delivery Driver | $350 | Mon–Sat 07:00–16:00 (driver) |
| `demo-groc-emp-015` | Patrick Mhuru | Delivery Driver | $350 | Tue–Sun 07:00–16:00 (driver) |

**Support Tier (3):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-groc-emp-016` | James Mpofu | Security (Day) | $300 | Mon–Sun 06:00–18:00 (7 days) |
| `demo-groc-emp-017` | Walter Zimba | Security (Night) | $300 | Mon–Sun 18:00–06:00 (rotating) |
| `demo-groc-emp-018` | Grace Zvobgo | Cleaner | $230 | Mon–Sat 05:00–08:00 |

---

### 5.2 Suppliers (7)

| Supplier | Contact | Supply | Terms | Credit Limit |
|---|---|---|---|---|
| Sunrise Fresh Produce | Gideon Mufunda | Fruit, vegetables, herbs | Net 2 days (fresh) | $1,500 |
| National Dairy Co | Sheila Ndlovu | Milk, cream, cheese, eggs, yoghurt | Net 7 days | $2,000 |
| Metro Meats Wholesale | Tapiwa Chigodora | Beef, pork, chicken, fish | COD | $2,500 |
| Mega Wholesale Ltd | Joseph Mwangi | Rice, maize meal, oil, sugar, canned goods | Net 30 days | $5,000 |
| Continental Beverage Co | Patricia Banda | Soft drinks, juices, water, energy drinks | Net 14 days | $3,000 |
| HygieneHome Distributors | Simba Chuma | Cleaning products, household items, toiletries | Net 30 days | $2,000 |
| ZimBakery Supplies | Faith Ncube | Bread flour, yeast, pastry supplies | Net 7 days | $800 |

**Product-to-supplier mapping:** Every product category links to at least one supplier. Stock movements reference supplier for restocking entries.

---

### 5.3 Contractors (Persons — 4)

| Person | Company | Service | Rate |
|---|---|---|---|
| `demo-groc-per-001` | CoolTech Refrigeration — Isaac Mlambo | Fridge/freezer maintenance | $280/quarter |
| `demo-groc-per-002` | CleanMaster Services — Sipho Dlamini | Floor polishing, deep clean | $420/month |
| `demo-groc-per-003` | SafeGuard Security Systems — Elias Banda | CCTV maintenance, alarm monitoring | $200/month |
| `demo-groc-per-004` | WeighTech Calibration — Victor Chuma | Scale calibration & certification | $150/quarter |

---

### 5.4 Customers (20)

15 named individuals + 5 corporate customers. All with purchasing history.

**Layby records (6):**
- 2 COMPLETED (items collected)
- 2 ACTIVE (installments in progress — a 55-inch TV and a gas stove)
- 1 OVERDUE (3 payments missed — triggers late fee)
- 1 NEW (just started, deposit only)

**Corporate customers:** City School (monthly grocery order $800–1,200), ZimCorp Office (fortnightly office supplies $300–500)

---

### 5.5 Expense Accounts (6)

| Account | Number | Balance | Purpose |
|---|---|---|---|
| Operating Expenses | `EXP-GROC-OPS` | $5,200 | Rent, utilities, licensing |
| Petty Cash | `EXP-GROC-PTTY` | $380 | Small daily purchases |
| Refrigeration & Equipment | `EXP-GROC-EQUIP` | $1,100 | Fridge repairs, equipment |
| Vehicle Fleet | `EXP-GROC-VEH` | $1,400 | 2 delivery trucks, fuel |
| Marketing | `EXP-GROC-MKT` | $500 | Flyers, specials boards, loyalty cards |
| Security & Safety | `EXP-GROC-SEC` | $600 | CCTV, alarm, security company payments |

**Expense payment history:** Monthly rent $2,800, electricity $650, water $180, internet $95, refrigeration service $280/quarter, 2-truck fuel weekly (~$240/week total), insurance $340/month.

**InterBusinessLoan:** Umbrella Holdings → FreshMart: $8,000 at 0% (equipment purchase loan, $5,500 remaining)

---

### 5.6 Products (115 items across 8 departments)

*(as per v1 plan but with full EAN-13 barcodes, category IDs, reorder levels, and supplier links)*

| Department | Count | Example items |
|---|---|---|
| Fresh Produce | 18 | Tomatoes 1kg, Onions 1kg, Cabbage (head), Carrots, Spinach, Bananas, Apples, Oranges, Potatoes, Sweet Potatoes, Avocado, Cucumber, Lettuce, Butternut, Green Pepper, Garlic, Ginger, Lemon |
| Dairy & Eggs | 12 | Full Cream Milk 1L, Low Fat Milk 1L, Cheddar Cheese 250g, Gouda 200g, Plain Yoghurt, Flavoured Yoghurt, Butter 500g, Eggs 6-pack, Eggs 12-pack, Cream 250ml, UHT Milk 1L, Condensed Milk |
| Meat & Seafood | 14 | Chicken Breast 500g, Whole Chicken, Beef Mince 500g, T-Bone Steak, Pork Ribs 1kg, Boerewors 1kg, Lamb Chops 500g, Hake Fillet, Tilapia, Polony 500g, Vienna Sausages, Biltong 100g, Smoked Sausage, Livers |
| Bakery & Deli | 10 | White Bread, Brown Bread, Whole Wheat Bread, Dinner Rolls 6-pack, Scones 4-pack, Croissants 4-pack, Vanilla Sponge Cake, Vetkoek 4-pack, Doughnuts, Muffins 4-pack |
| Dry Goods | 20 | Rice 2kg/5kg, Maize Meal 2kg/5kg/10kg, Wheat Flour 2kg, Sugar 2kg, Brown Sugar, Cooking Oil 2L, Sunflower Oil 5L, Pasta 500g, Spaghetti 500g, Baked Beans, Tomato Paste, Tomato Sauce, Soy Sauce, Salt 1kg, Black Pepper, Curry Powder, Mixed Spice, Lentils, Chickpeas |
| Beverages | 18 | Coke 500ml/2L, Fanta 500ml/2L, Sprite 2L, Stoney 2L, Energy Drink (Monsters/Sting), Apple Juice 1L, Orange Juice 1L, Mango Juice 1L, Water 500ml/1.5L/5L, Sparkling Water, Oros Concentrate, Rooibos Tea, Black Tea, Coffee Instant |
| Frozen | 8 | Frozen Chips 1kg, Fish Fingers 400g, Ice Cream 2L, Frozen Peas 500g, Frozen Corn 500g, Chicken Nuggets, Frozen Lasagne, Mixed Vegetables |
| Household & Cleaning | 15 | Dishwashing Liquid 750ml, Laundry Powder 1kg/2.5kg, Fabric Softener 1L, Bleach 1L, Multi-surface Spray, Toilet Paper 9-roll, Hand Soap, Body Wash, Shampoo, Toothpaste, Toothbrush, Deodorant, Sanitary Pads, Nappies (pack), Bin Bags |

---

### 5.7 Vehicles for Grocery

| Vehicle | Purpose |
|---|---|
| Isuzu NKR Truck — `BCD 5678` | Large customer deliveries, bulk stock collection |
| Toyota Hilux — `GHI 2345` | Small/express deliveries, supplier pick-ups |

Drivers: Brighton Chihuri (primary, Isuzu), Patrick Mhuru (primary, Hilux), cross-auth on both.

---

## 6. Urban Threads Clothing

### 6.1 Employee Roster — 12 employees

**Management Tier (3):**

| ID | Name | Role | Salary/month | Schedule | System User |
|---|---|---|---|---|---|
| `demo-clth-emp-001` | Nomsa Dlamini | Store Manager | $750 | Mon–Sat 08:00–17:00 | Yes |
| `demo-clth-emp-002` | Tafadzwa Moyo | Assistant Manager | $580 | Tue–Sun 08:00–17:00 | Yes |
| `demo-clth-emp-003` | Patience Chigodora | Senior Sales / Merchandiser | $480 | Mon–Sat 08:00–17:00 | No |

**Operations Tier (7):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-clth-emp-004` | Ruvimbo Zimba | Sales Assistant | $320 | Mon–Sat 09:00–18:00 |
| `demo-clth-emp-005` | Tinashe Mutasa | Sales Assistant | $320 | Tue–Sun 09:00–18:00 |
| `demo-clth-emp-006` | Grace Chibwe | Sales Assistant | $320 | Wed–Mon 09:00–18:00 |
| `demo-clth-emp-007` | Simba Mhuru | Stockroom Manager | $380 | Mon–Fri 07:00–16:00 |
| `demo-clth-emp-008` | Charmaine Dube | Bale Sorter / Pricer | $310 | Mon–Fri 07:00–15:00 |
| `demo-clth-emp-009` | Rutendo Chikosi | Cashier | $300 | Mon–Sat 08:30–17:30 |
| `demo-clth-emp-010` | Wellington Banda | Delivery & Logistics | $300 | Mon–Sat 07:00–16:00 (driver) |

**Support Tier (2):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-clth-emp-011` | Brighton Ncube | Security | $280 | Mon–Sat 07:00–18:00 |
| `demo-clth-emp-012` | Melody Zimba | Cleaner | $210 | Mon–Sat 05:30–08:30 |

---

### 6.2 Suppliers (4)

| Supplier | Contact | What They Supply | Terms | Credit Limit |
|---|---|---|---|---|
| ZimBale Imports (Pvt) Ltd | Farai Mhuri, 0772-123456 | Bales of assorted second-hand clothing | COD | — |
| AfricaBales International | James Okonkwo, 0733-234567 | Premium grade bales, branded items | Net 7 days | $2,000 |
| QuickBale Sorting Co | Agnes Mhuru, 0774-345678 | Pre-sorted bale categories | Net 14 days | $1,500 |
| PackRight Solutions | Simba Nyoni, 0712-456789 | Hangers, tags, packaging bags, tissue paper | Net 30 days | $800 |

---

### 6.3 Contractors (Persons — 3)

| Person | Service | Rate |
|---|---|---|
| `demo-clth-per-001` StarTailor — Maria Chikwanda | Garment alterations, repairs | $1.50/piece + $50/week retainer |
| `demo-clth-per-002` SwiftDelivery — Joseph Mlambo | Out-of-area deliveries (customer orders) | $8/trip |
| `demo-clth-per-003` CleanMaster Services — Sipho Dlamini | Monthly deep clean of stockroom | $200/month |

---

### 6.4 Customers (15)

10 named individuals with layby history, 5 corporate (schools, churches, organizations buying uniform items).

**Layby records (8):**
- 3 COMPLETED (items collected, payment done)
- 3 ACTIVE (school uniform order, ladies dress collection, gents jeans set)
- 1 OVERDUE (2 missed payments, late fee applied)
- 1 CANCELLED (customer withdrew, refund processed)

---

### 6.5 Expense Accounts (5)

| Account | Number | Balance | Purpose |
|---|---|---|---|
| Operating Expenses | `EXP-CLTH-OPS` | $2,800 | Rent, utilities |
| Petty Cash | `EXP-CLTH-PTTY` | $300 | Tags, hangers, daily misc |
| Bale Transport | `EXP-CLTH-TRANS` | $500 | Import costs, customs, freight |
| Marketing | `EXP-CLTH-MKT` | $350 | Social media, specials boards |
| Alterations Budget | `EXP-CLTH-ALT` | $200 | Tailor contractor payments |

**InterBusinessLoan:** Umbrella Holdings → Urban Threads: $4,000 (bale purchase loan, $2,800 remaining)

---

### 6.6 Bales & Products

**Bales (12):**

| Bale ID | Category | Cost Price | Total Pieces | Avg Per-Piece Cost | Sale Price/Piece | Status |
|---|---|---|---|---|---|---|
| `BALE-001` | Ladies T-Shirts (mixed sizes) | $85 | 35 | $2.43 | $6.50 | Fully Recovered |
| `BALE-002` | Gents Jeans (32–38) | $120 | 20 | $6.00 | $15.00 | Fully Recovered |
| `BALE-003` | Kids Mixed (2–10 yrs) | $65 | 52 | $1.25 | $3.50 | Recovering (78%) |
| `BALE-004` | Ladies Dresses (assorted) | $95 | 28 | $3.39 | $9.00 | Recovering (52%) |
| `BALE-005` | Gents T-Shirts (L–XXL) | $80 | 40 | $2.00 | $5.50 | Fully Recovered |
| `BALE-006` | Ladies Tops (S–XL) | $75 | 32 | $2.34 | $6.00 | In Progress (30%) |
| `BALE-007` | Gents Shorts (30–36) | $70 | 38 | $1.84 | $5.00 | Fully Recovered |
| `BALE-008` | Kids Tops (4–12 yrs) | $55 | 45 | $1.22 | $3.00 | Fully Recovered |
| `BALE-009` | Ladies Jeans (26–34) | $110 | 22 | $5.00 | $14.00 | In Progress (40%) |
| `BALE-010` | Mixed Jackets & Coats | $140 | 18 | $7.78 | $20.00 | Recovering (60%) |
| `BALE-011` | Ladies Skirts & Trousers | $90 | 30 | $3.00 | $8.00 | New Arrival |
| `BALE-012` | School Uniform Pieces | $75 | 50 | $1.50 | $4.50 | In Progress |

Products (~120 items) linked to bales with size/colour variants and barcode per SKU.

---

## 7. BuildPro Hardware

### 7.1 Employee Roster — 16 employees

**Management Tier (4):**

| ID | Name | Role | Salary/month | Schedule | System User |
|---|---|---|---|---|---|
| `demo-hdwr-emp-001` | Robert Chinhamo | Store Manager | $920 | Mon–Sat 07:00–17:00 | Yes |
| `demo-hdwr-emp-002` | Isaac Murambe | Deputy Manager | $720 | Tue–Sun 07:00–17:00 | Yes |
| `demo-hdwr-emp-003` | Patricia Chuma | Finance & Admin Manager | $640 | Mon–Fri 08:00–17:00 | No |
| `demo-hdwr-emp-004` | Joseph Banda | Warehouse & Stock Manager | $580 | Mon–Fri 06:00–15:00 | No |

**Operations Tier (9):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-hdwr-emp-005` | Victor Dube | Senior Sales (Tools) | $450 | Mon–Sat 07:30–16:30 |
| `demo-hdwr-emp-006` | Elias Mushamba | Senior Sales (Plumbing/Electrical) | $450 | Mon–Sat 07:30–16:30 |
| `demo-hdwr-emp-007` | Francis Mlambo | Sales (Building Materials) | $400 | Mon–Sat 07:30–16:30 |
| `demo-hdwr-emp-008` | Andrew Mwangi | Sales (Paint) | $380 | Tue–Sun 07:30–16:30 |
| `demo-hdwr-emp-009` | Tendai Ndlovu | Storeman | $340 | Mon–Fri 06:00–15:00 |
| `demo-hdwr-emp-010` | Lucky Sibanda | Delivery Driver | $360 | Mon–Sat 07:00–16:00 (driver) |
| `demo-hdwr-emp-011` | Emmanuel Chikwanda | Delivery Driver | $360 | Tue–Sun 07:00–16:00 (driver) |
| `demo-hdwr-emp-012` | Loveness Mpofu | Cashier | $320 | Mon–Sat 07:30–16:30 |
| `demo-hdwr-emp-013` | Arnold Chirwa | Cashier | $320 | Tue–Sun 07:30–16:30 |

**Support Tier (3):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-hdwr-emp-014` | Thomas Moyo | Security | $290 | Mon–Sun 06:00–18:00 |
| `demo-hdwr-emp-015` | Miriam Zvobgo | Cleaner | $220 | Mon–Sat 05:30–08:30 |
| `demo-hdwr-emp-016` | George Mharu | Technical Advisor (part-time) | $280 | Mon/Wed/Fri 08:00–16:00 |

---

### 7.2 Suppliers (6)

| Supplier | Contact | Supply | Terms | Credit Limit |
|---|---|---|---|---|
| ZimTools Wholesale | Kennedy Moyo | Hand tools, power tools, accessories | Net 30 days | $8,000 |
| National Builders Supply | Chipo Banda | Cement, sand, concrete, tiles | Net 14 days | $15,000 |
| PlumbTech Distributors | Rutendo Ncube | All plumbing fittings, pipes, valves | Net 21 days | $5,000 |
| ElectraSupply Ltd | David Sithole | Electrical components, wire, MCBs, lighting | Net 21 days | $6,000 |
| Paint & Coatings Ltd | Joyce Mhuru | Interior/exterior paint, primers, stains | Net 30 days | $4,000 |
| SafetyFirst Equipment | Thomas Chirwa | PPE, safety equipment, first aid, signage | Net 30 days | $2,500 |

---

### 7.3 Contractors (Persons — 4)

| Person | Service | Rate |
|---|---|---|
| `demo-hdwr-per-001` LiftTech Solutions — Mark Banda | Forklift annual service & certification | $320/service |
| `demo-hdwr-per-002` TechIT Solutions — Simba Nyoni | IT support, POS maintenance | $220/month retainer |
| `demo-hdwr-per-003` CleanMaster Services — Sipho Dlamini | Warehouse & floor cleaning | $380/month |
| `demo-hdwr-per-004` SafetyFirst Training — Josephine Moyo | Annual staff safety training | $400/session (once yearly) |

---

### 7.4 Customers (18)

10 individuals, 8 corporate (contractors, construction companies, schools).

**Notable customers:**
- Bright Builders (Pvt) Ltd — trade account, buys cement/plumbing monthly ($1,500–3,000)
- Harare City Council — bulk electrical components quarterly ($5,000+)
- Local School Renovation Project — one-time large purchase ($2,800)

---

### 7.5 Expense Accounts (6)

| Account | Number | Balance | Purpose |
|---|---|---|---|
| Operating Expenses | `EXP-HDWR-OPS` | $6,500 | Rent $3,500, utilities, licensing |
| Petty Cash | `EXP-HDWR-PTTY` | $520 | Office supplies, misc |
| Vehicle Fleet | `EXP-HDWR-VEH` | $1,800 | 2 delivery trucks, fuel |
| Equipment & Maintenance | `EXP-HDWR-EQUIP` | $1,200 | Forklift, shelving, warehouse equipment |
| Marketing & Trade | `EXP-HDWR-MKT` | $650 | Trade shows, catalogues, signage |
| Staff Training & Safety | `EXP-HDWR-TRNG` | $400 | Safety training, certifications, uniforms |

**InterBusinessLoan:** Umbrella Holdings → BuildPro: $12,000 (warehouse shelving & equipment loan, $7,200 remaining)

---

### 7.6 Products (95 items across 6 departments)

*(Full list in seed script — summary below)*

| Department | Count |
|---|---|
| Hand Tools | 18 |
| Power Tools | 12 |
| Plumbing | 20 |
| Electrical | 18 |
| Building Materials | 15 |
| Paint & Finishing | 12 |

WiFi: R710 tokens for trade customer waiting area ($1/hr, $3/day)

---

### 7.7 Vehicles for Hardware

| Vehicle | Purpose |
|---|---|
| Ford Ranger Pickup — `EFG 9012` | Small deliveries, supplier pick-ups |
| Isuzu FTR Truck — `JKL 6789` | Bulk material delivery (cement, sand, timber) |

Drivers: Lucky Sibanda (Ranger), Emmanuel Chikwanda (Isuzu), Thomas Moyo (backup Ranger).

---

## 8. ProServices Group (NEW)

### 8.1 Employee Roster — 10 employees

**Management Tier (3):**

| ID | Name | Role | Salary/month | Schedule | System User |
|---|---|---|---|---|---|
| `demo-svc-emp-001` | Michelle Foster | Managing Director | $1,200 | Mon–Fri 08:00–17:00 | Yes |
| `demo-svc-emp-002` | David Murewa | Operations Manager | $950 | Mon–Fri 08:00–17:00 | Yes |
| `demo-svc-emp-003` | Josephine Mabika | Finance & HR Manager | $820 | Mon–Fri 08:00–17:00 | No |

**Operations Tier (5):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-svc-emp-004` | Shingi Chikosi | Senior Systems Engineer | $780 | Mon–Fri 08:00–17:00 |
| `demo-svc-emp-005` | Kudakwashe Ndou | Senior Consultant | $750 | Mon–Fri 08:00–17:00 |
| `demo-svc-emp-006` | Francis Zvitete | Systems Engineer | $620 | Mon–Fri 08:00–17:00 |
| `demo-svc-emp-007` | Tariro Mwangi | Junior Consultant | $520 | Mon–Fri 08:30–17:30 |
| `demo-svc-emp-008` | Tendai Gomwe | Field Technician / Driver | $480 | Mon–Fri 07:00–16:00 (driver) |

**Support Tier (2):**

| ID | Name | Role | Salary/month | Schedule |
|---|---|---|---|---|
| `demo-svc-emp-009` | Martha Chirwa | Admin & PA | $380 | Mon–Fri 08:00–17:00 |
| `demo-svc-emp-010` | George Ndlovu | Office Security / Cleaner | $260 | Mon–Fri 06:00–18:00 |

**Leave Policy:** 21 days annual (professional services standard). `annualVacationDays=21` in all contracts.

---

### 8.2 Suppliers (4)

| Supplier | Contact | Supply | Terms |
|---|---|---|---|
| TechCorp Distributors | Ray Moyo | IT hardware (servers, switches, routers, laptops) | Net 30 days |
| SoftwarePlus International | Jane Banda | Software licenses (antivirus, Office, project tools) | Monthly subscription |
| PrintPro Services | Wilson Mutasa | Business cards, letterheads, banners | COD |
| OfficeWorld | Agnes Chirwa | Office stationery, consumables | Net 14 days |

---

### 8.3 Contractors — Subcontractors (Persons — 4)

| Person | Specialty | Rate |
|---|---|---|
| `demo-svc-per-001` CableSpecialists — Mark Gomwe | Structured cabling, fibre installations | $25/hr or $500/project |
| `demo-svc-per-002` CyberSec Partners — Lara Banda | Cybersecurity assessments, pen testing | $80/hr |
| `demo-svc-per-003` LegalAdvisors (Pvt) — Advocate Moyo | Company legal, contracts, compliance | $250/month retainer |
| `demo-svc-per-004` GraphixPro — Tinashe Studio | UI/UX, design work subcontracted | $40/hr |

**Projects seeded:**
- "Grand Café POS & WiFi Setup" — completed, 3 project stages, 2 contractors
- "FreshMart Network Upgrade" — in progress, 2 stages, 1 contractor
- "BuildPro IT Support Contract" — ongoing retainer, monthly
- "Government Office CCTV Install" — proposal stage

---

### 8.4 Customers (10)

All corporate clients:

| Client | Type | Service Used | Value |
|---|---|---|---|
| The Grand Café | CORPORATE | POS + WiFi setup; ongoing support | $1,200/year |
| FreshMart Grocery | CORPORATE | Network + CCTV | $1,800 project |
| BuildPro Hardware | CORPORATE | IT support retainer | $220/month |
| City Hospital | CORPORATE | Server setup + maintenance | $3,500 project |
| Sunrise School | CORPORATE | Computer lab setup | $2,800 project |
| Local Municipality | CORPORATE | CCTV + access control | $6,500 project |

---

### 8.5 Expense Accounts (6)

| Account | Number | Balance | Purpose |
|---|---|---|---|
| Operating Expenses | `EXP-SVC-OPS` | $4,200 | Rent, utilities, internet |
| Petty Cash | `EXP-SVC-PTTY` | $350 | Office misc |
| Vehicle Account | `EXP-SVC-VEH` | $900 | 2 vehicles, fuel, maintenance |
| Software & Subscriptions | `EXP-SVC-SOFT` | $600 | Monthly software licenses |
| Marketing & BD | `EXP-SVC-MKT` | $800 | Lead gen, tenders, events |
| Professional Development | `EXP-SVC-PROF` | $500 | Certifications, training |

**InterBusinessLoan:** Umbrella Holdings → ProServices: $6,000 (working capital, $4,500 remaining)

---

### 8.6 Service Products (28 items)

| Category | Item | Price |
|---|---|---|
| Consulting | Initial Assessment | $150/hr |
| Consulting | Project Consultation | $120/hr |
| Consulting | Technical Strategy Session | $200/hr |
| Consulting | IT Audit & Report | $800/audit |
| Installation | Network Setup (small office) | $350 |
| Installation | Network Setup (enterprise) | $1,200 |
| Installation | POS System Full Install | $250/terminal |
| Installation | CCTV System (4 cameras) | $650 |
| Installation | CCTV System (8 cameras) | $1,100 |
| Installation | Server Setup & Config | $800 |
| Installation | Structured Cabling (per point) | $45 |
| Maintenance | Monthly IT Support (small) | $200/month |
| Maintenance | Monthly IT Support (medium) | $400/month |
| Maintenance | Quarterly System Checkup | $150 |
| Maintenance | Annual Service Contract | $1,800/year |
| Support | Remote Support Hour | $80/hr |
| Support | On-site Support Hour | $120/hr |
| Support | Emergency Call-out (within 2hrs) | $250 |
| Training | Staff IT Training (per session) | $350 |
| Training | Software Training (per session) | $180 |
| Training | IT Security Awareness | $250/session |
| WiFi | Day Pass Token | $2.00 |
| WiFi | Week Pass Token | $10.00 |
| WiFi | Month Pass Token | $35.00 |
| Software | Antivirus License (per device/year) | $30/device |
| Software | Office Suite License (per device) | $85/device |
| Hardware | Refurb Laptop | $280 |
| Hardware | Wireless Router | $45 |

---

### 8.7 Vehicles for Services

| Vehicle | Purpose |
|---|---|
| Toyota Corolla — `HIJ 3456` | Client site visits, field tech |
| VW Caddy Van — `KLM 7890` | Equipment & tools transport |

Driver: Tendai Gomwe (both vehicles, Class B license).

---

## 9. Vehicle Module — Full Detail

### 9.1 All Vehicles (7 total across businesses)

| Vehicle ID | Make/Model | Reg # | Type | Business | Current Mileage |
|---|---|---|---|---|---|
| `demo-veh-001` | Toyota HiAce | ABZ 1234 | Minivan/Delivery | Grand Café | 87,450 km |
| `demo-veh-002` | Isuzu NKR | BCD 5678 | Light Truck | FreshMart | 112,800 km |
| `demo-veh-003` | Toyota Hilux | GHI 2345 | Pickup | FreshMart | 64,200 km |
| `demo-veh-004` | Ford Ranger | EFG 9012 | Pickup | BuildPro | 78,900 km |
| `demo-veh-005` | Isuzu FTR | JKL 6789 | Medium Truck | BuildPro | 145,600 km |
| `demo-veh-006` | Toyota Corolla | HIJ 3456 | Sedan | ProServices | 52,300 km |
| `demo-veh-007` | VW Caddy | KLM 7890 | Light Van | ProServices | 38,700 km |

### 9.2 All Drivers (7 designated drivers)

| Driver ID | Name | Business | Vehicles | License Class | License Expiry |
|---|---|---|---|---|---|
| `demo-drv-001` | Miriam Zvobgo | Grand Café | HiAce | C | 2027-03-15 |
| `demo-drv-002` | Brighton Chihuri | FreshMart | Isuzu NKR + Hilux | C1 | 2026-08-20 |
| `demo-drv-003` | Patrick Mhuru | FreshMart | Hilux | C | 2027-01-10 |
| `demo-drv-004` | Lucky Sibanda | BuildPro | Ranger + FTR | CE | 2026-12-05 |
| `demo-drv-005` | Emmanuel Chikwanda | BuildPro | FTR | CE | 2027-06-18 |
| `demo-drv-006` | Thomas Moyo | BuildPro | Ranger (backup) | B | 2026-09-22 |
| `demo-drv-007` | Tendai Gomwe | ProServices | Corolla + Caddy | B | 2028-02-14 |

### 9.3 Trip Data (last 30 days per vehicle)

| Vehicle | Avg Trips/Week | Total Trips | Typical Destinations |
|---|---|---|---|
| HiAce (Café) | 4 | ~17 | Sunrise Fresh Produce, Metro Meats, customer deliveries |
| Isuzu NKR (Grocery) | 3 | ~13 | Mega Wholesale, customer bulk deliveries |
| Hilux (Grocery) | 5 | ~22 | Daily supplier runs, small customer deliveries |
| Ranger (BuildPro) | 4 | ~17 | National Builders, customer delivery sites |
| FTR (BuildPro) | 3 | ~13 | National Builders (bulk cement/sand), large site deliveries |
| Corolla (Services) | 5 | ~22 | Client offices (Grand Café, FreshMart, BuildPro, hospital) |
| Caddy (Services) | 3 | ~13 | Equipment deliveries for installations |

**Trip record fields:** `tripDate`, `departureTime`, `returnTime`, `startOdometer`, `endOdometer`, `distance`, `purpose` (DELIVERY/SUPPLIER_RUN/CLIENT_VISIT/MAINTENANCE), `destination`, `driverId`, `vehicleId`, `businessId`, `fuelAdded` (litres), `fuelCost`, `tollFees`, `cargoDescription`, `notes`

### 9.4 Maintenance Records (per vehicle)

| Vehicle | Service Type | Date | Mileage | Cost | Next Due |
|---|---|---|---|---|---|
| HiAce | Oil + Filter change | 30 days ago | 87,000 km | $45 | 92,000 km |
| HiAce | Tyre rotation | 45 days ago | 86,500 km | $20 | 91,500 km |
| Isuzu NKR | 10,000 km major service | 20 days ago | 112,000 km | $280 | 122,000 km |
| Isuzu NKR | Brake pads replacement | 20 days ago | 112,000 km | $95 | — |
| Hilux | Oil change | 15 days ago | 64,000 km | $42 | 69,000 km |
| Ranger | 7,500 km service | 25 days ago | 78,500 km | $155 | 83,500 km |
| FTR | Air filter + oil | 10 days ago | 145,200 km | $65 | 150,200 km |
| FTR | Battery replacement | 8 days ago | 145,300 km | $85 | — |
| Corolla | 5,000 km service | 12 days ago | 52,000 km | $95 | 57,000 km |
| Caddy | Windscreen chip repair | 18 days ago | 38,500 km | $35 | — |

### 9.5 Vehicle Licenses (per vehicle)

All vehicles have: fitness certificate date, license disc expiry, insurance policy number, next renewal date.
2 vehicles have licenses expiring within 60 days (triggers alert in UI): FTR and Isuzu NKR.

### 9.6 Vehicle Expenses (last 30 days per vehicle)

Weekly fuel receipts per vehicle (8–12 litres/100km, 150–400 km/week per vehicle). Total weekly fuel cost:
- HiAce: ~$45/week
- Isuzu NKR: ~$85/week
- Hilux: ~$55/week
- Ranger: ~$60/week
- FTR: ~$110/week
- Corolla: ~$35/week
- Caddy: ~$30/week

Insurance: 1 payment per vehicle per month. 2 emergency repair incidents (HiAce tyre $65, FTR emergency radiator service $180).

---

## 10. Cross-Business Data

### 10.1 InterBusinessLoans (Umbrella → each business)

| Loan ID | Lender | Borrower | Principal | Remaining | Interest | Status |
|---|---|---|---|---|---|---|
| `demo-ibl-001` | Umbrella Holdings | Grand Café | $5,000 | $3,200 | 0% | Active |
| `demo-ibl-002` | Umbrella Holdings | FreshMart | $8,000 | $5,500 | 0% | Active |
| `demo-ibl-003` | Umbrella Holdings | Urban Threads | $4,000 | $2,800 | 0% | Active |
| `demo-ibl-004` | Umbrella Holdings | BuildPro | $12,000 | $7,200 | 0% | Active |
| `demo-ibl-005` | Umbrella Holdings | ProServices | $6,000 | $4,500 | 0% | Active |
| `demo-ibl-006` | FreshMart | Grand Café | $1,500 | $0 | 0% | Paid Off (test) |

Repayment history: each loan has 3–6 repayment transactions deposited back to Umbrella expense account.

### 10.2 Shared Contractors

CleanMaster Services (Sipho Dlamini) is a contractor for Grand Café, FreshMart, and Urban Threads — demonstrating a person appearing across multiple business projects.

### 10.3 Employee Multi-Business Assignments

3 employees from ProServices are also assigned part-time to Grand Café (IT support on-site):
- Shingi Chikosi: primary=ProServices, secondary=Grand Café (maintenance visits, 1 day/week)
- Francis Zvitete: primary=ProServices, secondary=BuildPro (monthly hardware audit)

---

## 11. New Tables/Columns to Seed

### 11.1 Contract Schedule Fields (all 71 contracts)
```
workDaysPerWeek     — per employee schedule (5, 6, 6.5, or 7)
dailyStartTime      — "HH:MM" 24-hour
dailyEndTime        — "HH:MM" 24-hour
annualVacationDays  — 14 (ops businesses), 21 (services)
```
Mirror to Employee: `scheduledStartTime`, `scheduledEndTime`, `scheduledDaysPerWeek`, `annualVacationDays`

### 11.2 EmployeeLoginLog (70 entries across restaurant + grocery)
- 30 `login` events (last 7 days, card method)
- 8 `declined` events (scanned but chose not to log in)
- 15 `logout` events (session ended via card scan or auto)
- 17 `login` entries for grocery kiosk
- Half with `photoUrl` (placeholder image stored in images table)

### 11.3 PayrollAdjustments — New Types (per restaurant + grocery payroll)
- `clock_in_deduction` (auto-approved, negative): ~15 entries per business
- `overtime_credit` (pending): ~8 entries per business (under 30 min OT)
- `overtime` (pending, 1.5×): ~5 entries per business (over 30 min OT)
- `vacation_payout` (pending): 1 entry (Tendai Mhaka — terminating)
- Some already-approved OT for last month's closed period

### 11.4 EmployeeAttendance (last 30 days)
- Restaurant: 15 employees × ~26 working days = ~390 records
- Grocery: 18 employees × ~26 working days = ~468 records
- Services: 10 employees × 22 working days = ~220 records (exempt, no OT calcs)
- Clothing + Hardware: 12 + 16 employees × ~26 days = ~728 records

---

## 12. Files to Create

| File | Purpose |
|---|---|
| `scripts/seed-services-demo.js` | ProServices business + 10 employees + 4 suppliers + 4 contractors + 6 expense accounts + 28 service products + orders + 2 vehicles |
| `scripts/seed-vehicles-full-demo.js` | 7 vehicles, 7 drivers, authorizations, 30-day trips, maintenance records, vehicle licenses, vehicle expenses |
| `scripts/seed-attendance-demo.js` | 30-day clock-in/out records for all 5 businesses; realistic late/OT/absent patterns |
| `scripts/seed-payroll-clockin-demo.js` | Payroll periods + entries with deduction/OT/vacation_payout adjustments tied to attendance |
| `scripts/seed-login-log-demo.js` | EmployeeLoginLog entries for kiosk login tracking testing |
| `scripts/seed-customers-demo.js` | BusinessCustomers for all 5 businesses with realistic profiles |
| `scripts/seed-layby-demo.js` | CustomerLayby + CustomerLaybyPayment (all statuses) for grocery, clothing, restaurant |
| `scripts/seed-stock-movements-demo.js` | BusinessStockMovements for all businesses (supplier restocking + sales deductions) |
| `scripts/seed-interbusiness-loans-demo.js` | InterBusinessLoans from umbrella to each business + repayment history |
| `scripts/seed-contractors-full-demo.js` | Persons + ProjectContractors for all 5 businesses (replaces/extends existing contractors script) |
| `src/app/api/admin/demo/reset/route.ts` | Reset endpoint (scope: all or by business type) |
| `src/app/api/admin/demo/reseed/route.ts` | Reseed endpoint (scope: all or by business type) |
| `src/app/api/admin/demo/status/route.ts` | Status endpoint — record counts per business |
| `src/app/api/admin/seed-services/route.ts` | Admin API for services business seeding |
| `src/app/api/admin/seed-vehicles-demo/route.ts` | Admin API for vehicle module seeding |
| `src/app/api/admin/seed-attendance/route.ts` | Admin API for attendance seeding |

---

## 13. Files to Update

| File | Changes Required |
|---|---|
| `scripts/seed-demo-businesses.js` | Add ProServices Group; update all businesses to have umbrella link; use stable `demo-*` ID prefixes |
| `scripts/seed-realistic-employees-complete.js` | Add `scheduledStartTime`, `scheduledEndTime`, `scheduledDaysPerWeek`, `annualVacationDays` to all 71 employees; use stable `demo-*-emp-NNN` IDs |
| `scripts/seed-contracts-demo.js` | Add schedule fields to all contracts; update `pdfGenerationData` JSON to include schedule |
| `scripts/seed-demo-expense-accounts.js` | Expand from 3 to 5–6 accounts per business; add realistic payment/deposit history; add InterBusinessLoan references |
| `scripts/seed-payroll-demo.js` | Add new adjustment types; add vacation_payout scenario; adjust leave balance calculations |
| `scripts/seed-leave-management-demo.js` | Use per-business `annualVacationDays` (14 vs 21); add more leave request variety |
| `scripts/seed-employee-benefits-demo.js` | Per-business benefit structures (meal allowance, medical, vehicle allowance for drivers) |
| `scripts/seed-restaurant-demo.js` | Expand to 50 products; add menu combos; add meal program participants; add supplier links |
| `scripts/seed-grocery-demo.js` | Expand to 115 products with EAN-13 barcodes + reorder levels + supplier mapping |
| `scripts/seed-clothing-demo.js` | Expand to 12 bales + ~120 variant products; add layby integration |
| `scripts/seed-hardware-demo.js` | Expand to 95 products with 6 supplier links; add R710 WiFi tokens |
| `scripts/seed-dev-data.js` | Remove vehicle seeding (moved to seed-vehicles-full-demo.js) |
| `scripts/seed-all-demo-data.js` | Add all new scripts; enforce dependency order; add verification summary |
| `src/app/api/admin/seed-complete-demo/route.ts` | Add new steps for services, vehicles, attendance, payroll-clockin, login-log, customers, layby, stock-movements, interbusiness-loans, contractors |

---

## 14. Implementation Order (Full Dependency Chain)

```
Phase 1 — Foundation
  1.  seed-demo-businesses.js           (UPDATE) — 5 businesses + umbrella
  2.  seed-business-categories.js       (UPDATE) — categories per type
  3.  seed-demo-expense-accounts.js     (UPDATE) — 5–6 accounts per business

Phase 2 — People
  4.  seed-realistic-employees-complete.js (UPDATE) — 71 employees with schedule fields
  5.  seed-contractors-full-demo.js     (NEW)    — Persons + ProjectContractors
  6.  seed-customers-demo.js            (NEW)    — BusinessCustomers all businesses
  7.  seed-services-demo.js             (NEW)    — ProServices: products + project clients

Phase 3 — Products & Inventory
  8.  seed-restaurant-demo.js           (UPDATE) — 50 menu items + combos
  9.  seed-grocery-demo.js              (UPDATE) — 115 products + EAN barcodes
  10. seed-clothing-demo.js             (UPDATE) — 12 bales + 120 variant products
  11. seed-hardware-demo.js             (UPDATE) — 95 products

Phase 4 — HR & Contracts
  12. seed-contracts-demo.js            (UPDATE) — contracts with schedule fields
  13. seed-employee-benefits-demo.js    (UPDATE) — per-business benefit structures
  14. seed-leave-management-demo.js     (UPDATE) — leave balances + requests
  15. seed-salary-increases-demo.js     (no change needed)
  16. seed-employee-loans-demo.js       (no change needed)

Phase 5 — Operations & Finance
  17. seed-sales-orders-all-businesses.js (UPDATE) — orders referencing real products
  18. seed-layby-demo.js                (NEW)    — layby + payment history
  19. seed-stock-movements-demo.js      (NEW)    — stock in/out from suppliers + sales
  20. seed-interbusiness-loans-demo.js  (NEW)    — umbrella → business loans

Phase 6 — Vehicles
  21. seed-vehicles-full-demo.js        (NEW)    — vehicles + drivers + trips + maintenance + expenses

Phase 7 — Payroll & Attendance
  22. seed-payroll-accounts-demo.js     (no change needed)
  23. seed-attendance-demo.js           (NEW)    — 30-day clock-in records
  24. seed-payroll-demo.js              (UPDATE) — payroll periods + new adjustment types
  25. seed-payroll-clockin-demo.js      (NEW)    — payroll entries tied to attendance data

Phase 8 — Customers, Promotions & Campaigns
  26. seed-customers-full-demo.js       (NEW)    — customers with purchase history, loyalty points
  27. seed-promotions-demo.js           (NEW)    — coupons, promo campaigns, menu promotions
  28. seed-layby-demo.js                (NEW)    — layby + payment history (all statuses)

Phase 9 — WiFi & Connectivity
  29. seed-wifi-esp32-demo.js           (no change needed)
  30. seed-wifi-r710-demo.js            (no change needed)

Phase 10 — Logging & Tracking
  31. seed-login-log-demo.js            (NEW)    — EmployeeLoginLog for kiosk testing
  32. seed-printers-demo.js             (no change needed)

Phase 11 — System Users & Permissions
  33. seed-system-users-demo.js         (NEW)    — varied-permission system users per business
```

---

## 15. Customers & Purchase History

### 15.1 Per-Business Customer Profiles

Every customer has: `customerType`, `email`, `phone`, `address`, `dateOfBirth`, `loyaltyPoints`, `totalSpent`, linked `BusinessOrders` (purchase history), and for individual customers — a `CustomerRewards` record.

---

**The Grand Café — 14 customers**

| ID | Name | Type | Total Spent | Loyalty Pts | Notes |
|---|---|---|---|---|---|
| `demo-rest-cust-001` | Walk-in Customer | INDIVIDUAL | — | 0 | Default POS customer |
| `demo-rest-cust-002` | Tendai Zvobgo | INDIVIDUAL | $285 | 57 | Regular; active layby |
| `demo-rest-cust-003` | Blessed Mpofu | INDIVIDUAL | $512 | 102 | High-value regular |
| `demo-rest-cust-004` | Grace Chikwanda | INDIVIDUAL | $98 | 20 | Completed layby, occasional |
| `demo-rest-cust-005` | Rudo Banda | INDIVIDUAL | $340 | 68 | Weekend lunch regular |
| `demo-rest-cust-006` | Peter Nyoni | INDIVIDUAL | $185 | 37 | Coffee loyalty card holder |
| `demo-rest-cust-007` | Michelle Dube | INDIVIDUAL | $420 | 84 | Dinner regular, wine orders |
| `demo-rest-cust-008` | George Mhuru | INDIVIDUAL | $155 | 31 | Weekday lunch |
| `demo-rest-cust-009` | Agnes Zimba | INDIVIDUAL | $220 | 44 | Birthday special redeemed |
| `demo-rest-cust-010` | Farai Mutasa | INDIVIDUAL | $92 | 18 | Occasional |
| `demo-rest-cust-011` | Sunrise School | CORPORATE | $3,800 | 0 | Monthly catering order |
| `demo-rest-cust-012` | City Events Co | CORPORATE | $7,200 | 0 | Event catering contract |
| `demo-rest-cust-013` | ZimCorp Offices | CORPORATE | $1,500 | 0 | Monthly boardroom lunches |
| `demo-rest-cust-014` | Blessed Church | CORPORATE | $650 | 0 | Quarterly function catering |

**Purchase history per customer:** Each named individual has 5–25 orders over the last 90 days. Corporate customers have recurring monthly orders. All orders reference real menu products.

---

**FreshMart Grocery — 22 customers**

10 high-frequency individuals (weekly shoppers), 5 occasional individuals, 7 corporate accounts.

| Notable Customers | Type | Spend/month | Notable Feature |
|---|---|---|---|
| Martha Chikwanda | INDIVIDUAL | $280 | Weekly shopper, active TV layby |
| Brighton Mwangi | INDIVIDUAL | $210 | Gas stove layby in progress |
| Loveness Nyoni | INDIVIDUAL | $165 | Overdue layby, late fees applied |
| Sunrise School | CORPORATE | $1,200 | Monthly bulk order |
| ZimCorp Office | CORPORATE | $500 | Bi-weekly office supplies |
| City Hospital | CORPORATE | $850 | Weekly food/hygiene supplies |

Purchase history: 80–150 transactions/day → most attributed to Walk-in, 20% to named customers.

---

**Urban Threads Clothing — 17 customers**

Mix of fashion-forward individuals and school/organisation bulk buyers.

| Notable Customers | Type | Layby Status | Notes |
|---|---|---|---|
| Rudo Chimuka | INDIVIDUAL | ACTIVE (ladies dresses, $85) | 3 of 6 payments done |
| Faith Mlambo | INDIVIDUAL | ACTIVE (school uniforms, $120) | Corporate school order |
| Peter Ndlovu | INDIVIDUAL | COMPLETED | Collected, closed |
| Agnes Dube | INDIVIDUAL | OVERDUE | 2 missed payments, $5 late fee |
| Sunrise School | CORPORATE | NEW (uniform order $450) | Deposit paid only |
| St. Mary's Church | CORPORATE | CANCELLED | Refund processed |
| Sunrise Choir | CORPORATE | COMPLETED | Matching outfits, all paid |

---

**BuildPro Hardware — 20 customers**

8 trade accounts (contractors, construction companies), 12 retail customers.

| Notable Customers | Type | Spend | Account Type |
|---|---|---|---|
| Bright Builders (Pvt) Ltd | CORPORATE | $2,800/month | Trade account, Net 30 |
| Harare City Council | CORPORATE | $5,200/quarter | Government account |
| Local School Renovation | CORPORATE | $2,800 (one-time) | Project purchase |
| John Moyo (sole trader) | INDIVIDUAL | $850/month | Plumber, regular |
| Isaac Banda (electrician) | INDIVIDUAL | $620/month | Trade card holder |

---

**ProServices Group — 12 clients**

All corporate. Each has project history + monthly support orders.

| Client | Projects | Monthly Value |
|---|---|---|
| The Grand Café | 1 completed, 1 ongoing | $220/month support |
| FreshMart Grocery | 1 completed | $180/month support |
| BuildPro Hardware | Ongoing retainer | $220/month |
| City Hospital | 1 in progress | $400/month (project) |
| Sunrise School | 1 completed | — |
| Local Municipality | 1 in proposal | — |

---

### 15.2 Customer Rewards / Loyalty

For each business, seed `CustomerRewards` records for top 5 individual customers:
- Points earned from purchases (1 point per $1 spent)
- 1–2 redemptions per customer over last 90 days (free coffee, 10% discount voucher)
- Birthday bonus: customers born in current month get 50 bonus points

---

## 16. Promotions & Campaigns

### 16.1 Coupons (seed 8 per business, mix of active/expired/used)

| Business | Coupon Code | Discount | Type | Status | Usage |
|---|---|---|---|---|---|
| Grand Café | `CAFÉ10` | 10% off | Percentage | Active | 24/50 used |
| Grand Café | `LUNCH5` | $5 off lunch orders | Fixed | Active | 8/30 used |
| Grand Café | `BIRTHDAY20` | 20% birthday discount | Percentage | Active | 3/100 used |
| Grand Café | `EXPIREDOCT` | 15% off | Percentage | Expired | 45/50 used |
| FreshMart | `FRESH5` | $5 off $30+ purchase | Fixed | Active | 112/500 used |
| FreshMart | `DAIRY20` | 20% off dairy section | Percentage | Active | 67/200 used |
| FreshMart | `NEWCUST15` | 15% new customer | Percentage | Active | 22/100 used |
| FreshMart | `WEEKEND10` | 10% weekends | Percentage | Expired | 340/400 used |
| Urban Threads | `STYLE15` | 15% off any item | Percentage | Active | 18/80 used |
| Urban Threads | `BALE10` | $10 off bale items | Fixed | Active | 5/50 used |
| BuildPro | `TRADE10` | 10% trade discount | Percentage | Active | 34/100 used |
| BuildPro | `BULK15` | 15% on orders >$200 | Percentage | Active | 12/50 used |

**CouponUsages:** Each used coupon has 3–15 usage records referencing actual orders.

---

### 16.2 Promotional Campaigns

**Restaurant — 3 campaigns:**

| Campaign | Type | Period | Target | Metric |
|---|---|---|---|---|
| "Lunch Rush Special" | Discount on lunch combos (10% off) | Last 30 days | All customers | 180 orders affected, $145 discount given |
| "Weekend Family Deal" | Family combo promo | Weekends last 45 days | Families | 85 orders, $320 total discount |
| "Coffee Loyalty Month" | Buy 9 get 1 free (coffee) | Last 60 days | Coffee buyers | 24 free coffees redeemed |

**FreshMart — 3 campaigns:**

| Campaign | Type | Period | Target | Metric |
|---|---|---|---|---|
| "Fresh Fridays" | 15% off produce every Friday | Last 30 days | All | 220 orders, $180 discount |
| "Bulk Buy Savings" | 10% off qty 3+ same product | Ongoing | Wholesalers | 55 orders |
| "New Customer Welcome" | 15% first purchase | Last 90 days | New signups | 22 new customers, $185 discount |

**Urban Threads — 2 campaigns:**

| Campaign | Type | Period | Target |
|---|---|---|---|
| "End of Season Sale" | 30% off winter stock | Last 14 days | All |
| "School Uniform Drive" | 5% off school clothing | Last 21 days | Schools/parents |

**BuildPro — 2 campaigns:**

| Campaign | Type | Period | Target |
|---|---|---|---|
| "Trade Partner Month" | Extra 5% on top of trade price | Last 30 days | Trade accounts |
| "Builder's Bundle" | Plumbing + electrical bundle deals | Ongoing | Project buyers |

---

### 16.3 Menu Promotions (Restaurant only)

Linked to `MenuPromotions` model:
- **Happy Hour:** 20% off all beverages, Mon–Fri 15:00–17:00 (active)
- **Breakfast Special:** Free coffee with any breakfast before 9am (active)
- **Sunday Roast:** Fixed $12 meal deal — roast + 2 sides + juice (active, Sundays only)

---

## 17. System Users & Permission Sets

### 17.1 User Roles in the System

The application has a role/permission model with granular permissions. We seed **one user per permission profile** so every access level can be tested without logging in as the same admin account each time.

---

### 17.2 System Admin Users (cross-business)

| User ID | Name | Email | Password | Role | Access |
|---|---|---|---|---|---|
| `demo-user-sadmin` | System Administrator | `admin@demo.com` | `Demo@2024` | `systemAdmin` | Full access to everything |
| `demo-user-audit` | Audit Viewer | `audit@demo.com` | `Demo@2024` | Custom | Read-only + audit logs |

---

### 17.3 Per-Business Manager Users

Each business's General Manager / Director also has a system user linked to their employee record.

| Employee | Business | Email | Role |
|---|---|---|---|
| Marco Rossi | Grand Café | `marco@grandcafe-demo.com` | `manager` |
| Dorothy Sibanda | FreshMart | `dorothy@freshmart-demo.com` | `manager` |
| Nomsa Dlamini | Urban Threads | `nomsa@urbanthreads-demo.com` | `manager` |
| Robert Chinhamo | BuildPro | `robert@buildpro-demo.com` | `manager` |
| Michelle Foster | ProServices | `michelle@proservices-demo.com` | `manager` |

All manager users: password = `Demo@2024`

---

### 17.4 Varied Permission Profiles (8 additional demo users)

Each user linked to Grand Café as primary business but can be applied to any business for testing.

| User ID | Name | Email | Password | Permission Profile | Key Permissions |
|---|---|---|---|---|---|
| `demo-user-ops-mgr` | Operations Manager Demo | `opsmgr@demo.com` | `Demo@2024` | Operations Manager | canViewPayroll, canManageEmployees, canViewReports, canManageInventory, canManageOrders, canManageExpenses — **cannot** approve payroll or create contracts |
| `demo-user-cashier` | Cashier Demo | `cashier@demo.com` | `Demo@2024` | Cashier | canProcessSales, canViewOwnClockin, canViewOwnPayslip — **cannot** see other employees, reports, expenses |
| `demo-user-stockmgr` | Stock Manager Demo | `stockmgr@demo.com` | `Demo@2024` | Stock Manager | canManageInventory, canViewSuppliers, canCreatePurchaseOrders, canViewReports — **cannot** see payroll, employee HR |
| `demo-user-hr-mgr` | HR Manager Demo | `hrmgr@demo.com` | `Demo@2024` | HR Manager | canManageEmployees, canManageContracts, canViewPayroll, canManageLeave, canCreateContracts — **cannot** approve payroll, manage finances |
| `demo-user-payroll` | Payroll Officer Demo | `payroll@demo.com` | `Demo@2024` | Payroll Officer | canViewPayroll, canProcessPayroll, canApprovePayroll, canExportPayroll — **cannot** manage employees, HR records |
| `demo-user-sales` | Sales Rep Demo | `sales@demo.com` | `Demo@2024` | Sales Rep | canProcessSales, canViewProducts, canManageLayby, canViewCustomers — **cannot** see backend reports, payroll, staff |
| `demo-user-driver` | Driver Demo | `driver@demo.com` | `Demo@2024` | Driver / Field Staff | canViewOwnClockin, canLogTrips, canViewVehicles — minimal access; clock-in only + vehicle log |
| `demo-user-readonly` | Read-Only Viewer | `viewer@demo.com` | `Demo@2024` | Read Only | canViewReports, canViewOrders, canViewEmployeeList — absolutely no create/edit/delete |

---

### 17.5 Permission Sets Explained

The following permission flags are tested across the 8 profiles above:

| Permission Flag | Tested By |
|---|---|
| `canSystemAdmin` | System Admin |
| `canManageUsers` | System Admin, HR Manager |
| `canManageEmployees` | Manager, HR Manager, Ops Manager |
| `canCreateContracts` / `canManageContracts` | Manager, HR Manager |
| `canViewPayroll` | Manager, HR Manager, Payroll Officer, Ops Manager |
| `canProcessPayroll` / `canApprovePayroll` | Manager, Payroll Officer |
| `canExportPayroll` | Manager, Payroll Officer |
| `canManageInventory` | Manager, Stock Manager, Ops Manager |
| `canManageOrders` / `canProcessSales` | Manager, Ops Manager, Cashier, Sales Rep |
| `canManageLayby` | Manager, Sales Rep |
| `canViewCustomers` / `canManageCustomers` | Manager, Sales Rep |
| `canManageSuppliers` | Manager, Stock Manager |
| `canViewReports` | Manager, Ops Manager, Stock Manager, Read Only |
| `canManageExpenses` | Manager, Ops Manager |
| `canApproveExpenses` | Manager |
| `canManageLeave` | Manager, HR Manager |
| `canViewVehicles` / `canLogTrips` | Manager, Ops Manager, Driver |
| `canManageWifi` | Manager, System Admin |
| `canViewOwnClockin` | All staff |
| `canViewOwnPayslip` | All staff |

---

### 17.6 Linked Employee System Users

Beyond the above test users, the following employee types get system users created (linked to their Employee record) so the kiosk and clock-in features can be tested with real employee accounts:

- All 5 General Managers / Directors (already listed above)
- All 5 Deputy Managers / Ops Supervisors (manager role)
- 1 cashier per business for POS testing (cashier role)
- 1 driver per business for driver dashboard testing

**Total system users created:** 2 cross-business + 5 GMs + 5 deputies + 5 cashiers + 5 drivers = **22 system users**

---

### 17.7 New Seed Script & Admin API

| File | Purpose |
|---|---|
| `scripts/seed-system-users-demo.js` | Creates all 22 system users + 8 varied-permission test users |
| `src/app/api/admin/seed-system-users/route.ts` | Admin API endpoint |

**IMPORTANT:** When resetting, system users for demo employees are deleted together with the employee record. The 10 fixed test users (`demo-user-*`) are recreated fresh on every reseed.

---

## 18. Files to Create (Updated Full List)

| File | Purpose |
|---|---|
| `scripts/seed-services-demo.js` | ProServices: employees, products, clients, projects, contractors, expense accounts |
| `scripts/seed-vehicles-full-demo.js` | All 7 vehicles, 7 drivers, 30-day trips, maintenance, expenses, licenses |
| `scripts/seed-attendance-demo.js` | 30-day clock-in/out records for all 5 businesses |
| `scripts/seed-payroll-clockin-demo.js` | Payroll periods + entries + OT/deduction/vacation adjustments |
| `scripts/seed-login-log-demo.js` | EmployeeLoginLog for kiosk testing |
| `scripts/seed-customers-full-demo.js` | 85 customers across all businesses + purchase history + loyalty points |
| `scripts/seed-layby-demo.js` | CustomerLayby + CustomerLaybyPayment (all statuses) |
| `scripts/seed-promotions-demo.js` | Coupons + CouponUsages + PromoCampaigns + MenuPromotions |
| `scripts/seed-stock-movements-demo.js` | BusinessStockMovements (supplier restocking + sales deductions) |
| `scripts/seed-interbusiness-loans-demo.js` | InterBusinessLoans umbrella → businesses + repayment history |
| `scripts/seed-contractors-full-demo.js` | Persons + Projects + ProjectContractors all businesses |
| `scripts/seed-system-users-demo.js` | 22 system users + 8 varied-permission test users |
| `src/app/api/admin/demo/reset/route.ts` | Reset endpoint (all or by business) |
| `src/app/api/admin/demo/reseed/route.ts` | Reseed endpoint |
| `src/app/api/admin/demo/status/route.ts` | Status — record counts per business |
| `src/app/api/admin/seed-services/route.ts` | Admin API: services business |
| `src/app/api/admin/seed-vehicles-demo/route.ts` | Admin API: vehicles module |
| `src/app/api/admin/seed-attendance/route.ts` | Admin API: attendance records |
| `src/app/api/admin/seed-system-users/route.ts` | Admin API: system users |
| `src/app/api/admin/seed-promotions/route.ts` | Admin API: promotions + campaigns |

---

## 19. Files to Update (Updated Full List)

| File | Changes Required |
|---|---|
| `scripts/seed-demo-businesses.js` | Add ProServices; stable `demo-*` ID prefixes; umbrella link |
| `scripts/seed-realistic-employees-complete.js` | 71 employees with schedule fields + stable IDs |
| `scripts/seed-contracts-demo.js` | Schedule fields + pdfGenerationData in all contracts |
| `scripts/seed-demo-expense-accounts.js` | 5–6 accounts per business + payment/deposit history |
| `scripts/seed-payroll-demo.js` | New adjustment types; vacation_payout scenario |
| `scripts/seed-leave-management-demo.js` | Per-business vacation days; more leave variety |
| `scripts/seed-employee-benefits-demo.js` | Per-business benefit structures |
| `scripts/seed-restaurant-demo.js` | Expand to 50 products; menu combos; meal program |
| `scripts/seed-grocery-demo.js` | 115 products with EAN-13; 7 suppliers |
| `scripts/seed-clothing-demo.js` | 12 bales; 120 variant products; layby |
| `scripts/seed-hardware-demo.js` | 95 products; 6 suppliers; R710 WiFi |
| `scripts/seed-dev-data.js` | Remove vehicle data (moved to seed-vehicles-full-demo.js) |
| `scripts/seed-all-demo-data.js` | Add all 20 new scripts; enforce dependency order |
| `src/app/api/admin/seed-complete-demo/route.ts` | Add all new endpoints to orchestrator |

## 20. Data Volume Summary (Final)

| Business | Employees | Products | Orders (45d) | Attendance | Customers | Suppliers | Contractors | Coupons |
|---|---|---|---|---|---|---|---|---|
| The Grand Café | 15 | 50 | ~1,300 | ~390 | 14 | 6 | 4 | 4 |
| FreshMart Grocery | 18 | 115 | ~4,500 | ~468 | 22 | 7 | 4 | 4 |
| Urban Threads | 12 | 120 | ~750 | ~312 | 17 | 4 | 3 | 2 |
| BuildPro Hardware | 16 | 95 | ~1,350 | ~416 | 20 | 6 | 4 | 2 |
| ProServices Group | 10 | 28 | ~300 | ~220 | 12 | 4 | 4 | 0 |
| **TOTAL** | **71** | **408** | **~8,200** | **~1,806** | **85** | **27** | **19** | **12** |

Additional records:
- 7 vehicles × trips/maintenance/expenses = ~750 vehicle records
- InterBusinessLoans: 6 loans + ~30 repayment transactions
- Expense account payments: ~350 entries total
- Promotions: 12 coupons + ~200 coupon usages + 10 campaigns + 3 menu promotions
- Loyalty/Rewards: ~85 customer reward records
- Login Logs: ~70 EmployeeLoginLog entries
- System Users: 22 employee users + 10 test permission users = 32 total

**Grand total DB rows created: approximately 30,000–35,000**

---

## 16. Test Scenario Coverage

### End-to-End Scenarios After Full Seed — Including Customers, Promotions & Permissions

**HR & Payroll:**
- [ ] Open any employee → view contract with working hours clearly shown
- [ ] Print contract PDF → "6:00 AM to 5:00 PM, 6.5 days/week, 14 days annual leave" for chef
- [ ] Renew contract → schedule fields editable, PDF updates accordingly
- [ ] View payroll entry for late employee → clock_in_deduction adjustment visible
- [ ] Approve OT adjustment → net pay recalculates
- [ ] Override OT amount → custom value applies
- [ ] Terminated employee → vacation payout pending adjustment
- [ ] Approve vacation payout → leave balance deducted, net pay updated

**Vehicles:**
- [ ] View vehicle list → 7 vehicles each with mileage, license status
- [ ] View vehicle trips → 30 days of trips with distances, fuel, destinations
- [ ] Add a new trip → linked to driver + vehicle + business
- [ ] View maintenance history → services listed with costs
- [ ] License expiry alert → 2 vehicles near expiry shown as warning
- [ ] View vehicle expenses → fuel receipts, insurance, repairs listed
- [ ] Driver authorization → license class, expiry visible per driver

**Inventory:**
- [ ] Grocery: scan EAN barcode → product found, price shown
- [ ] Process checkout → stock quantity reduced in BusinessStockMovements
- [ ] Low stock alert → produce items below reorder level highlighted
- [ ] Clothing: bale cost recovery report → shows % recovered per bale
- [ ] Hardware: supplier restock recorded → stock increases
- [ ] Clothing layby: view in-progress layby → payment history, balance remaining
- [ ] Complete layby → items released, status COMPLETED

**Financial:**
- [ ] Expense account → view deposits, payments, and loan for Grand Café
- [ ] Supplier payment → paid from expense account → balance reduces
- [ ] InterBusinessLoan → view umbrella loans to all 5 businesses
- [ ] Loan repayment → deposit back to umbrella → balance updates

**Kiosk:**
- [ ] Card scan on login screen → EmployeeLoginLog record created
- [ ] Declined login → action=declined visible in Login Tracking tab
- [ ] Login Tracking tab → today's events listed with employee, action, method, time

**Contractors:**
- [ ] ProServices projects → Contractors tab shows linked Persons with roles
- [ ] CleanMaster appears on Grand Café, FreshMart, Urban Threads projects

**Multi-business:**
- [ ] Shingi Chikosi → appears in ProServices + Grand Café business assignments
- [ ] Umbrella Holdings → inter-business loans visible, all businesses linked

**Customers & Purchase History:**
- [ ] Open customer profile → full purchase history (last 90 days) visible
- [ ] Customer loyalty points correct (1pt per $1, redeemed 1–2 times)
- [ ] Birthday bonus: customers born this month show +50 bonus points
- [ ] Corporate customer → bulk order history, invoice totals visible
- [ ] Customer layby: ACTIVE → shows installments paid, balance, due date
- [ ] Customer layby: OVERDUE → shows late fee applied, missed payments flagged
- [ ] Customer layby: COMPLETED → items released flag set, full payment history
- [ ] Customer layby: CANCELLED → refund payment record visible
- [ ] Walk-in customer: used on all anonymous POS sales

**Promotions & Campaigns:**
- [ ] Apply coupon `CAFÉ10` at Grand Café POS → 10% applied to order
- [ ] Apply `FRESH5` at FreshMart → $5 deducted from $30+ basket
- [ ] Expired coupon `EXPIREDOCT` → rejected with clear error message
- [ ] Campaign report → "Lunch Rush Special" shows 180 orders affected, $145 discount
- [ ] Menu promotion "Happy Hour" → beverages discounted 15:00–17:00 automatically
- [ ] Coupon usage report → shows which customers used each coupon code
- [ ] Campaign ROI visible (total orders vs. total discount given)

**System Users & Permissions:**
- [ ] Login as `cashier@demo.com` → POS visible, payroll/HR tabs hidden
- [ ] Login as `stockmgr@demo.com` → inventory/suppliers accessible, payroll hidden
- [ ] Login as `hrmgr@demo.com` → employee management, contracts, leave visible; financial totals hidden
- [ ] Login as `payroll@demo.com` → payroll processing full access; cannot edit employee records
- [ ] Login as `opsmgr@demo.com` → operations full access; cannot approve payroll or create contracts
- [ ] Login as `sales@demo.com` → POS, customers, layby visible; reports and payroll hidden
- [ ] Login as `driver@demo.com` → clock-in + vehicle log only; everything else hidden
- [ ] Login as `viewer@demo.com` → all views read-only; no create/edit/delete buttons visible
- [ ] Login as `marco@grandcafe-demo.com` (GM) → full access to Grand Café only; cannot see other businesses
- [ ] Login as `admin@demo.com` → system admin; all businesses, all features, user management

---

## 21. Scope Summary

| Category | New Files | Updated Files |
|---|---|---|
| Seed Scripts | 13 | 14 |
| Admin API Routes | 7 | 1 |
| **Total** | **20** | **15** |

**Estimated DB rows:** 30,000–35,000
**Estimated implementation effort:** 7–10 focused sessions (can be done in phases)

### Implementation Phases (suggested order if doing incrementally)

- **Phase A** (Foundation): businesses, employees, contracts, expense accounts → can test HR/Payroll immediately
- **Phase B** (Products & Operations): products, suppliers, orders, stock movements → can test POS/inventory
- **Phase C** (Customers & Promotions): customers, layby, coupons, campaigns → can test customer-facing features
- **Phase D** (Vehicles): vehicles, drivers, trips, maintenance → can test vehicle module
- **Phase E** (Payroll Deep): attendance, clock-in, OT adjustments, vacation payout → can test full payroll cycle
- **Phase F** (Users & Permissions): system users, permission profiles → can test access control
- **Phase G** (Tracking & WiFi): login logs, WiFi tokens, printers → completes full demo

---

## 22. Employee Contract Data (ALL 71 Employees)

> **Note:** Investigation confirmed `scripts/seed-contracts-demo.js` does **not exist**. The plan therefore creates a new file `scripts/seed-contracts-full-demo.js` which generates contracts for all 71 employees. The "Files to Update" reference to `seed-contracts-demo.js` in Section 19 is superseded by this new file.

---

### 22.1 Universal Contract Rules

Every employee record (all 71) must have exactly **one active** `EmployeeContracts` record with:

| Field | Rule |
|---|---|
| `id` | `demo-{prefix}-con-{NNN}` (e.g., `demo-rest-con-001`) |
| `contractNumber` | `CON-{BUSINESS}-{NNN}` (e.g., `CON-REST-001`) |
| `employeeId` | References `demo-{prefix}-emp-{NNN}` |
| `compensationTypeId` | Monthly salary type (from seeded compensation types) |
| `isSalaryBased` | `true` for all employees |
| `baseSalary` | Employee's monthly salary (from roster tables above) |
| `primaryBusinessId` | The business this employee belongs to |
| `supervisorId` | Follows the supervisor chain below |
| `status` | `active` (most), 2 per business = `expiring_soon` for renewal testing |
| `createdBy` | System Admin user ID |
| `employeeSignedAt` | `startDate` (pre-signed) |
| `managerSignedAt` | `startDate` (pre-signed) |
| `version` | `1` |
| `pdfGenerationData` | Full JSON with all fields including schedule (for reprint) |

---

### 22.2 Contract Duration by Tier

| Tier | Duration | `contractDurationMonths` | Start Date | End Date | Probation |
|---|---|---|---|---|---|
| **Management** | 12 months (annual) | `12` | 14 months ago | 2 months from now *(near-expiry — triggers renewal test)* | 3 months |
| **Operations** | 6 months | `6` | 7 months ago | 1 month ago *(expired — already renewed once, current contract active)* | 1 month |
| **Support** | 6 months | `6` | 8 months ago | 2 months ago *(also renewed — current contract 4 months remaining)* | 1 month |

> **Renewal Test Coverage:** Every management employee has a contract expiring ~2 months from now → UI shows "Renewal Due Soon" badge. Operations employees show a completed renewal chain (`isRenewal=true`, `renewalCount=1`, `previousContractId` set).

---

### 22.3 Supervisor Chain per Business

**The Grand Café:**
- GMs/Directors: `supervisorId=null`, `supervisorName='Board of Directors'`
- Head Chef (003), Sous Chef (004): supervisor = Marco Rossi (001)
- All Operations (005–012): supervisor = Sandra Ncube (002) or Tendai Mhaka (003) for kitchen staff
- Support (013–015): supervisor = Sandra Ncube (002)

**FreshMart Grocery:**
- GM Dorothy Sibanda (001): `supervisorId=null`
- Deputy Charles Banda (002): supervisor = Dorothy (001)
- Dept heads (003–004): supervisor = Dorothy (001)
- Operations (005–015): supervisor = Charles Banda (002) or dept head
- Support (016–018): supervisor = Charles Banda (002)

**Urban Threads Clothing:**
- Store Manager Nomsa Dlamini (001): `supervisorId=null`
- Asst Manager Tafadzwa Moyo (002): supervisor = Nomsa (001)
- Senior Sales Patience (003): supervisor = Nomsa (001)
- Operations (004–010): supervisor = Tafadzwa (002)
- Support (011–012): supervisor = Tafadzwa (002)

**BuildPro Hardware:**
- Store Manager Robert Chinhamo (001): `supervisorId=null`
- Deputy Isaac Murambe (002): supervisor = Robert (001)
- Finance Patricia (003), Warehouse Joseph (004): supervisor = Robert (001)
- Operations (005–013): supervisor = Isaac Murambe (002)
- Support (014–016): supervisor = Isaac Murambe (002)

**ProServices Group:**
- MD Michelle Foster (001): `supervisorId=null`
- Ops Manager David Murewa (002): supervisor = Michelle (001)
- Finance/HR Josephine (003): supervisor = Michelle (001)
- Operations (004–008): supervisor = David Murewa (002)
- Support (009–010): supervisor = David Murewa (002)

---

### 22.4 Schedule Fields per Employee (Copied from Roster)

All contracts carry these four fields populated from the employee roster tables in Sections 4–8:

| Field | Source | Example |
|---|---|---|
| `workDaysPerWeek` | From roster schedule column | `6` for Mon–Sat; `5` for Mon–Fri; `7` for rotating |
| `dailyStartTime` | "HH:MM" 24h format | `"07:00"` |
| `dailyEndTime` | "HH:MM" 24h format | `"17:00"` |
| `annualVacationDays` | 14 for ops businesses, 21 for services | `14` or `21` |

These same values are mirrored to the `Employees` record (`scheduledStartTime`, `scheduledEndTime`, `scheduledDaysPerWeek`, `annualVacationDays`).

---

### 22.5 Annual Vacation Days by Business

| Business | `annualVacationDays` | Rationale |
|---|---|---|
| The Grand Café | `14` | Standard retail/hospitality |
| FreshMart Grocery | `14` | Standard retail |
| Urban Threads Clothing | `14` | Standard retail |
| BuildPro Hardware | `14` | Standard retail/trade |
| ProServices Group | `21` | Professional services standard |

---

### 22.6 Contract Benefits (per contract, linked via `ContractBenefits`)

Each contract references the matching `BenefitType`. Benefits seeded per tier:

**All employees (base):**
- Medical Aid Contribution: $45/month (employer contribution)
- Meal Allowance: $2.50/shift × working days

**Management tier additions:**
- Pension Fund Contribution: $60/month
- Management Bonus (discretionary): noted on contract, no fixed amount

**Driver employees:**
- Vehicle Allowance: $80/month
- Fuel Allowance: covered via vehicle expense account (noted in contract)

**ProServices Group only:**
- Professional Development Allowance: $50/month
- Overtime not applicable (exempt, salary-based)

---

### 22.7 `pdfGenerationData` JSON Structure

Every contract's `pdfGenerationData` field stores a complete snapshot so the PDF can be reprinted without re-fetching all related records:

```json
{
  "contractNumber": "CON-REST-001",
  "employeeName": "Marco Rossi",
  "employeeNumber": "EMP-REST-001",
  "jobTitle": "General Manager",
  "businessName": "The Grand Café",
  "umbrellaName": "Umbrella Holdings (Pvt) Ltd",
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2026-03-15T00:00:00.000Z",
  "baseSalary": 850,
  "compensationType": "Monthly",
  "workDaysPerWeek": 6,
  "dailyStartTime": "07:00",
  "dailyEndTime": "17:00",
  "annualVacationDays": 14,
  "probationPeriodMonths": 3,
  "supervisorName": "Board of Directors",
  "supervisorTitle": "Directors",
  "benefits": [
    { "name": "Medical Aid", "amount": 45, "isPercentage": false },
    { "name": "Meal Allowance", "amount": 2.5, "isPercentage": false },
    { "name": "Pension Fund", "amount": 60, "isPercentage": false }
  ]
}
```

---

### 22.8 Renewal Test Scenarios

To test the renewal workflow end-to-end, seed these specific scenarios:

| Employee | Business | Scenario | Expected State |
|---|---|---|---|
| Marco Rossi (001) | Grand Café | Contract ends in 2 months | `status=active`, renewal badge visible in UI |
| Dorothy Sibanda (001) | FreshMart | Contract ends in 2 months | `status=active`, renewal badge visible in UI |
| Nomsa Dlamini (001) | Urban Threads | Contract ends in 2 months | `status=active`, renewal badge visible in UI |
| Robert Chinhamo (001) | BuildPro | Contract ends in 2 months | `status=active`, renewal badge visible in UI |
| Michelle Foster (001) | ProServices | Contract ends in 2 months | `status=active`, renewal badge visible in UI |
| Farai Dube (005) | Grand Café | Already renewed once | Original `status=expired`; current `isRenewal=true`, `renewalCount=1` |
| Ruth Murambwe (009) | FreshMart | Already renewed once | Same pattern as above |

---

### 22.9 New Seed Script: `scripts/seed-contracts-full-demo.js`

**Purpose:** Creates `EmployeeContracts` + `ContractBenefits` records for all 71 demo employees.

**Script structure:**
```
1. Load all demo employees by ID prefix from DB (or use hardcoded ID map)
2. Load job titles, compensation types, benefit types from DB
3. For each employee:
   a. Calculate startDate / endDate based on tier (management=12m, ops/support=6m)
   b. Build pdfGenerationData JSON
   c. Upsert EmployeeContracts (using demo-{prefix}-con-{NNN} as ID)
   d. Delete existing ContractBenefits for this contract (idempotent reset)
   e. Create ContractBenefits (medical, meal, pension if management, vehicle if driver)
4. For renewal test employees: create expired original contract + renewed current contract
5. Log summary: {business}: {n} contracts created, {n} benefits created
```

**Idempotency:** Uses `upsert` on `id` field. Safe to re-run; benefits are deleted+recreated.

**Dependency:** Must run after `seed-realistic-employees-complete.js` (employees must exist).

---

### 22.10 Update to Implementation Order

Phase 4 step 12 changes from:
```
12. seed-contracts-demo.js (UPDATE)
```
To:
```
12. seed-contracts-full-demo.js (NEW) — contracts + benefits for all 71 employees
```

---

### 22.11 Update to Files Lists

**Add to Section 18 (Files to Create):**
| File | Purpose |
|---|---|
| `scripts/seed-contracts-full-demo.js` | EmployeeContracts + ContractBenefits for all 71 employees across 5 businesses |

**Remove from Section 19 (Files to Update):**
- ~~`scripts/seed-contracts-demo.js`~~ → **file does not exist**; superseded by `seed-contracts-full-demo.js`

---

### 22.12 Contract Count Summary

| Business | Employees | Active Contracts | Expired (renewal chain) | Near-Expiry |
|---|---|---|---|---|
| The Grand Café | 15 | 15 | 2 (Farai + 1 other) | 1 (Marco) |
| FreshMart Grocery | 18 | 18 | 2 | 1 (Dorothy) |
| Urban Threads | 12 | 12 | 2 | 1 (Nomsa) |
| BuildPro Hardware | 16 | 16 | 2 | 1 (Robert) |
| ProServices Group | 10 | 10 | 1 | 1 (Michelle) |
| **TOTAL** | **71** | **71 active** | **9 expired** | **5 near-expiry** |

Total `EmployeeContracts` rows: **80** (71 active + 9 expired originals from renewal chains)
Total `ContractBenefits` rows: **~220** (avg ~2.75 benefits per contract × 80)
