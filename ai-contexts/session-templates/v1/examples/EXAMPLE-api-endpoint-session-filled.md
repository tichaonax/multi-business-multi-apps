# API Endpoint Development Session Template

> **Template Type:** REST API Endpoint Development
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For creating new REST API endpoints with proper request/response handling, validation, and error handling.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents:

### Core Contexts (Always Load)
- `ai-contexts/code-workflow.md` - Standard workflow and task tracking
- `ai-contexts/master-context.md` - General principles and conventions
- `ai-contexts/backend/backend-api-context.md` - API design patterns and conventions

### Backend-Specific Contexts (Always Load)
- `ai-contexts/backend/database-context.md` - Database operations and Prisma usage
- `ai-contexts/backend/error-handling-context.md` - Error handling patterns (if exists)

### Optional Contexts
- `ai-contexts/testing/unit-testing-context.md` - For API test coverage
- Domain-specific contexts for business logic

**How to load:** Use the Read tool to load each relevant context document before beginning API development.

---

## 🚀 Endpoint Specification

<!-- Define the API endpoint requirements -->

**Endpoint Path:**
```
POST /api/payroll/entries
```

**Description:**
Create a new payroll entry for an employee within a specific payroll period. The endpoint should validate that the employee has an active contract during the period and calculate the base salary, benefits, deductions, and net pay.

**Authentication Required:**
- [x] Yes - Specify roles/permissions:
  - User must be authenticated
  - Must have `canManagePayroll` permission
  - Must have access to the business associated with the payroll period
  - System admins can access all payroll entries

**Rate Limiting:**
- [x] Yes - Specify limits:
  - 100 requests per minute per user
  - 1000 requests per hour per business

---

## 📥 Request Specification

**HTTP Method:**
- [ ] GET
- [x] POST
- [ ] PUT
- [ ] PATCH
- [ ] DELETE

**Query Parameters:**
```typescript
// None required
```

**Request Body Schema:**
```typescript
interface CreatePayrollEntryRequest {
  payrollPeriodId: string      // Required - UUID of the payroll period
  employeeId: string            // Required - UUID of the employee
  baseSalary: number            // Required - Base salary amount for this period
  overtimeHours?: number        // Optional - Hours of overtime worked
  overtimeRate?: number         // Optional - Hourly rate for overtime
  benefits?: {                  // Optional - Array of benefits to include
    benefitId: string           // UUID of the benefit type
    amount: number              // Amount for this benefit
  }[]
  deductions?: {                // Optional - Array of deductions to apply
    deductionId: string         // UUID of the deduction type
    amount: number              // Amount for this deduction
  }[]
  notes?: string                // Optional - Additional notes
}
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

---

## 📤 Response Specification

**Success Response (201 Created):**
```typescript
interface PayrollEntrySuccessResponse {
  status: 'success'
  data: {
    id: string
    payrollPeriodId: string
    employeeId: string
    employee: {
      id: string
      name: string
      email: string
    }
    baseSalary: number
    overtimeHours: number
    overtimePay: number
    totalBenefits: number
    totalDeductions: number
    grossPay: number
    netPay: number
    benefits: {
      id: string
      benefitId: string
      benefitName: string
      amount: number
    }[]
    deductions: {
      id: string
      deductionId: string
      deductionName: string
      amount: number
    }[]
    status: 'draft' | 'approved' | 'paid'
    notes: string | null
    createdAt: string
    updatedAt: string
    createdBy: {
      id: string
      name: string
    }
  }
}
```

**Error Responses:**
```typescript
// 400 Bad Request - Invalid input
{
  "error": "Validation failed",
  "details": {
    "baseSalary": "Must be a positive number",
    "employeeId": "Invalid employee ID format"
  }
}

// 401 Unauthorized - Not authenticated
{
  "error": "Unauthorized",
  "message": "Authentication required"
}

// 403 Forbidden - Insufficient permissions
{
  "error": "Forbidden",
  "message": "You do not have permission to manage payroll for this business"
}

// 404 Not Found - Payroll period or employee not found
{
  "error": "Not found",
  "message": "Payroll period not found"
}

// 409 Conflict - Payroll entry already exists
{
  "error": "Conflict",
  "message": "Payroll entry already exists for this employee in this period"
}

// 422 Unprocessable Entity - Business logic validation failed
{
  "error": "Validation failed",
  "message": "Employee has no active contract during this payroll period"
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## 🗄️ Database Operations

**Models Involved:**
- PayrollEntry (main model being created)
- PayrollPeriod (must exist and be in 'draft' or 'open' status)
- Employee (must exist and have active contract)
- EmployeeContract (must be active during the period)
- Business (for permission checking)
- PayrollBenefit (optional - for benefit lookups)
- PayrollDeduction (optional - for deduction lookups)

**Operations:**
- [x] Create - New PayrollEntry record
- [x] Read - Fetch PayrollPeriod, Employee, EmployeeContract
- [ ] Update
- [ ] Delete
- [x] List/Query - Check for existing entry, validate contract

**Transactions Required:**
- [x] Yes - Describe:
  - All operations must be wrapped in a Prisma transaction
  - Create PayrollEntry
  - Create related PayrollEntryBenefit records (if benefits provided)
  - Create related PayrollEntryDeduction records (if deductions provided)
  - Rollback all if any operation fails

**Performance Considerations:**
- Indexing requirements:
  - Index on `payrollPeriodId` + `employeeId` (for uniqueness check)
  - Index on `payrollPeriodId` (for batch queries)
  - Index on `employeeId` (for employee history)
- Query optimization needed:
  - Use `include` to fetch related employee data in single query
  - Batch benefit/deduction lookups if multiple entries
- Expected load:
  - Bulk imports during payroll processing (100+ entries at once)
  - Consider implementing bulk create endpoint for efficiency

---

## ✅ Validation Rules

**Request Validation:**
```typescript
// Validation rules:
// - payrollPeriodId: valid UUID, required
// - employeeId: valid UUID, required
// - baseSalary: number, >= 0, required
// - overtimeHours: number, >= 0, max 160, optional
// - overtimeRate: number, >= 0, optional (required if overtimeHours provided)
// - benefits: array, optional
//   - benefitId: valid UUID, required
//   - amount: number, >= 0, required
// - deductions: array, optional
//   - deductionId: valid UUID, required
//   - amount: number, >= 0, required
// - notes: string, max 1000 chars, optional
```

**Business Logic Validation:**
1. **Payroll Period Exists**: Verify payrollPeriodId exists in database
2. **Period Status**: Payroll period must be in 'draft' or 'open' status (not 'finalized' or 'paid')
3. **Employee Exists**: Verify employeeId exists in database
4. **Active Contract**: Employee must have an active contract during the payroll period date range
5. **No Duplicate Entry**: Check if entry already exists for this employee + period combination
6. **Business Access**: User must have access to the business associated with the payroll period
7. **Permission Check**: User must have `canManagePayroll` permission for the business
8. **Benefit Validation**: If benefits provided, verify each benefitId exists and is active
9. **Deduction Validation**: If deductions provided, verify each deductionId exists and is active
10. **Overtime Logic**: If overtimeHours provided, overtimeRate must also be provided
11. **Salary Consistency**: baseSalary should match the employee's contract salary (warn if mismatch)

---

## 🔒 Security Considerations

**Authorization Checks:**
- Verify user is authenticated via NextAuth session
- Check user has `canManagePayroll` permission for the business
- System admins bypass business-specific checks but still need permission
- Log all payroll entry creations with user ID for audit trail

**Data Sanitization:**
- Trim whitespace from string fields (notes)
- Validate numeric fields are actual numbers (not strings)
- Ensure UUIDs match valid UUID format
- Strip any HTML/script tags from notes field

**SQL Injection Prevention:**
- [x] Using Prisma parameterized queries
- [x] Input validation in place
- No raw SQL queries used

**XSS Prevention:**
- [x] Response data sanitized
- [x] Content-Type headers set correctly
- Notes field should be sanitized if displayed in UI

---

## 🧪 Testing Requirements

**Unit Tests:**
- [x] Request validation - Test all validation rules
- [x] Business logic - Test payroll calculation formulas
- [x] Error handling - Test all error scenarios

**Integration Tests:**
- [x] Database operations - Test transaction rollback on error
- [x] Authentication/Authorization - Test permission checks
- [x] End-to-end flow - Test complete payroll entry creation

**Test Cases:**
1. **Success case with valid data**
   - Create entry with all required fields
   - Verify entry created with correct calculations

2. **Success with benefits and deductions**
   - Create entry with multiple benefits and deductions
   - Verify totals calculated correctly

3. **Success with overtime**
   - Create entry with overtime hours and rate
   - Verify overtime pay calculated and added to gross pay

4. **Invalid request body**
   - Missing required fields → 400 error
   - Invalid UUID format → 400 error
   - Negative salary → 400 error

5. **Unauthorized access**
   - No auth token → 401 error
   - Invalid token → 401 error

6. **Insufficient permissions**
   - User without canManagePayroll → 403 error
   - User from different business → 403 error

7. **Not found scenarios**
   - Non-existent payroll period → 404 error
   - Non-existent employee → 404 error
   - Non-existent benefit/deduction ID → 404 error

8. **Duplicate entry**
   - Entry already exists for employee + period → 409 error

9. **Business logic validation failures**
   - Employee has no active contract → 422 error
   - Payroll period is finalized → 422 error
   - Overtime hours without rate → 422 error

10. **Edge cases:**
    - Zero salary (valid but unusual)
    - Very large salary (test numeric limits)
    - Empty benefits/deductions arrays
    - Maximum length notes field

---

## 📊 Performance Requirements

**Expected Response Time:**
- Target: < 500ms for 95th percentile
- Maximum: < 2 seconds including DB transaction

**Caching Strategy:**
- [ ] No caching needed (data changes frequently)
- [x] Cache benefit/deduction lookups for 5 minutes (read-heavy reference data)
- [x] Cache invalidation on benefit/deduction updates

**Pagination:**
- [ ] Required - This is a POST endpoint (create single entry)
- [x] Not needed
- Note: For bulk operations, consider separate batch endpoint

---

## 📝 Documentation

**API Documentation (OpenAPI/Swagger):**
- [x] Add endpoint to API docs with path, method, auth requirements
- [x] Include request/response examples with realistic data
- [x] Document error codes with descriptions

**Code Comments:**
- [x] Add JSDoc/TSDoc comments for the route handler
- [x] Document complex business logic (payroll calculations)
- [x] Explain permission checking logic

**Example Documentation:**
```typescript
/**
 * POST /api/payroll/entries
 *
 * Creates a new payroll entry for an employee within a payroll period.
 * Calculates gross pay, net pay, and applies benefits/deductions.
 *
 * @requires Authentication - User must be signed in
 * @requires Permission - canManagePayroll for the associated business
 *
 * @body {CreatePayrollEntryRequest} Payroll entry details
 * @returns {201} PayrollEntry created successfully
 * @returns {400} Invalid request body
 * @returns {401} Unauthorized - authentication required
 * @returns {403} Forbidden - insufficient permissions
 * @returns {404} Not found - period or employee doesn't exist
 * @returns {409} Conflict - entry already exists
 * @returns {422} Validation failed - business logic error
 *
 * @example
 * POST /api/payroll/entries
 * {
 *   "payrollPeriodId": "period-123",
 *   "employeeId": "emp-456",
 *   "baseSalary": 5000,
 *   "overtimeHours": 10,
 *   "overtimeRate": 50,
 *   "benefits": [
 *     { "benefitId": "benefit-1", "amount": 200 }
 *   ],
 *   "deductions": [
 *     { "deductionId": "deduction-1", "amount": 100 }
 *   ]
 * }
 */
```

---

## 🔄 Integration Points

**Related Endpoints:**
- GET /api/payroll/entries - List payroll entries (for viewing created entry)
- GET /api/payroll/entries/[id] - Get single entry details
- PUT /api/payroll/entries/[id] - Update payroll entry (if status is 'draft')
- DELETE /api/payroll/entries/[id] - Delete payroll entry (if status is 'draft')
- GET /api/payroll/periods/[id] - View payroll period details
- GET /api/employees/[id]/contracts - View employee contract history

**External Services:**
- None currently (future: tax calculation service integration)

**Event Triggers:**
- [x] Send notifications
  - Notify payroll admin when entry created
  - Notify employee when entry status changes to 'approved' or 'paid'

- [ ] Update cache - No application-level cache

- [ ] Trigger webhooks - Not implemented yet

- [x] Log activity
  - Log to recent activity feed: "Payroll entry created for [Employee Name]"
  - Include user who created it, business, and timestamp

---

## 📝 Session Notes

**Additional Context:**
- This is a critical financial operation - extra care needed for accuracy
- Payroll calculations must match business expectations (tested with accounting team)
- Consider audit logging for compliance (tax regulations, labor laws)
- Future enhancement: Support for recurring benefits/deductions
- Future enhancement: Bulk import from CSV/Excel
- Future enhancement: Tax calculation integration (currently manual)

**Constraints:**
- Must complete within single database transaction
- Cannot modify payroll entries once period is finalized
- Must preserve historical data (no hard deletes)

**Related Work:**
- Similar endpoints exist for expenses, invoices (reference for patterns)
- Payroll module is relatively new, may need refinement based on usage

---

## ✅ Start Session

Ready to begin API endpoint development. Please:
1. Review the endpoint specification and understand business requirements
2. Analyze database schema and relationships (PayrollEntry, Employee, Contract models)
3. Propose implementation approach with error handling strategy
4. Suggest validation strategy for request body and business logic
5. Identify security considerations and permission checks needed
6. Recommend testing approach with comprehensive test cases
7. Implement the endpoint following the specification above

**Key Implementation Steps:**
1. Load required context documents (backend-api-context.md, database-context.md, code-workflow.md)
2. Read existing payroll-related models and endpoints for consistency
3. Create route handler at `src/app/api/payroll/entries/route.ts`
4. Implement authentication and permission checks
5. Validate request body with Zod or similar
6. Implement business logic validation (contract check, period status, etc.)
7. Calculate payroll totals (gross pay, net pay, etc.)
8. Create database records within transaction
9. Log activity to recent activity feed
10. Return properly formatted response
11. Add error handling for all scenarios
12. Write comprehensive tests
13. Update API documentation

---
