# Deployment & Demo Data Seeding Guide

**Last Updated:** 2025-11-23
**Version:** MBM-114A

---

## Overview

This guide explains how to deploy the Multi-Business Multi-Apps system and seed demo data for testing and demonstration purposes.

---

## Prerequisites

Before running any seeding scripts, ensure:

1. **Database is set up and migrations are applied:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Prisma client is generated:**
   ```bash
   npx prisma generate
   ```

3. **Environment variables are configured:**
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - Other required environment variables

4. **Demo businesses exist in database:**
   The seeding scripts expect businesses with "[Demo]" in their names. If these don't exist, create them first.

---

## Quick Start - Master Seeding Script

The easiest way to seed all demo data is to use the master seeding script:

```bash
node scripts/seed-all-demo-data.js
```

This will automatically run all seeding in the correct order:
1. **Expense Categories** (via migrations/seed)
2. **Demo Employees** (with user accounts and business memberships)
3. **Demo Business Expenses** (30 days of expenses)
4. **Demo Sales Orders** (30 days of orders with sales person assignments)

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║    🌱 Master Demo Data Seeding Script - MBM-114A          ║
╚════════════════════════════════════════════════════════════╝

🔍 Running pre-flight checks...
✅ Found 5 demo businesses
✅ Found 79 expense categories

[$1/4] 👥 Seeding Demo Employees...
✅ Demo employees seeded successfully

[2/4] 💸 Seeding Demo Business Expenses...
✅ Demo business expenses seeded successfully

[3/4] 🛒 Seeding Sales Orders with Employees...
✅ Sales orders seeded successfully

[4/4] ✅ Running Final Verification...
📊 Data Summary:
   Demo Businesses: 5
   Employees: 18
   Business Expenses: 1,519
   Sales Orders: 1,586
   Orders with Sales Person: 1,586 (100.0%)

✅ All demo data seeded successfully in 7.3s
```

---

## Individual Seeding Scripts

If you need more control, you can run seeding scripts individually **in this exact order**:

### 1. Expense Categories (Usually via Migration)

Categories should be automatically seeded when running migrations. If not:

```bash
npx prisma db seed
```

This reads from `seed-data/expense-types/*.md` files and creates:
- Expense Domains (Restaurant, Grocery, Hardware, Clothing, etc.)
- Expense Categories (11-12 per domain)
- Expense Subcategories (detailed expense items)

### 2. Demo Employees

```bash
node scripts/seed-demo-employees.js
```

Creates for each demo business:
- **User accounts** (email + password)
- **Employee records** (with job titles and compensation)
- **Business memberships** (with role-based permissions)

**Default credentials:**
- Email: `[firstname].[lastname]@[businesstype]-demo.com`
- Password: `Demo@123`
- Example: `sarah.johnson@restaurant-demo.com` / `Demo@123`

**Employee roles:**
- **Manager:** Full access, can view all reports
- **Sales:** POS access, can view own sales for commission
- **Staff:** Limited access (e.g., kitchen, stock clerks)

### 3. Demo Business Expenses

```bash
node scripts/seed-demo-business-expenses.js
```

Creates 30 days of expense records for each demo business using:
- Existing expense categories from step 1
- Random realistic amounts per expense type
- Assigned to employees from step 2
- ~300 expenses per business (~1,500 total)

### 4. Demo Sales Orders

```bash
node scripts/seed-sales-orders-all-businesses.js
```

Creates 30 days of sales orders with:
- Order items linked to products
- Sales person assigned (employeeId)
- Weighted distribution (sales staff get 4x more orders than managers)
- ~400 orders per business (~1,600 total)

---

## Data Dependencies

**Critical:** Data must be seeded in this order due to foreign key dependencies:

```
ExpenseCategories (via migration)
        ↓
    Employees
        ↓
   ┌────┴────┐
   ↓         ↓
Expenses   Orders
```

**Why this order matters:**
- Employees need expense categories to exist (for permission templates)
- Expenses need employees (for `employeeId` field)
- Orders need employees (for sales person assignment)
- Expenses need categories (for `categoryId` field)

---

## Seeding Characteristics

### Re-runnable Scripts

All seeding scripts are **re-runnable**. They will:
1. Check for existing demo data
2. Clean up existing data (delete before re-creating)
3. Seed fresh data

This means you can safely run them multiple times without creating duplicates.

### What Gets Cleaned Up

When re-running seeding:
- ✅ Demo employees (email contains "-demo.com")
- ✅ User accounts for demo employees
- ✅ Business memberships for demo employees
- ✅ Business expenses for demo businesses
- ✅ Sales orders for demo businesses
- ❌ Demo businesses themselves (not deleted)
- ❌ Expense categories (not deleted)

---

## Deployment Checklist

### Fresh Deployment

1. **Set up database:**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Create demo businesses** (if they don't exist)

3. **Run master seeding script:**
   ```bash
   node scripts/seed-all-demo-data.js
   ```

4. **Verify data:**
   - Check that employees exist
   - Check that expenses exist
   - Check that orders exist
   - Check that orders have employeeId

5. **Start application:**
   ```bash
   npm run dev
   # or
   npm run build && npm start
   ```

### Resetting Demo Data

To reset demo data to fresh state:

```bash
node scripts/seed-all-demo-data.js
```

This will clean up and re-seed all demo data.

### Troubleshooting

**Error: "No demo businesses found"**
- Create businesses with "[Demo]" in their names
- Or update the master script to match your business naming convention

**Error: "No expense categories found"**
- Run: `npx prisma db seed`
- Or check that `seed-data/expense-types/*.md` files exist

**Error: "Prisma relation not found"**
- Run: `npx prisma generate`
- Ensure schema is up to date with migrations

**Slow seeding (>30 seconds)**
- Normal for first run as it creates many records
- Subsequent runs are faster due to cleanup being quicker

---

## Testing Demo Data

After seeding, test these features:

### 1. Employee Login
```
URL: http://localhost:8080/login
Email: sarah.johnson@restaurant-demo.com
Password: Demo@123
```

### 2. Sales Analytics Dashboard
```
URL: http://localhost:8080/restaurant/reports/sales-analytics
- Should show 30 days of sales data
- Should show top products, categories, sales reps
- Should show daily sales trend chart
```

### 3. Visual Analytics Dashboard
```
URL: http://localhost:8080/restaurant/reports/dashboard
- Should show real expense data (no mock data)
- Should have employee filter dropdown
- Should update when selecting different employees
```

### 4. End-of-Day Reports
```
URL: http://localhost:8080/restaurant/reports/end-of-day
- Should show today's sales summary
- Should show orders and payment methods
```

---

## Demo Data Summary

### What Gets Seeded

**Per Demo Business:**
- 3-4 employees with user accounts
- ~300 expenses over 30 days
- ~400 orders over 30 days
- 100% of orders assigned to sales persons

**Total Across All Businesses:**
- 18 employees (with 18 user accounts and memberships)
- ~1,500 expenses
- ~1,600 orders
- All data covers last 30 days

### Demo Employees by Business

**Restaurant [Demo]:**
- Sarah Johnson (Manager)
- Michael Chen (Head Chef/Staff)
- Emily Rodriguez (Sales Representative)
- David Williams (Sales Representative)

**Grocery [Demo 1]:**
- James Brown (Store Manager)
- Lisa Garcia (Cashier/Sales)
- Robert Martinez (Stock Clerk/Staff)
- Jennifer Davis (Cashier/Sales)

**Grocery [Demo 2]:**
- William Miller (Store Manager)
- Patricia Wilson (Cashier/Sales)
- Richard Moore (Stock Clerk/Staff)

**Hardware [Demo]:**
- Thomas Anderson (Store Manager)
- Christopher Taylor (Sales Associate)
- Nancy Thomas (Sales Associate)
- Daniel Jackson (Stock Clerk/Staff)

**Clothing [Demo]:**
- Miro Hwandaza (Store Manager) *existing*
- Amanda Jackson (Sales Associate)
- Kevin Thompson (Sales Associate)
- Sophia Lee (Sales Representative)

---

## Production Considerations

**⚠️ IMPORTANT:** This seeding is for **DEMO/TEST PURPOSES ONLY**

For production:
- Do NOT run demo seeding scripts
- Create real businesses and employees through the UI
- Use proper authentication and password management
- Set up proper backup and recovery procedures

---

## Maintenance

### Updating Seed Data

To modify demo data:

1. Edit individual seeding scripts in `scripts/` directory
2. Update employee lists, expense amounts, or order quantities
3. Re-run master script to apply changes

### Adding New Business Types

1. Create demo business in database
2. Add corresponding expense domain in `seed-data/expense-types/`
3. Re-run master seeding script

---

## Support

For issues with seeding:
1. Check error messages from master script
2. Verify prerequisites are met
3. Check individual script logs
4. Ensure database schema is current

**Related Documentation:**
- `DEMO-TEST-CREDENTIALS.md` - List of all demo credentials
- `MBM-114B-SALES-ANALYTICS-COMPLETE.md` - Sales analytics guide
- `projectplan.md` - Current project status

---

**Last verified:** 2025-11-23
**Script version:** MBM-114A
**Tested on:** PostgreSQL with Prisma 6.15.0
