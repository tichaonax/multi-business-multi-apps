# Testing Payee-Specific API Routes

## Overview
This document provides testing instructions for the payee-specific expense account API routes created in Phase 17A.

## API Endpoints

### 1. Payee Payments API
**Endpoint:** `GET /api/expense-account/payees/[payeeType]/[payeeId]/payments`

**Purpose:** Fetch all payments to a specific payee across ALL expense accounts

**Supported Payee Types:**
- `USER` - System users
- `EMPLOYEE` - Employees
- `PERSON` - Contractors/Persons
- `BUSINESS` - Business entities

**Query Parameters:**
- `startDate` (optional): Filter from this date (YYYY-MM-DD)
- `endDate` (optional): Filter up to this date (YYYY-MM-DD)
- `limit` (optional): Number of payments to return (default: 100)
- `offset` (optional): Number of payments to skip (default: 0)
- `accountId` (optional): Filter by specific expense account ID

**Permission Required:** `canAccessExpenseAccount`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "payee": {
      "id": "...",
      "type": "EMPLOYEE",
      "name": "John Doe",
      "fullName": "John Doe",
      "employeeNumber": "EMP-001"
    },
    "totalPaid": 15000.00,
    "paymentCount": 45,
    "accountsCount": 3,
    "accountBreakdown": [
      {
        "accountId": "...",
        "accountName": "Project Alpha",
        "accountNumber": "ACC-001",
        "totalPaid": 8000.00,
        "paymentCount": 25
      },
      {
        "accountId": "...",
        "accountName": "Marketing Budget",
        "accountNumber": "ACC-002",
        "totalPaid": 7000.00,
        "paymentCount": 20
      }
    ],
    "payments": [
      {
        "id": "...",
        "amount": 500.00,
        "paymentDate": "2025-11-20T00:00:00Z",
        "category": {
          "id": "...",
          "name": "Salary & Wages",
          "emoji": "💵"
        },
        "receiptNumber": "RCP-001",
        "receiptUrl": null,
        "notes": "Monthly salary payment",
        "status": "SUBMITTED",
        "expenseAccount": {
          "id": "...",
          "accountName": "Project Alpha",
          "accountNumber": "ACC-001"
        },
        "createdBy": {
          "id": "...",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "createdAt": "2025-11-20T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 100,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### 2. Payee Reports API
**Endpoint:** `GET /api/expense-account/payees/[payeeType]/[payeeId]/reports`

**Purpose:** Generate aggregated expense report for a specific payee

**Query Parameters:**
- `startDate` (optional): Filter from this date (YYYY-MM-DD)
- `endDate` (optional): Filter up to this date (YYYY-MM-DD)

**Permission Required:** `canViewExpenseReports`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "payee": {
      "id": "...",
      "type": "EMPLOYEE",
      "name": "John Doe"
    },
    "summary": {
      "totalPaid": 15000.00,
      "paymentCount": 45,
      "averagePayment": 333.33,
      "accountsCount": 3
    },
    "paymentsByCategory": [
      {
        "categoryId": "...",
        "categoryName": "Salary & Wages",
        "categoryEmoji": "💵",
        "totalAmount": 12000.00,
        "paymentCount": 36
      },
      {
        "categoryId": "...",
        "categoryName": "Bonuses",
        "categoryEmoji": "🎁",
        "totalAmount": 3000.00,
        "paymentCount": 9
      }
    ],
    "paymentsByAccount": [
      {
        "accountId": "...",
        "accountName": "Project Alpha",
        "accountNumber": "ACC-001",
        "totalAmount": 8000.00,
        "paymentCount": 25
      },
      {
        "accountId": "...",
        "accountName": "Marketing Budget",
        "accountNumber": "ACC-002",
        "totalAmount": 7000.00,
        "paymentCount": 20
      }
    ],
    "paymentTrends": [
      {
        "month": "Jan 2025",
        "totalAmount": 5000.00,
        "paymentCount": 15
      },
      {
        "month": "Feb 2025",
        "totalAmount": 5500.00,
        "paymentCount": 16
      }
    ],
    "dateRange": {
      "startDate": null,
      "endDate": null
    }
  }
}
```

## Testing Steps

### Prerequisites
1. Create an expense account through the UI
2. Add a deposit to the account (minimum $5000 recommended)
3. Create some expense payments to various payees

### Automated Test Data Creation
Run the script to create test payment data:
```bash
node scripts/create-test-expense-payment-data.js
```

This will:
- Find an existing expense account
- Find employees, persons, and businesses in the database
- Create 3 payments to an employee ($600, $700, $800)
- Create 2 payments to a person/contractor ($450, $500)
- Create 1 payment to a business ($1200)
- Update the account balance accordingly

### Manual Testing

#### Test 1: Employee Payee Payments
```bash
# Find employee ID from test script output or database
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/payments
```

**Expected Result:**
- Returns list of all payments to the employee
- Groups payments by account in accountBreakdown
- Shows total paid and payment count
- Pagination info included

#### Test 2: Employee Payee Reports
```bash
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/reports
```

**Expected Result:**
- Summary statistics (total, count, average)
- Payments grouped by category (pie chart data)
- Payments grouped by account (bar chart data)
- Monthly trends (line chart data)

#### Test 3: Date Range Filtering
```bash
curl -H "Cookie: next-auth.session-token=..." \
  "http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/payments?startDate=2025-11-01&endDate=2025-11-30"
```

**Expected Result:**
- Only payments within specified date range
- Total and count reflect filtered results

#### Test 4: Pagination
```bash
curl -H "Cookie: next-auth.session-token=..." \
  "http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/payments?limit=2&offset=0"
```

**Expected Result:**
- Returns only 2 payments
- `hasMore: true` if more payments exist
- Next page: `offset=2`

#### Test 5: Account Filtering
```bash
curl -H "Cookie: next-auth.session-token=..." \
  "http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeId}/payments?accountId={accountId}"
```

**Expected Result:**
- Only payments from specified account
- accountBreakdown contains only that account

#### Test 6: Person/Contractor Payee
```bash
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/PERSON/{personId}/payments

curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/PERSON/{personId}/reports
```

**Expected Result:**
- Same structure as employee endpoints
- Payee info includes fullName and nationalId

#### Test 7: Business Payee
```bash
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/BUSINESS/{businessId}/payments

curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/BUSINESS/{businessId}/reports
```

**Expected Result:**
- Same structure as employee endpoints
- Payee info includes name and type

#### Test 8: User Payee
```bash
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/USER/{userId}/payments

curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/USER/{userId}/reports
```

**Expected Result:**
- Same structure as employee endpoints
- Payee info includes name and email

#### Test 9: Invalid Payee Type
```bash
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/INVALID/{id}/payments
```

**Expected Result:**
- 400 Bad Request
- Error: "Invalid payee type. Must be USER, EMPLOYEE, PERSON, or BUSINESS"

#### Test 10: Non-existent Payee
```bash
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/EMPLOYEE/non-existent-id/payments
```

**Expected Result:**
- 404 Not Found
- Error: "Payee not found"

#### Test 11: Payee with No Payments
```bash
# Find an employee with no expense payments
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:8080/api/expense-account/payees/EMPLOYEE/{employeeIdWithNoPayments}/payments
```

**Expected Result:**
- 200 OK
- totalPaid: 0
- paymentCount: 0
- accountsCount: 0
- payments: []
- accountBreakdown: []

#### Test 12: Permission Checks
Test with users having different permissions:

1. **User without `canAccessExpenseAccount`:**
   - Expected: 403 Forbidden on payments endpoint

2. **User without `canViewExpenseReports`:**
   - Expected: 403 Forbidden on reports endpoint

3. **User with `canAccessExpenseAccount` but not `canViewExpenseReports`:**
   - Expected: Can access payments, cannot access reports

## Test Checklist

### Payments API (`/payments`)
- [ ] Returns payments for EMPLOYEE payee
- [ ] Returns payments for PERSON payee
- [ ] Returns payments for BUSINESS payee
- [ ] Returns payments for USER payee
- [ ] Date range filtering works (startDate, endDate)
- [ ] Pagination works (limit, offset)
- [ ] Account filtering works (accountId)
- [ ] Account breakdown aggregates correctly
- [ ] Total paid calculation is accurate
- [ ] Payment count is accurate
- [ ] Handles payee with no payments
- [ ] Returns 404 for non-existent payee
- [ ] Returns 400 for invalid payee type
- [ ] Enforces canAccessExpenseAccount permission

### Reports API (`/reports`)
- [ ] Returns report for EMPLOYEE payee
- [ ] Returns report for PERSON payee
- [ ] Returns report for BUSINESS payee
- [ ] Returns report for USER payee
- [ ] Summary statistics are accurate (total, count, average)
- [ ] Payments by category aggregates correctly
- [ ] Payments by account aggregates correctly
- [ ] Payment trends by month are accurate
- [ ] Date range filtering works
- [ ] Handles payee with no payments
- [ ] Returns 404 for non-existent payee
- [ ] Returns 400 for invalid payee type
- [ ] Enforces canViewExpenseReports permission

## Notes

### Performance Considerations
- The payments API fetches all payments and groups them by account
- For payees with thousands of payments, use pagination
- Consider implementing server-side filtering and grouping for large datasets

### Data Integrity
- Only SUBMITTED payments are included in results
- DRAFT payments are excluded
- Balance calculations match expense account balance

### Future Enhancements
- Add export functionality (CSV, PDF)
- Add filtering by category
- Add filtering by date ranges with presets (last 7 days, last 30 days, etc.)
- Add sorting options (by date, amount, account)
- Implement caching for frequently accessed payee reports
