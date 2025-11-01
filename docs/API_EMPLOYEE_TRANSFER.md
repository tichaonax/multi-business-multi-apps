# Employee Transfer API Documentation

## Overview
The Employee Transfer API provides endpoints for transferring employees between businesses during business deletion operations. All endpoints require system administrator authentication.

**Base Path:** `/api/admin/businesses/[id]/`  
**Authentication:** System Admin Only  
**Authorization Header:** Session-based (next-auth)

---

## Endpoints

### 1. Get Transferable Employees

**Endpoint:** `GET /api/admin/businesses/[id]/transferable-employees`  
**Description:** Retrieves all active employees for a business who can be transferred.

#### Request

**URL Parameters:**
- `id` (string, required) - Business ID

**Headers:**
```
Cookie: next-auth.session-token=...
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "count": 2,
  "employees": [
    {
      "id": "emp-123",
      "fullName": "John Doe",
      "employeeNumber": "EMP001",
      "primaryBusinessId": "biz-1",
      "primaryBusinessName": "Store A",
      "isActive": true,
      "jobTitle": {
        "id": "job-1",
        "title": "Manager"
      },
      "activeContract": {
        "id": "contract-123",
        "contractNumber": "CON-2024-001",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": null,
        "status": "active",
        "baseSalary": 50000
      }
    }
  ]
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Only system administrators can access this endpoint"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch transferable employees: [error message]"
}
```

#### Notes
- Returns only active employees
- Includes employee's active contract details
- Returns empty array if no transferable employees

---

### 2. Get Compatible Target Businesses

**Endpoint:** `GET /api/admin/businesses/[id]/compatible-targets`  
**Description:** Retrieves all businesses of the same type (excluding the source business) that employees can be transferred to.

#### Request

**URL Parameters:**
- `id` (string, required) - Source Business ID

**Headers:**
```
Cookie: next-auth.session-token=...
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "count": 3,
  "sourceBusinessType": "retail",
  "businesses": [
    {
      "id": "biz-2",
      "name": "Store B",
      "type": "retail",
      "shortName": "STB",
      "isActive": true,
      "employeeCount": 15
    },
    {
      "id": "biz-3",
      "name": "Store C",
      "type": "retail",
      "shortName": "STC",
      "isActive": true,
      "employeeCount": 8
    }
  ]
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Only system administrators can access this endpoint"
}
```

**404 Not Found:**
```json
{
  "error": "Source business not found"
}
```

**400 Bad Request:**
```json
{
  "error": "Source business is inactive"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch compatible businesses: [error message]"
}
```

#### Notes
- Only returns businesses of the same type
- Excludes the source business
- Only returns active businesses
- Sorted by name

---

### 3. Transfer Preview (Validation)

**Endpoint:** `POST /api/admin/businesses/[id]/transfer-preview`  
**Description:** Validates a proposed employee transfer without executing it. Returns validation results and warnings.

#### Request

**URL Parameters:**
- `id` (string, required) - Source Business ID

**Headers:**
```
Content-Type: application/json
Cookie: next-auth.session-token=...
```

**Body:**
```json
{
  "targetBusinessId": "biz-2",
  "employeeIds": ["emp-123", "emp-456"]
}
```

**Body Parameters:**
- `targetBusinessId` (string, required) - Target business ID
- `employeeIds` (string[], required) - Array of employee IDs to transfer

#### Response

**Success (200) - Valid Transfer:**
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "sourceBusinessType": "retail",
    "targetBusinessType": "retail",
    "validEmployeeIds": ["emp-123", "emp-456"],
    "invalidEmployeeIds": []
  }
}
```

**Success (200) - Invalid Transfer:**
```json
{
  "success": true,
  "validation": {
    "isValid": false,
    "errors": [
      "Business types do not match: retail vs restaurant"
    ],
    "warnings": [],
    "sourceBusinessType": "retail",
    "targetBusinessType": "restaurant",
    "validEmployeeIds": [],
    "invalidEmployeeIds": ["emp-123", "emp-456"]
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "targetBusinessId and employeeIds are required"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Only system administrators can transfer employees"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to validate transfer: [error message]"
}
```

#### Validation Rules
1. **Business Type Match:** Source and target businesses must have the same type
2. **Active Employees:** All employees must be active
3. **Primary Business:** Employees must belong to source business as primary
4. **Target Exists:** Target business must exist and be active

#### Notes
- Does NOT execute the transfer
- Use this before actual transfer to show preview to user
- Returns detailed validation results

---

### 4. Execute Employee Transfer

**Endpoint:** `POST /api/admin/businesses/[id]/transfer-employees`  
**Description:** Executes the employee transfer from source to target business. Creates contract renewal records and updates business assignments.

#### Request

**URL Parameters:**
- `id` (string, required) - Source Business ID

**Headers:**
```
Content-Type: application/json
Cookie: next-auth.session-token=...
```

**Body:**
```json
{
  "targetBusinessId": "biz-2",
  "employeeIds": ["emp-123", "emp-456"]
}
```

**Body Parameters:**
- `targetBusinessId` (string, required) - Target business ID
- `employeeIds` (string[], required) - Array of employee IDs to transfer

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Successfully transferred 2 employees",
  "data": {
    "transferredCount": 2,
    "contractRenewalsCreated": 2,
    "businessAssignmentsUpdated": 4,
    "employeeIds": ["emp-123", "emp-456"],
    "errors": [],
    "auditLogId": "audit-789"
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "targetBusinessId and employeeIds are required"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Only system administrators can transfer employees"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to transfer employees: [error message]"
}
```

#### What Happens During Transfer

1. **Transaction Start** - All operations in single database transaction
2. **Update Employees Table:**
   - Set `primaryBusinessId` to target business
3. **Update Business Assignments:**
   - Mark old primary assignment as `isPrimary=false, isActive=false`
   - Create new primary assignment as `isPrimary=true, isActive=true`
4. **Create Contract Renewals:**
   - One renewal per employee with active contract
   - Status: `pending`
   - Due Date: 7 days from now
   - Flag: `isAutoRenewal=true`
   - Reason: "Business Transfer - [Source] to [Target]"
5. **Create Audit Log:**
   - Action: `EMPLOYEE_TRANSFER`
   - Details: Source, target, employee IDs, counts
6. **Transaction Commit** - All or nothing

#### Database Changes

**employees:**
```sql
UPDATE employees 
SET primary_business_id = 'biz-2'
WHERE id IN ('emp-123', 'emp-456');
```

**employee_business_assignments:**
```sql
-- Deactivate old primary
UPDATE employee_business_assignments
SET is_primary = false, is_active = false
WHERE employee_id IN ('emp-123', 'emp-456')
  AND business_id = 'biz-1'
  AND is_primary = true;

-- Create new primary
INSERT INTO employee_business_assignments (employee_id, business_id, is_primary, is_active)
VALUES 
  ('emp-123', 'biz-2', true, true),
  ('emp-456', 'biz-2', true, true);
```

**contract_renewals:**
```sql
INSERT INTO contract_renewals (
  employee_id, contract_id, status, due_date, 
  is_auto_renewal, renewal_reason
)
VALUES 
  ('emp-123', 'contract-123', 'pending', NOW() + INTERVAL '7 days', 
   true, 'Business Transfer - Store A to Store B'),
  ('emp-456', 'contract-456', 'pending', NOW() + INTERVAL '7 days', 
   true, 'Business Transfer - Store A to Store B');
```

#### Transaction Rollback

If ANY operation fails:
- Entire transaction is rolled back
- No partial updates
- Database remains in consistent state
- Error returned to caller

#### Notes
- **Atomic Operation:** All changes succeed or all fail
- **Contract History:** Original contracts are NOT modified
- **Audit Trail:** Complete audit log of transfer
- **Idempotent:** Safe to retry on failure

---

## Service Layer Functions

### getTransferableEmployees(businessId: string)

**Location:** `src/lib/employee-transfer-service.ts`

**Description:** Retrieves all active employees for a business.

**Parameters:**
- `businessId` (string) - Business ID

**Returns:** `Promise<TransferableEmployee[]>`

**Example:**
```typescript
const employees = await getTransferableEmployees('biz-1')
console.log(employees.length) // 5
console.log(employees[0].fullName) // "John Doe"
```

---

### getCompatibleTargetBusinesses(businessId: string)

**Location:** `src/lib/employee-transfer-service.ts`

**Description:** Gets all businesses of same type as source business.

**Parameters:**
- `businessId` (string) - Source business ID

**Returns:** `Promise<CompatibleBusiness[]>`

**Example:**
```typescript
const targets = await getCompatibleTargetBusinesses('biz-1')
console.log(targets.length) // 3
console.log(targets[0].type) // "retail"
```

---

### validateTransfer(sourceId, targetId, employeeIds)

**Location:** `src/lib/employee-transfer-service.ts`

**Description:** Validates a proposed transfer without executing.

**Parameters:**
- `sourceId` (string) - Source business ID
- `targetId` (string) - Target business ID
- `employeeIds` (string[]) - Employee IDs to transfer

**Returns:** `Promise<TransferValidationResult>`

**Example:**
```typescript
const validation = await validateTransfer('biz-1', 'biz-2', ['emp-123'])

if (validation.isValid) {
  console.log('Transfer is valid')
} else {
  console.error('Errors:', validation.errors)
}
```

---

### transferEmployeesToBusiness(sourceId, targetId, employeeIds, userId)

**Location:** `src/lib/employee-transfer-service.ts`

**Description:** Executes employee transfer in transaction.

**Parameters:**
- `sourceId` (string) - Source business ID
- `targetId` (string) - Target business ID
- `employeeIds` (string[]) - Employee IDs to transfer
- `userId` (string) - Admin user ID for audit

**Returns:** `Promise<TransferResult>`

**Example:**
```typescript
const result = await transferEmployeesToBusiness(
  'biz-1', 
  'biz-2', 
  ['emp-123', 'emp-456'],
  'admin-1'
)

if (result.success) {
  console.log(`Transferred ${result.transferredCount} employees`)
  console.log(`Created ${result.contractRenewalsCreated} renewals`)
} else {
  console.error('Errors:', result.errors)
}
```

---

## Transaction Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  EMPLOYEE TRANSFER FLOW                      │
└─────────────────────────────────────────────────────────────┘

1. USER INITIATES TRANSFER
   ↓
2. GET /transferable-employees
   ↓
3. Display Employee List
   ↓
4. GET /compatible-targets
   ↓
5. Display Target Businesses
   ↓
6. User Selects Target
   ↓
7. POST /transfer-preview (Validation)
   ↓
8. Display Preview & Warnings
   ↓
9. User Confirms
   ↓
10. POST /transfer-employees (Execute)
    ↓
    ┌─────────────────────────────────┐
    │  DATABASE TRANSACTION BEGINS    │
    ├─────────────────────────────────┤
    │                                 │
    │  A. Update employees table      │
    │     - Set new primaryBusinessId │
    │                                 │
    │  B. Update assignments (old)    │
    │     - Set isPrimary = false     │
    │     - Set isActive = false      │
    │                                 │
    │  C. Create assignments (new)    │
    │     - Create isPrimary = true   │
    │     - Create isActive = true    │
    │                                 │
    │  D. Create contract renewals    │
    │     - status = 'pending'        │
    │     - due_date = NOW() + 7 days │
    │     - is_auto_renewal = true    │
    │                                 │
    │  E. Create audit log            │
    │     - action = 'EMPLOYEE_TRANSFER'│
    │     - details = transfer info   │
    │                                 │
    │  COMMIT (All succeed)           │
    │  OR                             │
    │  ROLLBACK (Any fail)            │
    │                                 │
    └─────────────────────────────────┘
    ↓
11. Return Success/Error
    ↓
12. Display Result to User
    ↓
13. (Optional) Proceed with Business Deletion
```

---

## Database Schema Notes

### Tables Affected

#### employees
```sql
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  primary_business_id TEXT REFERENCES businesses(id),
  is_active BOOLEAN DEFAULT true,
  ...
);

-- Transfer updates: primary_business_id
```

#### employee_business_assignments
```sql
CREATE TABLE employee_business_assignments (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  business_id TEXT REFERENCES businesses(id),
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  ...
);

-- Transfer creates new record for target business
-- Transfer deactivates old primary assignment
```

#### contract_renewals
```sql
CREATE TABLE contract_renewals (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  contract_id TEXT REFERENCES employee_contracts(id),
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMP,
  is_auto_renewal BOOLEAN DEFAULT false,
  renewal_reason TEXT,
  ...
);

-- Transfer creates renewal record for each employee
-- Flags with is_auto_renewal = true
-- Sets due_date = NOW() + 7 days
```

#### audit_log
```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  ...
);

-- Transfer creates audit log entry
-- action = 'EMPLOYEE_TRANSFER'
-- details includes source, target, employee IDs, counts
```

### Indexes

**Recommended Indexes:**
```sql
-- For employee lookups
CREATE INDEX idx_employees_primary_business 
ON employees(primary_business_id) WHERE is_active = true;

-- For assignment queries
CREATE INDEX idx_assignments_employee_business 
ON employee_business_assignments(employee_id, business_id, is_primary);

-- For renewal queries
CREATE INDEX idx_renewals_employee_status 
ON contract_renewals(employee_id, status);

-- For audit queries
CREATE INDEX idx_audit_action_created 
ON audit_log(action, created_at DESC);
```

---

## Error Handling

### Common Errors

**1. Business Type Mismatch**
```
Error: "Business types do not match: retail vs restaurant"
Resolution: Select a target business of the same type
```

**2. Inactive Employee**
```
Error: "Cannot transfer inactive employees"
Resolution: Only active employees can be transferred
```

**3. Employee Not Found**
```
Error: "Employee not found or does not belong to source business"
Resolution: Verify employee ID and business ownership
```

**4. Transaction Failure**
```
Error: "Failed to transfer employees: [database error]"
Resolution: Check database logs, retry operation
```

**5. Permission Denied**
```
Error: "Only system administrators can access this endpoint"
Resolution: Ensure user has isSystemAdmin = true
```

---

## Rate Limiting

**Current:** None  
**Recommendation:** Implement rate limiting for production:
- 10 requests/minute per user
- 100 requests/hour per user

---

## Monitoring

### Key Metrics to Monitor

1. **Transfer Success Rate**
   - Target: >99%
   - Query: `SELECT COUNT(*) FROM audit_log WHERE action = 'EMPLOYEE_TRANSFER'`

2. **Transfer Duration**
   - Target: <2 seconds for <10 employees
   - Target: <5 seconds for <50 employees

3. **Contract Renewal Creation**
   - Verify: renewals = transferred employees with active contracts

4. **Transaction Rollbacks**
   - Monitor: Database transaction rollback rate
   - Alert: If >1% rollback rate

### Logs to Monitor

```sql
-- Recent transfers
SELECT created_at, details->>'sourceBusinessId', details->>'targetBusinessId', 
       details->>'transferredCount'
FROM audit_log
WHERE action = 'EMPLOYEE_TRANSFER'
ORDER BY created_at DESC
LIMIT 10;

-- Failed transfers (check application logs for errors)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11 | Initial API release |

---

## Support

For issues or questions:
- Check `EMPLOYEE_TRANSFER_UAT_GUIDE.md` for testing procedures
- Check `EMPLOYEE_TRANSFER_PHASE4_SUMMARY.md` for implementation details
- Review audit logs for transfer history
