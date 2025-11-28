# Expense Account System - API Documentation

## Base URL
```
http://localhost:8080/api
```

---

## Authentication
All endpoints require authentication via NextAuth session cookie.

**Headers:**
```
Cookie: next-auth.session-token={token}
```

---

## Endpoints Overview

| Method | Endpoint | Permission Required | Description |
|--------|----------|---------------------|-------------|
| GET | `/expense-account` | `canAccessExpenseAccount` | List all expense accounts |
| POST | `/expense-account` | `canCreateExpenseAccount` | Create new expense account |
| GET | `/expense-account/[accountId]` | `canAccessExpenseAccount` | Get account details |
| GET | `/expense-account/[accountId]/transactions` | `canAccessExpenseAccount` | Get transaction history |
| POST | `/expense-account/[accountId]/deposits` | `canMakeExpenseDeposits` | Add deposit |
| POST | `/expense-account/[accountId]/payments` | `canMakeExpensePayments` | Create payment |
| POST | `/expense-account/[accountId]/payments/batch` | `canMakeExpensePayments` | Create batch payments |
| GET | `/expense-account/[accountId]/reports` | `canViewExpenseReports` | Get account reports |
| GET | `/expense-account/payees/[payeeType]/[payeeId]/payments` | `canAccessExpenseAccount` | Get payee payments |
| GET | `/expense-account/payees/[payeeType]/[payeeId]/reports` | `canViewExpenseReports` | Get payee reports |

---

## 1. List Expense Accounts

### GET `/expense-account`

List all expense accounts the user has access to.

**Permission:** `canAccessExpenseAccount`

**Query Parameters:** None

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "acc_abc123",
        "accountNumber": "ACC-0001",
        "accountName": "Project Alpha Expenses",
        "description": "Expenses for Project Alpha",
        "balance": 5000.00,
        "lowBalanceThreshold": 500.00,
        "isActive": true,
        "createdAt": "2025-11-01T00:00:00Z",
        "createdBy": {
          "id": "user_123",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "_count": {
          "deposits": 5,
          "payments": 12
        }
      }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - No permission

---

## 2. Create Expense Account

### POST `/expense-account`

Create a new expense account.

**Permission:** `canCreateExpenseAccount`

**Request Body:**
```json
{
  "accountName": "Project Beta Expenses",
  "description": "Expenses for Project Beta",
  "lowBalanceThreshold": 750.00
}
```

**Field Validation:**
- `accountName`: Required, 1-100 characters
- `description`: Optional, max 500 characters
- `lowBalanceThreshold`: Required, > 0, max 999999999.99

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_xyz789",
      "accountNumber": "ACC-0002",
      "accountName": "Project Beta Expenses",
      "description": "Expenses for Project Beta",
      "balance": 0.00,
      "lowBalanceThreshold": 750.00,
      "isActive": true,
      "createdAt": "2025-11-26T10:30:00Z",
      "createdById": "user_123"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `403 Forbidden` - No permission

---

## 3. Get Account Details

### GET `/expense-account/[accountId]`

Get details of a specific expense account.

**Permission:** `canAccessExpenseAccount`

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_abc123",
      "accountNumber": "ACC-0001",
      "accountName": "Project Alpha Expenses",
      "description": "Expenses for Project Alpha",
      "balance": 5000.00,
      "lowBalanceThreshold": 500.00,
      "isActive": true,
      "createdAt": "2025-11-01T00:00:00Z",
      "createdBy": {
        "id": "user_123",
        "name": "Admin User"
      }
    }
  }
}
```

**Error Responses:**
- `404 Not Found` - Account doesn't exist

---

## 4. Get Transaction History

### GET `/expense-account/[accountId]/transactions`

Get combined transaction history (deposits + payments).

**Permission:** `canAccessExpenseAccount`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date (YYYY-MM-DD)
- `endDate` (optional): ISO 8601 date
- `transactionType` (optional): "DEPOSIT" or "PAYMENT"
- `limit` (optional): Number of records (default: 50, max: 100)
- `offset` (optional): Number of records to skip (default: 0)
- `sortOrder` (optional): "asc" or "desc" (default: "desc")

**Example Request:**
```
GET /expense-account/acc_abc123/transactions?startDate=2025-11-01&limit=20&sortOrder=desc
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_123",
        "type": "PAYMENT",
        "amount": -500.00,
        "date": "2025-11-25T00:00:00Z",
        "description": "Payment to John Doe",
        "payeeType": "EMPLOYEE",
        "payeeEmployee": {
          "id": "emp_456",
          "fullName": "John Doe",
          "employeeNumber": "EMP-001"
        },
        "category": {
          "id": "cat_789",
          "name": "Salary & Wages",
          "emoji": "💵"
        },
        "receiptNumber": "RCP-001",
        "status": "SUBMITTED",
        "balanceAfter": 4500.00,
        "createdBy": {
          "id": "user_123",
          "name": "Admin User"
        },
        "createdAt": "2025-11-25T10:30:00Z"
      },
      {
        "id": "dep_456",
        "type": "DEPOSIT",
        "amount": 5000.00,
        "date": "2025-11-20T00:00:00Z",
        "description": "Deposit from Hardware Haven",
        "sourceType": "BUSINESS_TRANSFER",
        "sourceBusiness": {
          "id": "bus_789",
          "name": "Hardware Haven",
          "type": "hardware"
        },
        "transactionType": "BUSINESS_TRANSFER",
        "balanceAfter": 5000.00,
        "createdBy": {
          "id": "user_123",
          "name": "Admin User"
        },
        "createdAt": "2025-11-20T08:00:00Z"
      }
    ],
    "pagination": {
      "total": 17,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    },
    "currentBalance": 4500.00,
    "accountName": "Project Alpha Expenses"
  }
}
```

---

## 5. Add Deposit

### POST `/expense-account/[accountId]/deposits`

Add a deposit to an expense account.

**Permission:** `canMakeExpenseDeposits`

**Request Body (Manual Deposit):**
```json
{
  "amount": 3000.00,
  "depositDate": "2025-11-26",
  "sourceType": "MANUAL",
  "transactionType": "CASH",
  "manualNote": "Cash deposit from petty cash"
}
```

**Request Body (Business Transfer):**
```json
{
  "amount": 5000.00,
  "depositDate": "2025-11-26",
  "sourceType": "BUSINESS_TRANSFER",
  "transactionType": "BUSINESS_TRANSFER",
  "sourceBusinessId": "bus_789",
  "autoGeneratedNote": "Transfer from Hardware Haven"
}
```

**Field Validation:**
- `amount`: Required, > 0, max 2 decimal places
- `depositDate`: Required, valid date
- `sourceType`: Required, "MANUAL" or "BUSINESS_TRANSFER"
- `transactionType`: Required
- `sourceBusinessId`: Required if sourceType is BUSINESS_TRANSFER

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "deposit": {
      "id": "dep_xyz",
      "expenseAccountId": "acc_abc123",
      "amount": 3000.00,
      "depositDate": "2025-11-26T00:00:00Z",
      "sourceType": "MANUAL",
      "transactionType": "CASH",
      "manualNote": "Cash deposit from petty cash",
      "createdAt": "2025-11-26T10:00:00Z"
    },
    "newBalance": 7500.00
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `403 Forbidden` - No permission
- `404 Not Found` - Account or business not found

**Note:** If `sourceType` is `BUSINESS_TRANSFER`, the source business's balance is automatically debited.

---

## 6. Create Single Payment

### POST `/expense-account/[accountId]/payments`

Create a single payment from an expense account.

**Permission:** `canMakeExpensePayments`

**Request Body (Employee Payment):**
```json
{
  "amount": 500.00,
  "paymentDate": "2025-11-26",
  "payeeType": "EMPLOYEE",
  "payeeEmployeeId": "emp_456",
  "categoryId": "cat_789",
  "notes": "Weekly salary payment",
  "receiptNumber": "RCP-001",
  "receiptUrl": null
}
```

**Request Body (New Person/Contractor):**
```json
{
  "amount": 750.00,
  "paymentDate": "2025-11-26",
  "payeeType": "PERSON",
  "createNewPerson": true,
  "newPersonData": {
    "fullName": "John Smith",
    "nationalId": "123456789",
    "phone": "+1234567890",
    "email": "john@example.com",
    "address": "123 Main St"
  },
  "categoryId": "cat_consulting",
  "notes": "Consulting services"
}
```

**Supported Payee Types:**
- `EMPLOYEE` - Requires `payeeEmployeeId`
- `PERSON` - Requires `payeePersonId` or `createNewPerson: true`
- `BUSINESS` - Requires `payeeBusinessId`
- `USER` - Requires `payeeUserId`

**Field Validation:**
- `amount`: Required, > 0, max 2 decimal places
- `paymentDate`: Required, valid date
- `payeeType`: Required
- `categoryId`: Optional
- Account must have sufficient balance

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "pay_xyz",
      "expenseAccountId": "acc_abc123",
      "amount": 500.00,
      "paymentDate": "2025-11-26T00:00:00Z",
      "payeeType": "EMPLOYEE",
      "payeeEmployeeId": "emp_456",
      "categoryId": "cat_789",
      "notes": "Weekly salary payment",
      "receiptNumber": "RCP-001",
      "status": "SUBMITTED",
      "createdAt": "2025-11-26T10:00:00Z"
    },
    "newBalance": 7000.00,
    "createdPerson": null
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input or insufficient funds
- `403 Forbidden` - No permission
- `404 Not Found` - Account or payee not found

---

## 7. Create Batch Payments

### POST `/expense-account/[accountId]/payments/batch`

Create multiple payments in a single transaction.

**Permission:** `canMakeExpensePayments`

**Request Body:**
```json
{
  "payments": [
    {
      "amount": 500.00,
      "paymentDate": "2025-11-26",
      "payeeType": "EMPLOYEE",
      "payeeEmployeeId": "emp_456",
      "categoryId": "cat_salary",
      "notes": "Salary payment"
    },
    {
      "amount": 600.00,
      "paymentDate": "2025-11-26",
      "payeeType": "EMPLOYEE",
      "payeeEmployeeId": "emp_789",
      "categoryId": "cat_salary",
      "notes": "Salary payment"
    },
    {
      "amount": 750.00,
      "paymentDate": "2025-11-26",
      "payeeType": "PERSON",
      "payeePersonId": "per_123",
      "categoryId": "cat_consulting",
      "notes": "Consulting fee"
    }
  ]
}
```

**Validation:**
- Array must have 1-50 payments
- All payments must be valid
- Total amount must not exceed account balance
- All payments processed atomically (all or nothing)

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pay_1",
        "amount": 500.00,
        "payeeType": "EMPLOYEE",
        "status": "SUBMITTED"
      },
      {
        "id": "pay_2",
        "amount": 600.00,
        "payeeType": "EMPLOYEE",
        "status": "SUBMITTED"
      },
      {
        "id": "pay_3",
        "amount": 750.00,
        "payeeType": "PERSON",
        "status": "SUBMITTED"
      }
    ],
    "totalAmount": 1850.00,
    "paymentCount": 3,
    "newBalance": 5150.00
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input, insufficient funds, or batch size exceeded

---

## 8. Get Account Reports

### GET `/expense-account/[accountId]/reports`

Get analytics and reports for an expense account.

**Permission:** `canViewExpenseReports`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDeposits": 15000.00,
      "totalPayments": 8500.00,
      "currentBalance": 6500.00,
      "paymentCount": 25,
      "depositCount": 5,
      "averagePayment": 340.00
    },
    "paymentsByCategory": [
      {
        "categoryId": "cat_salary",
        "categoryName": "Salary & Wages",
        "categoryEmoji": "💵",
        "totalAmount": 5000.00,
        "paymentCount": 15
      },
      {
        "categoryId": "cat_consulting",
        "categoryName": "Consulting Services",
        "categoryEmoji": "📊",
        "totalAmount": 2500.00,
        "paymentCount": 6
      }
    ],
    "paymentsByPayeeType": [
      {
        "payeeType": "EMPLOYEE",
        "totalAmount": 6000.00,
        "paymentCount": 18
      },
      {
        "payeeType": "PERSON",
        "totalAmount": 2000.00,
        "paymentCount": 5
      }
    ],
    "dailyTrends": [
      {
        "date": "2025-11-01",
        "deposits": 5000.00,
        "payments": 0.00,
        "balance": 5000.00
      },
      {
        "date": "2025-11-02",
        "deposits": 0.00,
        "payments": 500.00,
        "balance": 4500.00
      }
    ]
  }
}
```

---

## 9. Get Payee Payments

### GET `/expense-account/payees/[payeeType]/[payeeId]/payments`

Get all payments to a specific payee across ALL expense accounts.

**Permission:** `canAccessExpenseAccount`

**Path Parameters:**
- `payeeType`: "USER" | "EMPLOYEE" | "PERSON" | "BUSINESS"
- `payeeId`: ID of the payee

**Query Parameters:**
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Number of records to skip (default: 0)
- `accountId` (optional): Filter by specific expense account

**Example Request:**
```
GET /expense-account/payees/EMPLOYEE/emp_456/payments?startDate=2025-11-01&limit=50
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "payee": {
      "id": "emp_456",
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
        "accountId": "acc_abc123",
        "accountName": "Project Alpha",
        "accountNumber": "ACC-0001",
        "totalPaid": 8000.00,
        "paymentCount": 25
      },
      {
        "accountId": "acc_xyz789",
        "accountName": "Project Beta",
        "accountNumber": "ACC-0002",
        "totalPaid": 7000.00,
        "paymentCount": 20
      }
    ],
    "payments": [
      {
        "id": "pay_123",
        "amount": 500.00,
        "paymentDate": "2025-11-25T00:00:00Z",
        "category": {
          "id": "cat_salary",
          "name": "Salary & Wages",
          "emoji": "💵"
        },
        "receiptNumber": "RCP-001",
        "notes": "Weekly salary",
        "status": "SUBMITTED",
        "expenseAccount": {
          "id": "acc_abc123",
          "accountName": "Project Alpha",
          "accountNumber": "ACC-0001"
        },
        "createdAt": "2025-11-25T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid payee type
- `404 Not Found` - Payee not found

---

## 10. Get Payee Reports

### GET `/expense-account/payees/[payeeType]/[payeeId]/reports`

Get analytics and reports for a specific payee across all expense accounts.

**Permission:** `canViewExpenseReports`

**Path Parameters:**
- `payeeType`: "USER" | "EMPLOYEE" | "PERSON" | "BUSINESS"
- `payeeId`: ID of the payee

**Query Parameters:**
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "payee": {
      "id": "emp_456",
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
        "categoryId": "cat_salary",
        "categoryName": "Salary & Wages",
        "categoryEmoji": "💵",
        "totalAmount": 12000.00,
        "paymentCount": 36
      }
    ],
    "paymentsByAccount": [
      {
        "accountId": "acc_abc123",
        "accountName": "Project Alpha",
        "accountNumber": "ACC-0001",
        "totalAmount": 8000.00,
        "paymentCount": 25
      }
    ],
    "paymentTrends": [
      {
        "month": "Nov 2025",
        "totalAmount": 5000.00,
        "paymentCount": 15
      }
    ],
    "dateRange": {
      "startDate": null,
      "endDate": null
    }
  }
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input or business logic error
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - No permission
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Common Error Messages
- "Unauthorized" - User not logged in
- "You do not have permission to..." - Missing required permission
- "Expense account not found" - Invalid account ID
- "Insufficient funds" - Account balance too low
- "Payee not found" - Invalid payee ID
- "Invalid payee type" - Must be USER, EMPLOYEE, PERSON, or BUSINESS

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding:
- 100 requests per minute per user for read operations
- 20 requests per minute per user for write operations

---

## Webhooks

Not currently implemented. Future enhancement could include:
- Payment created webhook
- Low balance alert webhook
- Account created webhook

---

## Changelog

**Version 1.0.0** (2025-11-26)
- Initial release
- Account management endpoints
- Deposit endpoints
- Payment endpoints (single and batch)
- Report endpoints
- Payee-specific endpoints

---

**End of API Documentation**
