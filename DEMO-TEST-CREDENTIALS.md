# Demo & Test User Credentials

**Last Updated:** 2026-01-02
**Project:** Multi-Business Management System
**Version:** 2.0 - Complete Feature Coverage
**Purpose:** Comprehensive demo and testing credentials covering all application features

---

## 📚 Quick Navigation

- [Admin Seeding Endpoints](#-admin-seeding-endpoints)
- [Demo Employee Credentials](#-demo-employee-credentials)
- [Permission Levels](#-permission-levels-by-role)
- [Feature Testing Matrix](#-role-based-feature-access-matrix)
- [Testing Scenarios](#-testing-scenarios)
- [WiFi Portal Testing](#wifi-portal-testing-esp32--r710)
- [Printer System Testing](#printer-system-testing)
- [Payroll Testing](#payroll-system-testing)
- [HR Features Testing](#hr-features-testing)
- [Construction Testing](#construction-module-testing)
- [Troubleshooting](#-troubleshooting)

---

## 🔐 Admin Seeding Endpoints

All seeding endpoints require **admin authentication** and are accessed via POST requests.

### Master Seeding Endpoint (Recommended)

**Complete Demo Data Seeding** - Seeds all features in one command:

```bash
POST /api/admin/seed-complete-demo
```

**Request Body:**
```json
{
  "businessTypes": ["restaurant", "grocery", "hardware", "clothing"],
  "features": ["all"],
  "daysOfHistory": 30
}
```

**Features Options:**
- `"all"` - All features (WiFi, Printers, Payroll, HR, Construction)
- `"wifi"` - WiFi Portal (ESP32 & R710)
- `"printers"` - Printer system
- `"payroll"` - Payroll accounts and periods
- `"hr"` - Benefits, Loans, Leave, Salary Increases
- `"construction"` - Construction projects

**Response:** Comprehensive progress report with step-by-step execution details.

---

### Individual Seeding Endpoints

| Endpoint | Purpose | Re-runnable | Features |
|----------|---------|-------------|----------|
| `POST /api/admin/seed-demo-employees` | Create 16 demo employees | ✅ Yes | Core |
| `POST /api/admin/seed-demo-expenses` | Business expenses (30 days) | ✅ Yes | Core |
| `POST /api/admin/seed-demo-orders` | Sales orders (30 days) | ✅ Yes | Core |
| `POST /api/admin/seed-wifi-esp32` | ESP32 WiFi tokens | ✅ Yes | WiFi Portal |
| `POST /api/admin/seed-wifi-r710` | R710 WiFi tokens | ✅ Yes | WiFi Portal |
| `POST /api/admin/seed-printers` | Printer configurations | ✅ Yes | Printing |
| `POST /api/admin/seed-payroll-accounts` | Payroll accounts | ✅ Yes | Payroll |
| `POST /api/admin/seed-payroll-periods` | Payroll periods | ✅ Yes | Payroll |
| `POST /api/admin/seed-employee-benefits` | Employee benefits | ✅ Yes | HR |
| `POST /api/admin/seed-employee-loans` | Employee loans | ✅ Yes | HR |
| `POST /api/admin/seed-leave-management` | Leave balances/requests | ✅ Yes | HR |
| `POST /api/admin/seed-salary-increases` | Salary history | ✅ Yes | HR |
| `POST /api/admin/seed-construction` | Construction projects | ✅ Yes | Construction |

---

### Template Management Endpoints

**Create Demo Template** - Backup current demo data:
```bash
POST /api/admin/create-demo-template
```

**Restore Demo Template** - Fast reset to golden state:
```bash
POST /api/admin/restore-demo-template
```

**Use Cases:**
- Reset to clean demo state quickly (~1-2 min vs ~5-10 min fresh seed)
- Distribute standardized demo configurations
- Rollback after testing changes

---

## 👥 Demo Employee Credentials

All demo employees share the **same password**: `Demo@123`

### Email Format
```
firstname.lastname@businesstype-demo.com
```

### 🍽️ Restaurant Demo Business

| Name | Email | Role | Job Title | Features Access |
|------|-------|------|-----------|-----------------|
| Sarah Johnson | sarah.johnson@restaurant-demo.com | Manager | General Manager | All features |
| Michael Chen | michael.chen@restaurant-demo.com | Staff | Sales Associate | POS, Orders |
| Emily Rodriguez | emily.rodriguez@restaurant-demo.com | Sales | Sales Representative | POS, Own Reports |
| David Williams | david.williams@restaurant-demo.com | Sales | Sales Representative | POS, Own Reports |

**Business ID:** `restaurant-demo-business`
**WiFi Portal:** ✅ ESP32 Integration (4 token configs, 30 tokens)
**Payroll:** ✅ 2 payroll periods processed
**Features:** Full POS, WiFi tokens, Payroll, HR, Printing

---

### 🛒 Grocery Demo Business

| Name | Email | Role | Job Title | Features Access |
|------|-------|------|-----------|-----------------|
| James Brown | james.brown@grocery-demo.com | Manager | Operations Manager | All features |
| Lisa Garcia | lisa.garcia@grocery-demo.com | Sales | Sales Associate | POS, Own Reports |
| Robert Martinez | robert.martinez@grocery-demo.com | Staff | Inventory Clerk | Inventory only |
| Jennifer Davis | jennifer.davis@grocery-demo.com | Sales | Sales Associate | POS, Own Reports |

**Business ID:** `grocery-demo-business`
**WiFi Portal:** ✅ ESP32 Integration (4 token configs, 30 tokens)
**Payroll:** ✅ 1 payroll period processed
**Features:** Full POS, WiFi tokens, Payroll, HR, Printing

---

### 🔧 Hardware Demo Business

| Name | Email | Role | Job Title | Features Access |
|------|-------|------|-----------|-----------------|
| Thomas Anderson | thomas.anderson@hardware-demo.com | Manager | Sales Manager | All features |
| Christopher Taylor | christopher.taylor@hardware-demo.com | Sales | Sales Representative | POS, Own Reports |
| Nancy Thomas | nancy.thomas@hardware-demo.com | Sales | Sales Associate | POS, Orders |
| Daniel Jackson | daniel.jackson@hardware-demo.com | Staff | Inventory Clerk | Inventory only |

**Business ID:** `hardware-demo-business`
**WiFi Portal:** ✅ R710 Integration (3 token configs, 18 tokens, 2 WLANs)
**Construction:** ✅ 3 projects with stages
**Features:** Full POS, WiFi tokens, HR, Construction, Printing

---

### 👔 Clothing Demo Business

| Name | Email | Role | Job Title | Features Access |
|------|-------|------|-----------|-----------------|
| Miro Hwandaza | miro.hwandaza@clothing-demo.com | Manager | General Manager | All features |
| Amanda Jackson | amanda.jackson@clothing-demo.com | Sales | Sales Associate | POS, Own Reports |
| Kevin Thompson | kevin.thompson@clothing-demo.com | Sales | Sales Associate | POS, Orders |
| Sophia Lee | sophia.lee@clothing-demo.com | Sales | Sales Representative | POS, Own Reports |

**Business ID:** `clothing-demo-business`
**WiFi Portal:** ✅ R710 Integration (3 token configs, 18 tokens, 2 WLANs)
**Features:** Full POS, WiFi tokens, HR, Printing

---

## 🔑 Permission Levels by Role

### **Sales Staff**
- ✅ POS Access (create orders, process payments)
- ✅ View products and check stock
- ✅ View and create customers
- ✅ View **own** sales reports (for commission)
- ✅ Request WiFi tokens (low stock alert)
- ❌ Cannot view all sales reports
- ❌ Cannot adjust inventory
- ❌ Cannot process payroll
- ❌ Cannot manage HR features

**Purpose:** Testing commission tracking, sales filtering, WiFi token sales

---

### **Manager**
- ✅ Full POS access (including void orders)
- ✅ Create, edit, delete products
- ✅ View **all** sales reports
- ✅ Export reports
- ✅ Adjust inventory and stock
- ✅ View employees and schedules
- ✅ Create and view expenses
- ✅ Configure WiFi portal settings
- ✅ Manage printer configurations
- ✅ **View** payroll data (cannot process without admin)
- ✅ **View** HR features (benefits, loans, leave)
- ✅ **Manage** construction projects
- ❌ Cannot approve expenses (requires admin)
- ❌ Cannot process payroll (requires admin)
- ❌ Cannot approve leave requests (requires admin)

**Purpose:** Testing management dashboards, comprehensive reporting, feature management

---

### **Staff (Inventory/Clerks)**
- ❌ No POS access
- ✅ View products and check stock
- ✅ Update inventory
- ❌ Cannot view orders or sales reports
- ❌ Cannot access WiFi portal
- ❌ Cannot access payroll or HR features

**Purpose:** Testing inventory management without sales access

---

### **Admin** (Your Account)
- ✅ **All** manager permissions
- ✅ Approve expenses
- ✅ Process payroll
- ✅ Approve leave requests
- ✅ Seed demo data
- ✅ Create/restore demo templates
- ✅ Manage all businesses
- ✅ Configure system settings

**Purpose:** Full system administration and demo data management

---

## 📊 Role-Based Feature Access Matrix

| Feature | Sales Staff | Manager | Staff | Admin |
|---------|-------------|---------|-------|-------|
| **Core POS** | ✅ | ✅ | ❌ | ✅ |
| Point of Sale | ✅ | ✅ | ❌ | ✅ |
| Product Management | View | ✅ Full | View | ✅ Full |
| Inventory Adjustments | ❌ | ✅ | ✅ | ✅ |
| Customer Management | ✅ | ✅ | ❌ | ✅ |
| **Reports & Analytics** | Own | All | ❌ | All |
| Sales Reports | Own only | All | ❌ | All |
| Commission Reports | Own only | All | ❌ | All |
| Expense Reports | ❌ | View | ❌ | Full |
| Dashboard Analytics | Own | All | ❌ | All |
| **WiFi Portal (ESP32)** | Request | ✅ Full | ❌ | ✅ Full |
| Token Sales (POS) | ✅ | ✅ | ❌ | ✅ |
| Token Management | ❌ | ✅ | ❌ | ✅ |
| ESP32 Configuration | ❌ | ✅ | ❌ | ✅ |
| Token Analytics | ❌ | ✅ | ❌ | ✅ |
| **WiFi Portal (R710)** | Request | ✅ Full | ❌ | ✅ Full |
| Direct Token Sales | ✅ | ✅ | ❌ | ✅ |
| WLAN Management | ❌ | ✅ | ❌ | ✅ |
| R710 Configuration | ❌ | ✅ | ❌ | ✅ |
| Token Package Setup | ❌ | ✅ | ❌ | ✅ |
| **Printer System** | ❌ | ✅ | ❌ | ✅ |
| Printer Configuration | ❌ | ✅ | ❌ | ✅ |
| Barcode Printing | ❌ | ✅ | ❌ | ✅ |
| Receipt Customization | ❌ | ✅ | ❌ | ✅ |
| Print Job History | ❌ | ✅ | ❌ | ✅ |
| **Payroll System** | ❌ | View | ❌ | ✅ Full |
| View Payroll Data | ❌ | ✅ | ❌ | ✅ |
| Process Payroll | ❌ | ❌ | ❌ | ✅ |
| Payroll Reports | ❌ | ✅ | ❌ | ✅ |
| Account Management | ❌ | ❌ | ❌ | ✅ |
| **HR - Benefits** | ❌ | View | ❌ | ✅ Full |
| View Own Benefits | ✅ | ✅ | ✅ | ✅ |
| Manage Benefits | ❌ | View | ❌ | ✅ |
| Benefits Reports | ❌ | ✅ | ❌ | ✅ |
| **HR - Loans** | ❌ | View | ❌ | ✅ Full |
| View Own Loans | ✅ | ✅ | ✅ | ✅ |
| Manage Loans | ❌ | View | ❌ | ✅ |
| Loan Payments | ❌ | ❌ | ❌ | ✅ |
| **HR - Leave Management** | Request | Approve | Request | ✅ Full |
| Request Leave | ✅ | ✅ | ✅ | ✅ |
| Approve Leave | ❌ | ❌ | ❌ | ✅ |
| Leave Balances | Own | All | Own | All |
| Leave Reports | ❌ | ✅ | ❌ | ✅ |
| **HR - Salary Increases** | ❌ | View | ❌ | ✅ Full |
| View Own History | ✅ | ✅ | ✅ | ✅ |
| Manage Increases | ❌ | ❌ | ❌ | ✅ |
| Salary Reports | ❌ | ✅ | ❌ | ✅ |
| **Construction Module** | ❌ | ✅ Full | ❌ | ✅ Full |
| Project Management | ❌ | ✅ | ❌ | ✅ |
| Contractor Management | ❌ | ✅ | ❌ | ✅ |
| Project Stages | ❌ | ✅ | ❌ | ✅ |
| Construction Reports | ❌ | ✅ | ❌ | ✅ |

---

## 📊 Generated Data Summary

After running the complete demo seeding, you'll have:

### Core Data
| Data Type | Count | Date Range | Notes |
|-----------|-------|------------|-------|
| Demo Businesses | 4 | N/A | Restaurant, Grocery, Hardware, Clothing |
| Demo Employees | 16 | N/A | All with user accounts |
| User Accounts | 16 | N/A | Password: `Demo@123` |
| Business Memberships | 16 | N/A | Role-based permissions |
| Products | 1,284 | N/A | With barcodes |
| Business Expenses | ~150 | Last 30 days | Across all businesses |
| Sales Orders | 96 | Last 30 days | With salesperson assignments |

### WiFi Portal Data
| Data Type | Count | Business Types | Notes |
|-----------|-------|----------------|-------|
| ESP32 Token Configs | 4 | Restaurant, Grocery | Various durations |
| ESP32 Tokens | 30 | Restaurant, Grocery | Active & sold |
| ESP32 Token Sales | 11 | Restaurant, Grocery | Via POS |
| R710 Token Configs | 3 | Hardware, Clothing | Various packages |
| R710 Tokens | 18 | Hardware, Clothing | Active & sold |
| R710 Token Sales | 5 | Hardware, Clothing | Direct sales |
| R710 WLANs | 2 | Hardware, Clothing | Configured SSIDs |

### Printer System Data
| Data Type | Count | Notes |
|-----------|-------|-------|
| Network Printers | 3 | Barcode, Thermal, Document |
| Barcode Templates | 6 | Custom templates |
| Barcode Print Jobs | 108 | Historical jobs |
| Receipt Print Jobs | 109 | Historical jobs |
| Thermal Settings | 4 | Per business |

### Payroll Data
| Data Type | Count | Businesses | Notes |
|-----------|-------|------------|-------|
| Payroll Accounts | 4 | All | $98K-$118K balances |
| Payroll Deposits | 8 | All | Fund payroll accounts |
| Payroll Payments | 7 | All | Account withdrawals |
| Payroll Periods | 3 | Restaurant (2), Grocery (1) | Processed periods |
| Payroll Entries | 14 | Restaurant, Grocery | Employee paychecks |

### HR Features Data
| Data Type | Count | Notes |
|-----------|-------|-------|
| Benefit Types | 8 | Health, Dental, Vision, etc. |
| Benefit Assignments | 80 | All employees |
| Employee Loans | 13 | 4 paid, 8 active, 1 defaulted |
| Loan Payments | 101 | Payment history |
| Leave Balances | 16 | All employees |
| Leave Requests | 45 | 28 approved, 8 pending, 9 rejected |
| Salary Increases | 38 | All employees, avg 6.55% |

### Construction Data
| Data Type | Count | Business | Notes |
|-----------|-------|----------|-------|
| Construction Projects | 3 | Hardware | Various stages |
| Project Stages | 14 | Hardware | Across 3 projects |
| Contractors (Persons) | 8 | Hardware | Active contractors |
| Contractor Assignments | 2 | Hardware | Project assignments |
| Payment Transactions | 2 | Hardware | Contractor payments |

---

## 🚀 Quick Start Guide

### Method 1: Admin UI (Recommended)

1. **Login as Admin**
2. **Navigate to** `/admin/data-management`
3. **Click** "Seed & Validate" tab
4. **Find** "Complete Demo Data Management" section
5. **Select** business types and features
6. **Click** "Seed Complete Demo Data"
7. **Wait** for progress (16 steps, ~5-10 minutes)
8. **Review** results and verify success

**Benefits:**
- Visual progress tracking
- Step-by-step execution details
- Warning display for optional failures
- One-click operation

---

### Method 2: API Endpoint

Using an API client (Postman, cURL, etc.) with admin authentication:

```bash
# Seed all demo data
curl -X POST http://localhost:8080/api/admin/seed-complete-demo \
  -H "Content-Type: application/json" \
  -H "Cookie: your-admin-session-cookie" \
  -d '{
    "businessTypes": ["restaurant", "grocery", "hardware", "clothing"],
    "features": ["all"],
    "daysOfHistory": 30
  }'
```

**Customization Examples:**

```bash
# Only WiFi and Printer features
{
  "businessTypes": ["restaurant", "grocery"],
  "features": ["wifi", "printers"],
  "daysOfHistory": 30
}

# Only Restaurant business, all features
{
  "businessTypes": ["restaurant"],
  "features": ["all"],
  "daysOfHistory": 30
}

# 90 days of history instead of 30
{
  "businessTypes": ["restaurant", "grocery", "hardware", "clothing"],
  "features": ["all"],
  "daysOfHistory": 90
}
```

---

### Method 3: Template Restoration (Fastest)

If you've previously created a demo template:

```bash
# Restore from golden template (~1-2 minutes)
curl -X POST http://localhost:8080/api/admin/restore-demo-template \
  -H "Cookie: your-admin-session-cookie"
```

**Or use Admin UI:**
1. Navigate to `/admin/data-management`
2. Click "Seed & Validate" tab
3. Click "Reset to Demo Template"
4. Confirm the warning dialog

---

## 🧪 Testing Scenarios

### Core POS & Sales

#### Scenario 1: Sales Person Commission Reports
1. Login as **Emily Rodriguez** (sales rep) - `emily.rodriguez@restaurant-demo.com`
2. Navigate to restaurant reports dashboard
3. Verify you can only see YOUR sales
4. Check that other employees' sales are hidden
5. Verify commission calculations are accurate

#### Scenario 2: Manager Overview
1. Login as **Sarah Johnson** (manager) - `sarah.johnson@restaurant-demo.com`
2. Navigate to restaurant reports dashboard
3. Verify you can see ALL sales across all employees
4. Test filtering by specific sales person
5. Verify expense breakdown shows real data
6. Export reports to verify export functionality

#### Scenario 3: Multi-Business Access
1. Login as **James Brown** (grocery manager) - `james.brown@grocery-demo.com`
2. Switch between businesses using business selector
3. Verify data is correctly filtered per business
4. Check that cross-business data is not visible

#### Scenario 4: Staff Inventory Access
1. Login as **Robert Martinez** (inventory clerk) - `robert.martinez@grocery-demo.com`
2. Verify no access to POS or sales reports
3. Can view and update inventory only
4. Cannot create orders or view financial data

---

### WiFi Portal Testing (ESP32 & R710)

#### ESP32 Token Sales (Restaurant/Grocery)

**Scenario 5: Selling WiFi Tokens via POS**
1. Login as **Sarah Johnson** (restaurant manager)
2. Open POS system
3. Navigate to "WiFi Access" tab/category
4. Verify 4 token packages are visible:
   - 1 Hour 500MB
   - 4 Hours 2GB
   - 1 Day 5GB
   - 1 Week 20GB
5. Add token to cart
6. Complete sale
7. Verify receipt includes:
   - Token username
   - Token password
   - SSID
   - Duration and bandwidth
   - Expiration date/time
8. Check WiFi Portal dashboard for new sale

**Scenario 6: Request More Tokens (Low Stock)**
1. Login as manager to grocery POS
2. Navigate to "WiFi Access" tab
3. Find token package with < 5 remaining
4. Verify "+ Request 5 More" button appears
5. Click button
6. Verify success toast
7. Confirm quantity updated (+5)
8. Verify button hides if quantity >= 5

**Scenario 7: ESP32 Token Analytics**
1. Login as restaurant manager
2. Navigate to WiFi Portal dashboard
3. Verify statistics show:
   - Active tokens count
   - Sold tokens count
   - Revenue from WiFi sales
   - Token usage trends
4. Test ESP32 device sync
5. Verify token status updates

---

#### R710 Token Management (Hardware/Clothing)

**Scenario 8: Direct Token Sales**
1. Login as **Thomas Anderson** (hardware manager)
2. Navigate to R710 Portal → Sales
3. Select token package
4. Enter customer details
5. Complete sale
6. Verify receipt includes:
   - Token username (sanitized)
   - Token password
   - SSID
   - Duration and data allowance
   - Expiration date
7. Check revenue deposited to WiFi expense account

**Scenario 9: WLAN Configuration**
1. Login as hardware manager
2. Navigate to R710 Portal → Setup
3. View existing WLAN configurations
4. Test connection to R710 device
5. Sync WLAN settings
6. Verify successful sync

**Scenario 10: Token Package Customization**
1. Navigate to R710 Portal → Token Configs
2. Select existing token package
3. Click "Customize" button
4. Modify duration and bandwidth
5. Save custom settings
6. Verify "(Customized)" badge appears
7. Test "Reset to Defaults" button

---

### Printer System Testing

#### Scenario 11: Barcode Printing
1. Login as **Sarah Johnson** (restaurant manager)
2. Navigate to Products page
3. Select a product
4. Click "Print Barcode"
5. Select barcode template
6. Choose printer
7. Set quantity
8. Verify print job created
9. Check printer queue

**Scenario 12: Receipt Customization**
1. Login as manager
2. Navigate to Business Settings
3. Find "Receipt Configuration" section
4. Customize:
   - Return policy message
   - Tax settings
   - Receipt header/footer
5. Save changes
6. Process a test sale
7. Verify custom receipt settings appear

**Scenario 13: Thermal Printer Settings**
1. Navigate to Printer Management
2. Select thermal printer
3. Configure:
   - Paper width
   - Font size
   - Cut settings
4. Test print
5. Verify settings applied correctly

---

### Payroll System Testing

#### Scenario 14: View Payroll Period
1. Login as **Sarah Johnson** (restaurant manager)
2. Navigate to Payroll section
3. View existing payroll periods (2 processed)
4. Check payroll entries for each employee
5. Verify calculations:
   - Gross pay
   - Deductions
   - Net pay
6. Export payslips

**Scenario 15: Payroll Account Management (Admin Only)**
1. Login as Admin
2. Navigate to Payroll Accounts
3. View account balances ($98K-$118K)
4. Review deposit history (8 deposits)
5. Review payment history (7 payments)
6. Verify account reconciliation

**Scenario 16: Process New Payroll (Admin Only)**
1. Navigate to Payroll Processing
2. Create new payroll period
3. Select employees
4. Calculate payroll
5. Review calculations
6. Process payment
7. Verify account balance updated
8. Verify payslips generated

---

### HR Features Testing

#### Scenario 17: Employee Benefits
1. Login as **Emily Rodriguez**
2. Navigate to "My Benefits"
3. View assigned benefits:
   - Health Insurance
   - Dental Insurance
   - Vision Insurance
   - etc.
4. Check monthly costs
5. View benefit effective dates

**Scenario 18: Employee Loan Management**
1. Login as employee with active loan
2. Navigate to "My Loans"
3. View loan details:
   - Principal amount
   - Interest rate
   - Payment schedule
   - Remaining balance
4. View payment history
5. Check loan status (Active/Paid/Defaulted)

**Scenario 19: Leave Request & Approval**
1. Login as **Lisa Garcia** (grocery sales)
2. Navigate to "Leave Management"
3. View leave balances (Annual, Sick)
4. Submit leave request:
   - Select leave type
   - Choose dates
   - Add reason
5. Submit request (Status: Pending)
6. Logout
7. Login as Admin
8. Navigate to Leave Approvals
9. Review pending request
10. Approve or reject
11. Verify employee notified

**Scenario 20: Salary Increase History**
1. Login as any employee
2. Navigate to "My Profile" or "Salary History"
3. View salary increases (avg 6.55% increase)
4. Check increase dates
5. View salary progression chart

---

### Construction Module Testing

#### Scenario 21: Project Management
1. Login as **Thomas Anderson** (hardware manager)
2. Navigate to Construction Projects
3. View 3 demo projects:
   - Downtown Office Renovation (In Progress)
   - Warehouse Expansion (Completed)
   - Retail Store Build-out (Planned)
4. Open project details
5. View project stages (14 total across 3 projects)
6. Update stage status
7. Add project notes

**Scenario 22: Contractor Management**
1. Navigate to Contractors
2. View 8 contractors
3. View contractor details
4. Assign contractor to project
5. Record contractor payment
6. View payment history (2 transactions)

**Scenario 23: Project Reports**
1. Navigate to Construction Reports
2. View project status summary
3. Check budget vs actual
4. View contractor payments
5. Export project report

---

## 📱 WiFi Portal Testing (ESP32 & R710)

### ESP32 Testing (Restaurant & Grocery)

**Prerequisites:**
- ESP32 device configured and accessible
- Token configurations created (4 configs)
- ESP32 integration enabled for business

**Test Cases:**

1. **Token Package Display**
   - Verify 4 packages show in POS WiFi tab
   - Check badge displays: name, duration, bandwidth, price
   - Verify quantity indicators (green >= 5, orange < 5, red = 0)

2. **Token Sales Flow**
   - Add token to cart
   - Process payment
   - Verify receipt format (business + customer copy)
   - Check token details on receipt

3. **Token Sync**
   - Navigate to WiFi Portal dashboard
   - Click "Sync with ESP32"
   - Verify tokens upload to device
   - Check sync status and errors

4. **Low Stock Request**
   - Find package with < 5 tokens
   - Click "+ Request 5 More"
   - Verify tokens created
   - Check inventory updated

5. **Token Analytics**
   - View active vs sold tokens
   - Check revenue statistics
   - Verify usage patterns
   - Test date range filters

**Common Issues:**
- ESP32 503 errors: Device capacity full (check available_slots)
- Sync failures: Network connectivity or API key issues
- Token not activated: ESP32 sync may be pending

---

### R710 Testing (Hardware & Clothing)

**Prerequisites:**
- R710 controller accessible
- WLAN configurations created (2 WLANs)
- R710 integration enabled for business

**Test Cases:**

1. **WLAN Management**
   - View existing WLANs
   - Edit WLAN settings:
     - SSID
     - Session timeout
     - Bandwidth limits
     - Zero-IT onboarding
   - Sync to R710
   - Verify sync success

2. **Token Package Setup**
   - Create new token config
   - Set duration and bandwidth
   - Set pricing
   - Enable for POS sales
   - Test customization (override defaults)
   - Test reset to defaults

3. **Direct Token Sales**
   - Navigate to R710 Portal → Sales
   - Select token package
   - Enter customer info (optional)
   - Generate tokens (1-50)
   - Verify tokens created in database
   - Check R710 device sync

4. **Token Receipt Format**
   - Print token receipt
   - Verify format:
     - Sanitized username (no special chars)
     - Password display
     - SSID
     - Duration (smart format: hours/days)
     - Data allowance (smart format: MB/GB)
     - Expiration date & time
     - Business contact info

5. **Connected Clients**
   - View active clients list
   - Check client details (MAC, IP, usage)
   - Monitor bandwidth usage
   - View connection duration

**Common Issues:**
- WLAN sync fails: Check R710 API credentials
- Duplicate tokens: Handled by upsert strategy
- Token not working: Check WLAN guest-access enabled

---

## 🖨️ Printer System Testing

### Barcode Printing

**Test Cases:**

1. **Print Product Barcodes**
   - Navigate to Products
   - Select product
   - Click "Print Barcode"
   - Select template (6 available):
     - Standard (40mm × 30mm)
     - Small (30mm × 20mm)
     - Large (50mm × 40mm)
     - With Price
     - With SKU
     - Custom Layout
   - Set quantity
   - Select printer
   - Verify print job created
   - Check printer queue

2. **Batch Barcode Printing**
   - Select multiple products
   - Click "Batch Print Barcodes"
   - Choose template
   - Set quantity per product
   - Verify all jobs queued
   - Check total print count

3. **Barcode Template Customization**
   - Navigate to Printer Settings
   - Edit barcode template
   - Modify:
     - Size
     - Font
     - Include price (yes/no)
     - Include SKU (yes/no)
     - Logo placement
   - Save template
   - Test print

**Common Issues:**
- Print job stuck: Check printer status/connection
- Wrong template: Verify template assignment
- Label misalignment: Adjust printer calibration

---

### Receipt Printing

**Test Cases:**

1. **POS Receipt Printing**
   - Complete sale
   - Choose receipt type:
     - Business copy only (default)
     - Business + Customer copy
   - Select printer
   - Verify receipt format:
     - Business header (name, address, phone)
     - Receipt number
     - Date/time
     - Salesperson name
     - Items with prices
     - Tax calculation (if applicable)
     - Total
     - Payment method
     - Return policy
     - Footer message
     - WiFi tokens (if sold)
   - Check paper cut at end

2. **Receipt Reprint**
   - Navigate to Receipt History
   - Find order
   - Click "Reprint"
   - Select printer
   - Choose receipt type
   - Verify identical to original

3. **Receipt Customization**
   - Navigate to Business Settings → Receipt Configuration
   - Customize:
     - Return policy message
     - Tax included vs separate
     - Tax rate and label
     - Header message
     - Footer message
   - Save settings
   - Test print
   - Verify all customizations appear

4. **Thermal Receipt Settings**
   - Configure per printer:
     - Paper width (58mm/80mm)
     - Font size
     - Logo inclusion
     - Cut settings (partial/full)
   - Test with actual printer
   - Verify formatting correct

**Common Issues:**
- Receipt too long: Check paper conservation settings
- Tax line showing $0: Conditional printing enabled (saves paper)
- Missing fields: Check business configuration
- Formatting issues: Verify thermal printer settings

---

## 💰 Payroll System Testing

### Payroll Account Testing

**Test Cases:**

1. **View Payroll Accounts**
   - Login as manager or admin
   - Navigate to Payroll Accounts
   - Verify 4 accounts (one per business)
   - Check balances: $98K-$118K
   - View transaction history:
     - 8 deposits (funding)
     - 7 payments (payroll)
   - Verify account reconciliation

2. **Deposit to Payroll Account** (Admin only)
   - Select payroll account
   - Click "Deposit Funds"
   - Enter amount
   - Add description
   - Submit deposit
   - Verify balance updated
   - Check transaction recorded

3. **Payroll Account Reports**
   - View account balance trend
   - Export transaction history
   - Reconcile with bank statements
   - Verify all debits/credits match

---

### Payroll Period Testing

**Test Cases:**

1. **View Processed Payroll** (Restaurant - 2 periods)
   - Login as restaurant manager
   - Navigate to Payroll Periods
   - View Period 1:
     - Date range
     - Number of employees
     - Total gross pay
     - Total deductions
     - Total net pay
   - Click "View Details"
   - See individual employee entries
   - Verify calculations correct

2. **View Payslip Details**
   - Select payroll entry
   - View payslip breakdown:
     - Employee name
     - Period dates
     - Gross pay calculation
     - Deductions breakdown:
       - Tax
       - Social Security
       - Health Insurance
       - Loan payments
     - Net pay
   - Export payslip PDF

3. **Process New Payroll** (Admin only)
   - Click "New Payroll Period"
   - Select date range
   - Select employees
   - Enter hours worked (if hourly)
   - Calculate gross pay
   - Review deductions
   - Verify calculations
   - Process payroll
   - Confirm payment deducted from account
   - Verify payslips generated
   - Email payslips to employees (optional)

**Common Issues:**
- Calculation mismatch: Check tax rates and deduction rules
- Insufficient balance: Deposit funds to payroll account first
- Missing employees: Verify employee has payroll setup

---

## 👥 HR Features Testing

### Employee Benefits Testing

**Test Cases:**

1. **View Personal Benefits** (Any employee)
   - Login as employee
   - Navigate to "My Benefits"
   - View benefit cards showing:
     - Benefit type (Health, Dental, Vision, etc.)
     - Coverage level (Employee only, Family, etc.)
     - Monthly cost
     - Effective date
     - Provider
   - Check total monthly benefit cost

2. **Manage Benefits** (Admin only)
   - Navigate to HR → Benefits
   - View all benefit assignments (80 total)
   - Filter by:
     - Business
     - Employee
     - Benefit type
   - Assign new benefit:
     - Select employee
     - Choose benefit type
     - Set coverage level
     - Enter cost
     - Set effective date
   - Save assignment
   - Verify employee can see new benefit

3. **Benefits Reports**
   - View total monthly benefit cost ($16.6K)
   - Export benefits by employee
   - View benefit cost trends
   - Analyze most common benefits

**Common Issues:**
- Benefit not showing: Check effective date
- Wrong cost: Verify coverage level
- Duplicate benefits: System allows multiple of same type

---

### Employee Loans Testing

**Test Cases:**

1. **View Personal Loans** (Any employee)
   - Login as employee with loan
   - Navigate to "My Loans"
   - View loan cards showing:
     - Loan amount (principal)
     - Interest rate
     - Monthly payment
     - Remaining balance
     - Loan status (Active/Paid/Defaulted)
     - Next payment date
   - View payment history (101 total payments)

2. **Loan Management** (Admin only)
   - Navigate to HR → Loans
   - View all loans (13 total):
     - 4 Paid off
     - 8 Active
     - 1 Defaulted
   - Filter by status
   - Create new loan:
     - Select employee
     - Enter principal amount
     - Set interest rate
     - Choose repayment schedule
     - Set start date
   - Calculate payment plan
   - Save loan

3. **Process Loan Payment** (Admin only)
   - Select active loan
   - Record payment:
     - Payment amount
     - Payment date
     - Payment method
   - Apply payment to balance
   - Update remaining balance
   - Check if loan paid off

4. **Loan Reports**
   - View outstanding balance ($16.6K remaining)
   - Export loan summary
   - View payment history
   - Analyze default risk

**Common Issues:**
- Payment not applied: Verify payment recorded correctly
- Wrong balance: Check payment history
- Defaulted loan: Past due > 30 days

---

### Leave Management Testing

**Test Cases:**

1. **View Leave Balances** (Any employee)
   - Login as employee
   - Navigate to "Leave Management"
   - View leave balances:
     - Annual leave (15 days per year)
     - Sick leave (10 days per year)
   - Check balance breakdown:
     - Allocated
     - Used
     - Pending
     - Available
   - View leave calendar

2. **Submit Leave Request** (Any employee)
   - Click "Request Leave"
   - Fill form:
     - Leave type (Annual/Sick)
     - Start date
     - End date
     - Reason (optional)
   - Submit request
   - Verify status: Pending
   - Check balance reduced by pending days

3. **Approve Leave Requests** (Admin only)
   - Navigate to Leave Approvals
   - View pending requests (8 pending out of 45 total)
   - Review request details
   - Approve or reject:
     - If approve: Balance deducted
     - If reject: Balance restored
   - Add approval notes
   - Notify employee

4. **Leave History**
   - View all leave requests:
     - 28 Approved
     - 8 Pending
     - 9 Rejected
   - Filter by:
     - Employee
     - Leave type
     - Status
     - Date range
   - Export leave report

**Common Issues:**
- Insufficient balance: Check available days
- Request rejected: See rejection reason
- Balance not updating: Refresh page or check approval status

---

### Salary Increase Testing

**Test Cases:**

1. **View Salary History** (Any employee)
   - Login as employee
   - Navigate to "My Profile" or "Salary History"
   - View salary increases:
     - Increase date
     - Old salary
     - New salary
     - Increase amount
     - Increase percentage (avg 6.55%)
     - Reason
   - View salary progression chart

2. **Grant Salary Increase** (Admin only)
   - Navigate to HR → Salary Management
   - Select employee
   - Click "Grant Increase"
   - Fill form:
     - Effective date
     - New salary amount (or percentage)
     - Reason
     - Notes
   - Save increase
   - Verify employee history updated

3. **Salary Reports**
   - View all salary increases (38 total)
   - Export salary history
   - Analyze average increase (6.55%)
   - View salary distribution by role

**Common Issues:**
- Increase not showing: Check effective date
- Wrong amount: Verify calculation (percentage vs fixed)

---

## 🏗️ Construction Module Testing

### Project Management Testing

**Test Cases:**

1. **View Construction Projects**
   - Login as **Thomas Anderson** (hardware manager)
   - Navigate to Construction Projects
   - View 3 projects:
     - **Downtown Office Renovation** (In Progress, 60%)
       - Budget: $250,000
       - Start: 90 days ago
       - End: 60 days from now
       - Stages: 5
     - **Warehouse Expansion** (Completed, 100%)
       - Budget: $180,000
       - Start: 180 days ago
       - End: 30 days ago
       - Stages: 4
     - **Retail Store Build-out** (Planned, 0%)
       - Budget: $120,000
       - Start: 30 days from now
       - End: 180 days from now
       - Stages: 5
   - View project cards with progress bars

2. **Project Details**
   - Click on "Downtown Office Renovation"
   - View project information:
     - Client name
     - Location
     - Project type
     - Budget
     - Timeline
     - Current status
   - View project stages (5 stages):
     - Demolition (Completed)
     - Foundation Work (Completed)
     - Framing (In Progress)
     - Electrical & Plumbing (Pending)
     - Finishing (Pending)
   - Update stage status
   - Add stage notes
   - Upload stage photos

3. **Create New Project**
   - Click "New Project"
   - Fill form:
     - Project name
     - Client
     - Location
     - Project type
     - Budget
     - Start/end dates
     - Description
   - Add project stages
   - Save project
   - Verify project appears in list

---

### Contractor Management Testing

**Test Cases:**

1. **View Contractors**
   - Navigate to Contractors
   - View 8 contractors:
     - John Smith Electrical
     - ABC Plumbing Co.
     - Quality Painters Inc.
     - Steel Frame LLC
     - Premier Concrete
     - Green HVAC Systems
     - Precision Carpentry
     - Elite Finishing
   - View contractor cards with:
     - Name
     - Trade/specialty
     - Contact info
     - Rating
     - Active projects

2. **Contractor Details**
   - Click on contractor
   - View profile:
     - Business information
     - Contact details
     - Specialty/trade
     - Certifications
     - Insurance
     - Assigned projects
     - Payment history
   - Edit contractor info
   - Save changes

3. **Assign Contractor to Project**
   - Open project
   - Click "Assign Contractor"
   - Select contractor
   - Choose project stage
   - Set contract amount
   - Set start/end dates
   - Save assignment (2 assignments in demo)

4. **Record Contractor Payment**
   - View contractor assignments
   - Click "Record Payment"
   - Enter:
     - Payment amount
     - Payment date
     - Payment method
     - Description
   - Save payment (2 payments in demo)
   - Verify payment history updated

---

### Construction Reports

**Test Cases:**

1. **Project Status Report**
   - View all projects summary
   - Check project statuses
   - View budget vs actual
   - Export project list

2. **Financial Report**
   - View total project budgets
   - Check contractor payments
   - Analyze project profitability
   - Export financial summary

3. **Timeline Report**
   - View project Gantt chart
   - Check milestones
   - Identify delays
   - Export timeline

**Common Issues:**
- Missing stages: Check project configuration
- Payment not recorded: Verify contractor assignment
- Budget overrun: Review all expenses

---

## 🔄 Re-seeding Data

### Complete Re-seed

All seeding is **re-runnable**. The system will:
1. Detect existing demo data
2. Clean up old records
3. Create fresh data with the same structure

**Methods:**

1. **Admin UI** (Recommended):
   - Navigate to `/admin/data-management`
   - Click "Seed & Validate" tab
   - Click "Seed Complete Demo Data"
   - Wait for completion (~5-10 minutes)

2. **API Endpoint**:
   ```bash
   POST /api/admin/seed-complete-demo
   ```

3. **Template Restoration** (Fastest):
   ```bash
   POST /api/admin/restore-demo-template
   ```
   (~1-2 minutes vs ~5-10 minutes fresh seed)

---

### Selective Re-seeding

Reseed specific features only:

```bash
# WiFi only
POST /api/admin/seed-complete-demo
{
  "businessTypes": ["restaurant", "grocery"],
  "features": ["wifi"],
  "daysOfHistory": 30
}

# Payroll and HR only
POST /api/admin/seed-complete-demo
{
  "businessTypes": ["restaurant", "grocery"],
  "features": ["payroll", "hr"],
  "daysOfHistory": 30
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### "Email already exists" error
- **Cause:** Demo user accounts already exist
- **Solution:** Use re-runnable seeding endpoint or manually delete demo users
- **Query:** `DELETE FROM users WHERE email LIKE '%demo.com'`

#### "No employees found" error
- **Cause:** Employees not seeded before other data
- **Solution:** Run seeding in correct order or use master endpoint
- **Order:** Employees → Core data → Features

#### Orders/Expenses showing zero
- **Cause:** Date range filter doesn't match seeded data
- **Solution:** Check dashboard date range (last 30 days default)
- **Verify:** Seeded data is within selected date range

#### Permission denied errors
- **Cause:** User lacks business membership or role permissions
- **Solution:** Check `business_memberships` table
- **Verify:** User has correct role (Sales, Manager, Staff, Admin)

---

### WiFi Portal Issues

#### ESP32 sync fails
- **Error:** "503 Service Unavailable"
- **Cause:** ESP32 device capacity full
- **Solution:** Check `available_slots` in response, delete old tokens
- **Alternative:** Increase device capacity or add another device

#### Tokens not activating
- **Cause:** ESP32 sync pending or failed
- **Solution:** Manually trigger sync from WiFi Portal dashboard
- **Check:** ESP32 device connectivity and API key

#### R710 WLAN sync fails
- **Cause:** Invalid API credentials or network issue
- **Solution:** Verify R710 API credentials in integration settings
- **Test:** Use "Test Connection" button in R710 setup

---

### Printer Issues

#### Print jobs stuck in queue
- **Cause:** Printer offline or connection lost
- **Solution:** Check printer status and network connection
- **Retry:** Manually reprocess print job

#### Wrong barcode template applied
- **Cause:** Template assignment incorrect
- **Solution:** Verify product barcode template setting
- **Default:** Uses business default template if not specified

#### Receipt formatting issues
- **Cause:** Thermal printer settings mismatch
- **Solution:** Verify paper width (58mm/80mm) and font size
- **Test:** Print test receipt to verify settings

---

### Payroll Issues

#### Calculation mismatch
- **Cause:** Incorrect tax rates or deduction rules
- **Solution:** Verify business tax settings and deduction configuration
- **Check:** Payroll entry calculation breakdown

#### Insufficient balance error
- **Cause:** Payroll account balance too low
- **Solution:** Deposit funds to payroll account before processing
- **Verify:** Account balance >= total net pay

#### Missing employees in payroll
- **Cause:** Employee lacks payroll configuration
- **Solution:** Set up employee payroll details (salary, deductions)
- **Verify:** Employee has active status

---

### HR Issues

#### Benefits not showing for employee
- **Cause:** Benefit effective date in future
- **Solution:** Check benefit effective date
- **Verify:** Current date >= effective date

#### Leave request rejected automatically
- **Cause:** Insufficient leave balance
- **Solution:** Check employee leave balance before requesting
- **Verify:** Available balance >= requested days

#### Loan payment not applied
- **Cause:** Payment not recorded or incorrect amount
- **Solution:** Verify payment recorded in loan payment history
- **Recalculate:** Trigger loan balance recalculation

---

### Construction Issues

#### Project stages not updating
- **Cause:** Permission issue or validation error
- **Solution:** Verify user has manager or admin role
- **Check:** Project status allows stage updates

#### Contractor payment not recorded
- **Cause:** Contractor not assigned to project
- **Solution:** Assign contractor to project first, then record payment
- **Verify:** Contractor assignment exists

---

## 📞 Support & Resources

### Documentation
- **Main Plan:** `DEMO-DATA-EXPANSION-PLAN.md`
- **Testing Guides:** See Task 8.2 deliverables
- **Onboarding:** See `EMPLOYEE-ONBOARDING-CHECKLIST.md`

### Verification
- Check seeding endpoint responses for counts and timestamps
- Review browser console for client-side errors
- Check server logs for API errors
- Verify database records match expected counts

### Demo Data Statistics
After complete seeding, verify totals match:
- 4 businesses
- 16 employees
- 1,284 products
- ~150 expenses
- 96 sales orders
- 48 WiFi tokens
- 217 print jobs
- 3 payroll periods
- 80 benefit assignments
- 13 employee loans
- 45 leave requests
- 38 salary increases
- 3 construction projects

---

## 📋 Quick Reference Card

### Essential Login Credentials

| Business | Manager Email | Password | Features |
|----------|---------------|----------|----------|
| Restaurant | sarah.johnson@restaurant-demo.com | Demo@123 | POS, WiFi (ESP32), Payroll, HR |
| Grocery | james.brown@grocery-demo.com | Demo@123 | POS, WiFi (ESP32), Payroll, HR |
| Hardware | thomas.anderson@hardware-demo.com | Demo@123 | POS, WiFi (R710), HR, Construction |
| Clothing | miro.hwandaza@clothing-demo.com | Demo@123 | POS, WiFi (R710), HR |

### Admin Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/seed-complete-demo` | Seed all demo data |
| `POST /api/admin/restore-demo-template` | Fast reset (~1-2 min) |
| `GET /api/admin/data-management` | Admin UI dashboard |

### Feature URLs

| Feature | URL |
|---------|-----|
| Admin Data Management | `/admin/data-management` |
| WiFi Portal (ESP32) | `/wifi-portal` |
| R710 Portal | `/r710-portal` |
| Printer Management | `/admin/printers` |
| Payroll | `/payroll` |
| HR Dashboard | `/hr` |
| Construction Projects | `/construction` |

---

**Last Seeded:** Check seeding endpoint response for timestamp
**Environment:** Development only - do not use demo accounts in production!
**Support:** See troubleshooting section or check server logs

---

*This document is automatically maintained. Last updated: 2026-01-02*
