# API Endpoint Development Session Template

> **Template Type:** REST API Endpoint Development
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For creating new REST API endpoints with proper request/response handling, validation, and error handling.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents **IN THE EXACT ORDER LISTED BELOW**.

### Core Contexts (Load in this EXACT order - ONE AT A TIME)

**CRITICAL:** Read these files sequentially. Do not proceed to the next document until you have fully read and understood the previous one.

1. **FIRST:** `ai-contexts/master-context.md` - General principles and conventions
   - ⚠️ Contains critical instruction to read code-workflow.md
   - ⚠️ Defines operating principles
   - ⚠️ Contains mandatory workflow enforcement
   - ⚠️ Defines example adherence requirements

2. **SECOND:** `ai-contexts/code-workflow.md` - Standard workflow and task tracking
   - Contains MANDATORY workflow requirements
   - Requires creating project plan BEFORE any code changes
   - Defines approval checkpoint process

### Backend-Specific Contexts (Load after core contexts)

- `ai-contexts/backend/backend-api-context.md` - API design patterns and conventions

- `ai-contexts/backend/database-context.md` - Database operations and Prisma usage
- `ai-contexts/backend/error-handling-context.md` - Error handling patterns (if exists)

### Optional Contexts

- `ai-contexts/testing/unit-testing-context.md` - For API test coverage
- Domain-specific contexts for business logic

**How to load:** Use the Read tool to load each relevant context document before beginning API development.

---

## 🚀 Endpoint Specification

<!-- Define the API endpoint requirements -->

**Ticket:** <!-- e.g., HPP-1234, or NOTKT if no ticket -->

**Endpoint Path:**

```
[HTTP_METHOD] /api/[path]
```

**Description:**

**Authentication Required:**

- [ ] Yes - Specify roles/permissions:
- [ ] No - Public endpoint

**Rate Limiting:**

- [ ] Yes - Specify limits:
- [ ] No

---

## 📥 Request Specification

**HTTP Method:**

- [ ] GET
- [ ] POST
- [ ] PUT
- [ ] PATCH
- [ ] DELETE

**Query Parameters:**

```typescript
// Example:
// ?page=1&limit=10&sortBy=createdAt
```

**Request Body Schema:**

```typescript
// Example:
interface RequestBody {
  name: string;
  email: string;
  // ...
}
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>
// Add custom headers if needed
```

---

## 📤 Response Specification

**Success Response (2xx):**

```typescript
// Example:
interface SuccessResponse {
  status: 'success';
  data: {
    // ...
  };
  metadata?: {
    total: number;
    page: number;
    // ...
  };
}
```

**Error Responses:**

```typescript
// 400 Bad Request
// 401 Unauthorized
// 403 Forbidden
// 404 Not Found
// 500 Internal Server Error
```

---

## 🗄️ Database Operations

**Models Involved:**

**Operations:**

- [ ] Create
- [ ] Read
- [ ] Update
- [ ] Delete
- [ ] List/Query

**Transactions Required:**

- [ ] Yes - Describe:
- [ ] No

**Performance Considerations:**

- Indexing requirements:
- Query optimization needed:
- Expected load:

---

## ✅ Validation Rules

**Request Validation:**

```typescript
// Example validation rules:
// - email: valid email format, required
// - name: string, min 2 chars, max 100 chars, required
// - age: number, min 0, max 150, optional
```

**Business Logic Validation:**

---

## 🔒 Security Considerations

**Authorization Checks:**

**Data Sanitization:**

**SQL Injection Prevention:**

- [ ] Using Prisma parameterized queries
- [ ] Input validation in place

**XSS Prevention:**

- [ ] Response data sanitized
- [ ] Content-Type headers set correctly

---

## 🧪 Testing Requirements

**Unit Tests:**

- [ ] Request validation
- [ ] Business logic
- [ ] Error handling

**Integration Tests:**

- [ ] Database operations
- [ ] Authentication/Authorization
- [ ] End-to-end flow

**Test Cases:**

1. Success case with valid data
2. Invalid request body
3. Unauthorized access
4. Not found scenarios
5. Edge cases:

---

## 📊 Performance Requirements

**Expected Response Time:**

**Caching Strategy:**

- [ ] No caching needed
- [ ] Cache responses for: **\_** seconds
- [ ] Cache invalidation on: **\_**

**Pagination:**

- [ ] Required
- [ ] Not needed
- Default page size:

---

## 📝 Documentation

**API Documentation (OpenAPI/Swagger):**

- [ ] Add endpoint to API docs
- [ ] Include request/response examples
- [ ] Document error codes

**Code Comments:**

- [ ] Add JSDoc/TSDoc comments
- [ ] Document complex business logic

---

## 🔄 Integration Points

**Related Endpoints:**

**External Services:**

**Event Triggers:**

- [ ] Send notifications
- [ ] Update cache
- [ ] Trigger webhooks
- [ ] Log activity

---

## 📝 Session Notes

<!-- Add any additional context, constraints, or references -->

---

## ✅ Start Session

Ready to begin API endpoint development. Please:

1. Review the endpoint specification
2. Analyze database schema and relationships
3. Propose implementation approach with error handling
4. Suggest validation strategy
5. Identify security considerations
6. Recommend testing approach

---
