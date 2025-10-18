# Complete API Audit & Fix Plan
**Date:** 2025-10-16
**Purpose:** Systematic analysis and fix of all API endpoints affected by yesterday's mass changes

---

## Business Modules Identified

### 1. **Admin Module** (`/api/admin/*`)
- Backups management
- Business management
- User management
- Permission templates
- Drivers/Contractors
- Job titles
- Sync operations
- Seed/unseed data operations

### 2. **Vehicles Module** (`/api/vehicles/*`)
- Vehicle CRUD
- Driver authorizations
- Drivers management
- Expenses
- Licenses
- Maintenance
- Reimbursements
- Reports
- Trips

### 3. **Projects Module** (`/api/projects/*` & `/api/construction/*`)
- Projects CRUD
- Project types
- Construction projects
- Project contractors
- Project stages
- Project transactions
- Cost summaries

### 4. **Employees/HR Module** (`/api/employees/*`)
- Employee CRUD
- Contracts
- Attendance
- Leave requests
- Salary increases
- Status management
- Employee assignments

### 5. **Payroll Module** (`/api/payroll/*`)
- Payroll periods
- Payroll entries
- Adjustments
- Advances
- Benefits
- Exports

### 6. **Customers Module** (`/api/customers/*`)
- Customer CRUD
- Division accounts

### 7. **Universal/Products Module** (`/api/universal/*`)
- Products
- Categories
- Brands
- Orders
- Promotions
- Menu combos

### 8. **Inventory Module** (`/api/inventory/*`)
- Items
- Categories
- Movements
- Alerts
- Reports

### 9. **Personal Finance** (`/api/personal/*`)
- Expenses
- Budget
- Categories
- Contractors
- Fund sources
- Loans
- Reports

### 10. **Business Operations** (`/api/business/*`)
- Orders
- Loans
- Balance

### 11. **Other Modules**
- Dashboard (`/api/dashboard/*`)
- Audit (`/api/audit/*`)
- Reports
- Chat
- Suppliers
- Persons
- Sync

---

## Analysis Strategy

For each module, I will:

1. **Read each API route file**
2. **List all Prisma model references** (e.g., `prisma.modelName`)
3. **Verify against schema.prisma** to ensure model names are correct
4. **Check relation names in includes** for snake_case vs camelCase issues
5. **Identify frontend callers** (pages/components that call each endpoint)
6. **Document any issues found**
7. **Create specific fix tasks**

---

## Module-by-Module Analysis

### MODULE 1: VEHICLES (HIGH PRIORITY - Already has known issues)

**Status:** ⚠️ PARTIALLY FIXED - Needs verification

**API Endpoints:**
- `/api/vehicles` - Vehicle CRUD
- `/api/vehicles/reports` - Fleet reports (FIXED: vehicle_drivers → vehicleDrivers)
- `/api/vehicles/trips` - Trip management (FIXED: vehicle_drivers → vehicleDrivers)
- `/api/vehicles/drivers` - Driver management
- `/api/vehicles/driver-authorizations` - Authorization management
- `/api/vehicles/expenses` - Expense tracking
- `/api/vehicles/licenses` - License management
- `/api/vehicles/maintenance` - Maintenance records
- `/api/vehicles/reimbursements` - Reimbursement processing
- `/api/vehicles/notify` - Notifications

**Models Used:**
- `Vehicles`
- `VehicleDrivers` → Client: `vehicleDrivers` ✅
- `VehicleTrips` → Client: `vehicleTrips`
- `VehicleExpenses` → Client: `vehicleExpenses`
- `VehicleLicenses` → Client: `vehicleLicenses`
- `VehicleMaintenanceRecords` → Client: `vehicleMaintenanceRecords`
- `VehicleReimbursements` → Client: `vehicleReimbursements`
- `DriverAuthorizations` → Client: `driverAuthorizations`

**Frontend Callers:**
- Pages: `src/app/vehicles/*`
- Components: TBD (need to search)

**Known Issues:**
- ✅ Fixed: `prisma.vehicle_drivers` in reports
- ⚠️ Need to verify: All other vehicle endpoints for similar issues

**Action Items:**
1. [ ] Audit `/api/vehicles/route.ts` - Check all Prisma calls
2. [ ] Audit `/api/vehicles/drivers/route.ts` - Verify model names
3. [ ] Audit `/api/vehicles/expenses/route.ts` - Check relations
4. [ ] Audit `/api/vehicles/licenses/route.ts` - Check relations
5. [ ] Audit `/api/vehicles/maintenance/route.ts` - Check relations
6. [ ] Audit `/api/vehicles/reimbursements/route.ts` - Check relations
7. [ ] Audit driver authorization endpoint
8. [ ] Test each endpoint with sample request

---

### MODULE 2: PROJECTS (HIGH PRIORITY - Had multiple issues)

**Status:** ✅ FIXED - Needs verification

**API Endpoints:**
- `/api/projects` - Project CRUD
- `/api/projects/[projectId]` - Project details (FIXED: Multiple relation names)
- `/api/project-types` - Project type management
- `/api/construction/projects/*` - Construction-specific projects

**Models Used:**
- `Projects` → Client: `projects`
- `ProjectTypes` → Client: `projectTypes`
- `ProjectContractors` → Client: `projectContractors`
- `ProjectStages` → Client: `projectStages`
- `ProjectTransactions` → Client: `projectTransactions`
- `Persons` → Client: `persons`

**Relations Fixed:**
- ✅ `project_types` in include
- ✅ `users` in include
- ✅ `project_contractors` in include
- ✅ `project_stages` in include
- ✅ `project_transactions` in include
- ✅ `persons` in nested includes
- ✅ Frontend normalized to camelCase

**Frontend Callers:**
- Page: `src/app/projects/[projectId]/page.tsx` ✅ FIXED

**Action Items:**
1. [ ] Verify `/api/projects/route.ts` - List/create endpoints
2. [ ] Verify `/api/construction/projects/*` - All construction endpoints
3. [ ] Test project creation flow
4. [ ] Test project detail page load
5. [ ] Test project transactions
6. [ ] Test contractor assignments

---

### MODULE 3: CUSTOMERS (CRITICAL - Currently broken)

**Status:** ❌ BROKEN - Just fixed, needs verification

**API Endpoints:**
- `/api/customers` - Customer CRUD (FIXED: universalCustomer → businessCustomers)
- `/api/customers/[customerId]/division-accounts` - Division account management

**Models Used:**
- `BusinessCustomers` → Client: `businessCustomers` ✅ JUST FIXED
- `CustomerDivisionAccount` → Client: `customerDivisionAccount`

**Known Issues:**
- ✅ Fixed: `prisma.universalCustomer` → `prisma.businessCustomers`
- ⚠️ Unknown: Field names like `universalCustomerId` may not match schema

**Frontend Callers:**
- TBD (need to search for customer forms/pages)

**Action Items:**
1. [ ] Verify schema field names match (universalCustomerId vs businessCustomerId)
2. [ ] Check division account endpoints for correct model names
3. [ ] Test customer creation
4. [ ] Test division account creation
5. [ ] Verify customer list page works

---

### MODULE 4: EMPLOYEES/PAYROLL (HIGH RISK - Complex relationships)

**Status:** ⚠️ UNKNOWN - Needs audit

**API Endpoints:**
- `/api/employees/*` - Employee management
- `/api/payroll/*` - Payroll processing

**Models Used:**
- `Employees` → Client: `employees`
- `EmployeeContracts` → Client: `employeeContracts`
- `PayrollPeriods` → Client: `payrollPeriods`
- `PayrollEntries` → Client: `payrollEntries` ✅ FIXED EARLIER
- `EmployeeBenefits` → Client: `employeeBenefits`
- `SalaryIncreases` → Client: `salaryIncreases`

**Action Items:**
1. [ ] Audit ALL employee endpoints
2. [ ] Audit ALL payroll endpoints
3. [ ] Check for snake_case model references
4. [ ] Verify relation names in includes
5. [ ] Test payroll period creation
6. [ ] Test payroll entry creation

---

### MODULE 5: UNIVERSAL/PRODUCTS (MEDIUM RISK)

**Status:** ⚠️ UNKNOWN - Needs audit

**API Endpoints:**
- `/api/universal/products` - Product management
- `/api/universal/orders` - Order processing
- `/api/universal/categories` - Category management

**Models Used:**
- `BusinessProducts` → Client: `businessProducts`
- `ProductVariants` → Client: `productVariants` ✅ FIXED EARLIER
- `BusinessOrders` → Client: `businessOrders`
- `BusinessOrderItems` → Client: `businessOrderItems`

**Action Items:**
1. [ ] Audit product endpoints
2. [ ] Audit order endpoints
3. [ ] Verify variant references
4. [ ] Test product creation
5. [ ] Test order creation

---

### MODULE 6: INVENTORY (MEDIUM RISK)

**Status:** ⚠️ UNKNOWN - Needs audit

**API Endpoints:**
- `/api/inventory/[businessId]/*` - Inventory management

**Models Used:**
- `BusinessProducts` → Client: `businessProducts`
- `ProductVariants` → Client: `productVariants`
- `BusinessStockMovements` → Client: `businessStockMovements`

**Action Items:**
1. [ ] Audit all inventory endpoints
2. [ ] Check stock movement model references
3. [ ] Test inventory operations

---

## CRITICAL FINDINGS SUMMARY

### ✅ Already Fixed:
1. Vehicle drivers model references (reports, trips)
2. Projects relation names (all relations)
3. Frontend/backend normalization for projects
4. Payroll entries model name
5. Product variants model name
6. Project transactions model name
7. Universal customer → business customers

### ❌ Still Broken / Unknown:
1. Customer field names (universalCustomerId)
2. All employee endpoints (not audited)
3. All payroll endpoints (not audited)
4. Construction project endpoints (not audited)
5. Universal/products endpoints (not audited)
6. Inventory endpoints (not audited)
7. Dashboard endpoints (not audited)
8. Personal finance endpoints (not audited)

---

## EXECUTION PLAN

### Phase 1: Critical Fixes (Do First)
1. ✅ Customer model fix - COMPLETED
2. [ ] Verify customer endpoints work
3. [ ] Audit employee endpoints
4. [ ] Audit payroll endpoints
5. [ ] Fix any issues found

### Phase 2: High Priority (Do Second)
1. [ ] Audit vehicle endpoints (verify earlier fixes)
2. [ ] Audit construction/project endpoints
3. [ ] Test all project operations
4. [ ] Fix any issues found

### Phase 3: Medium Priority
1. [ ] Audit universal/products endpoints
2. [ ] Audit inventory endpoints
3. [ ] Audit dashboard endpoints
4. [ ] Fix any issues found

### Phase 4: Lower Priority
1. [ ] Audit admin endpoints
2. [ ] Audit personal finance endpoints
3. [ ] Audit remaining misc endpoints
4. [ ] Fix any issues found

### Phase 5: Frontend Verification
1. [ ] Find all frontend pages that call APIs
2. [ ] Verify data structure matches API responses
3. [ ] Test critical user flows
4. [ ] Fix frontend issues

---

## NEXT STEPS

I will now proceed with **Phase 1** - auditing the most critical endpoints one by one, manually inspecting each file, and documenting findings before making any changes.

Would you like me to:
1. Start with employees/payroll audit (most complex)
2. Start with vehicles verification (already partially fixed)
3. Another priority you specify?

I will document every finding in detail and get your approval before making changes.
