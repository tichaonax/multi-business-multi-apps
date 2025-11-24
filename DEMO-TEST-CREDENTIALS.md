# Demo & Test User Credentials

**Last Updated:** 2025-11-23
**Project:** Multi-Business Management System
**Purpose:** Demo and testing credentials for MBM-114a implementation

---

## 🔐 Admin Seeding Endpoints

All seeding endpoints require **admin authentication** and are accessed via POST requests:

### Available Endpoints

| Endpoint | Purpose | Re-runnable |
|----------|---------|-------------|
| `POST /api/admin/seed-demo-employees` | Create demo employees with user accounts | ✅ Yes |
| `POST /api/admin/seed-demo-expenses` | Create 30 days of business expenses | ✅ Yes |
| `POST /api/admin/seed-demo-orders` | Create 30 days of sales orders | ✅ Yes |

**Note:** All endpoints automatically clean up existing demo data before re-seeding, making them safe to run multiple times.

---

## 👥 Demo Employee Credentials

All demo employees share the **same password**: `Demo@123`

### Email Format
```
firstname.lastname@businesstype-demo.com
```

### 🍽️ Restaurant Demo Business

| Name | Email | Role | Job Title |
|------|-------|------|-----------|
| Sarah Johnson | sarah.johnson@restaurant-demo.com | Manager | General Manager |
| Michael Chen | michael.chen@restaurant-demo.com | Staff | Sales Associate |
| Emily Rodriguez | emily.rodriguez@restaurant-demo.com | Sales | Sales Representative |
| David Williams | david.williams@restaurant-demo.com | Sales | Sales Representative |

**Business ID:** `restaurant-demo-business`

---

### 🛒 Grocery Demo Business #1

| Name | Email | Role | Job Title |
|------|-------|------|-----------|
| James Brown | james.brown@grocery-demo.com | Manager | Operations Manager |
| Lisa Garcia | lisa.garcia@grocery-demo.com | Sales | Sales Associate |
| Robert Martinez | robert.martinez@grocery-demo.com | Staff | Inventory Clerk |
| Jennifer Davis | jennifer.davis@grocery-demo.com | Sales | Sales Associate |

**Business ID:** `grocery-demo-business`

---

### 🛒 Grocery Demo Business #2

| Name | Email | Role | Job Title |
|------|-------|------|-----------|
| William Miller | william.miller@grocery-demo.com | Manager | General Manager |
| Patricia Wilson | patricia.wilson@grocery-demo.com | Sales | Sales Associate |
| Richard Moore | richard.moore@grocery-demo.com | Staff | Inventory Clerk |

**Business ID:** `grocery-demo-2`

---

### 🔧 Hardware Demo Business

| Name | Email | Role | Job Title |
|------|-------|------|-----------|
| Thomas Anderson | thomas.anderson@hardware-demo.com | Manager | Sales Manager |
| Christopher Taylor | christopher.taylor@hardware-demo.com | Sales | Sales Representative |
| Nancy Thomas | nancy.thomas@hardware-demo.com | Sales | Sales Associate |
| Daniel Jackson | daniel.jackson@hardware-demo.com | Staff | Inventory Clerk |

**Business ID:** `hardware-demo-business`

---

### 👕 Clothing Demo Business

| Name | Email | Role | Job Title |
|------|-------|------|-----------|
| Miro Hwandaza | miro.hwandaza@clothing-demo.com | Manager | General Manager |
| Amanda Jackson | amanda.jackson@clothing-demo.com | Sales | Sales Associate |
| Kevin Thompson | kevin.thompson@clothing-demo.com | Sales | Sales Associate |
| Sophia Lee | sophia.lee@clothing-demo.com | Sales | Sales Representative |

**Business ID:** `clothing-demo-business`

**Note:** Miro Hwandaza may already exist in your system and will be skipped during seeding.

---

## 🔑 Permission Levels by Role

### **Sales Staff**
- ✅ POS Access (create orders, process payments)
- ✅ View products and check stock
- ✅ View and create customers
- ✅ View **own** sales reports (for commission)
- ❌ Cannot view all sales reports
- ❌ Cannot adjust inventory

**Purpose:** Perfect for testing commission tracking and sales person filtering

---

### **Manager**
- ✅ Full POS access (including void orders)
- ✅ Create, edit, delete products
- ✅ View **all** sales reports (for commission management)
- ✅ Export reports
- ✅ Adjust inventory and stock
- ✅ View employees and schedules
- ✅ Create and view expenses
- ❌ Cannot approve expenses (requires higher permission)

**Purpose:** Testing management dashboards and comprehensive reporting

---

### **Staff (Inventory/Clerks)**
- ❌ No POS access
- ✅ View products and check stock
- ✅ Update inventory
- ❌ Cannot view orders or sales reports

**Purpose:** Testing inventory management without sales access

---

## 📊 Generated Data Summary

After running all three seeding endpoints, you'll have:

| Data Type | Count | Date Range |
|-----------|-------|------------|
| Demo Employees | 18 | N/A |
| User Accounts | 18 | N/A |
| Business Memberships | 18 | N/A |
| Business Expenses | ~1,500 | Last 30 days |
| Sales Orders | ~1,500 | Last 30 days |
| Order Items | ~4,500 | Last 30 days |

---

## 🚀 Quick Start Guide

### 1. Seed All Demo Data (Admin Only)

Using an API client (Postman, cURL, etc.) with admin authentication:

```bash
# Step 1: Create demo employees with user accounts
curl -X POST http://localhost:8080/api/admin/seed-demo-employees \
  -H "Content-Type: application/json" \
  -H "Cookie: your-admin-session-cookie"

# Step 2: Create demo business expenses
curl -X POST http://localhost:8080/api/admin/seed-demo-expenses \
  -H "Content-Type: application/json" \
  -H "Cookie: your-admin-session-cookie"

# Step 3: Create demo sales orders with sales person assignments
curl -X POST http://localhost:8080/api/admin/seed-demo-orders \
  -H "Content-Type: application/json" \
  -H "Cookie: your-admin-session-cookie"
```

### 2. Login as Demo Employee

Navigate to your login page and use any demo employee credentials:

```
Email: sarah.johnson@restaurant-demo.com
Password: Demo@123
```

### 3. Test Features

Once logged in as a demo employee, you can test:

- **POS System** - Create new orders (sales staff & managers)
- **Sales Reports** - View your own sales (sales staff) or all sales (managers)
- **Commission Tracking** - Filter reports by sales person
- **Expense Tracking** - View expenses by category and employee
- **Dashboard Analytics** - Real expense and income pie charts
- **Date Range Filtering** - Test 30-day historical data

---

## 🧪 Testing Scenarios

### Scenario 1: Sales Person Commission Reports
1. Login as **Emily Rodriguez** (sales rep)
2. Navigate to restaurant reports dashboard
3. Verify you can only see YOUR sales
4. Check that other employees' sales are hidden

### Scenario 2: Manager Overview
1. Login as **Sarah Johnson** (manager)
2. Navigate to restaurant reports dashboard
3. Verify you can see ALL sales across all employees
4. Test filtering by specific sales person
5. Verify expense breakdown shows real data

### Scenario 3: Multi-Business Access
1. Login as **James Brown** (grocery manager)
2. Switch between grocery businesses using business selector
3. Verify data is correctly filtered per business

### Scenario 4: Staff Inventory Access
1. Login as **Robert Martinez** (inventory clerk)
2. Verify no access to POS or sales reports
3. Can view and update inventory only

---

## 🔄 Re-seeding Data

All seeding endpoints are **re-runnable**. They will:
1. Detect existing demo data
2. Clean up old records (employees, expenses, orders)
3. Create fresh data with the same structure

This makes it safe to reset demo data whenever needed during testing or development.

---

## 📝 Notes for Developers

### Data Relationships
- Each **employee** has a corresponding **user account**
- Each **user** has a **business membership** with role-based permissions
- Each **order** is assigned to an **employee** (sales person)
- Each **expense** is recorded by an **employee**
- All data is linked to **demo businesses** (isDemo: true)

### Data Integrity
- Employee numbers: `EMP0001` - `EMP0018`
- Order numbers: `{BUSINESS}-{DATE}-{SEQUENCE}`
- All amounts are realistic for each category
- Sales persons are weighted (sales staff get 4x more orders than managers)

### Permission System
Permissions are stored as JSON in `businessMemberships.permissions`:
- `viewOwn`: Can see their own records
- `viewAll`: Can see all records (manager level)
- `export`: Can export reports
- `approve`: Can approve transactions

---

## 🐛 Troubleshooting

### "Email already exists" error
- The seeding script automatically cleans up existing demo accounts
- If you see this error, manually delete users with emails containing "-demo.com"

### "No employees found" error
- Run `seed-demo-employees` first before seeding expenses or orders
- Employees must exist before assigning them to orders/expenses

### Orders/Expenses showing zero
- Verify demo businesses exist (check `isDemo: true` in businesses table)
- Check date range filters on dashboard match the 30-day seeding period

### Permission denied errors
- Verify the logged-in user has correct business membership
- Check `businessMemberships` table for role and permissions

---

## 📞 Support

For issues related to demo data or test credentials:
1. Check this documentation first
2. Verify admin seeding endpoints completed successfully
3. Review browser console for client-side errors
4. Check server logs for API errors

---

**Last Seeded:** Check the response from each seeding endpoint for timestamps and counts.

**Environment:** Development only - do not use demo accounts in production!
