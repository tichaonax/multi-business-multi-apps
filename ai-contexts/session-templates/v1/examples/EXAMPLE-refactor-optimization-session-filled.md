# Refactor & Optimization Session Template

> **Template Type:** Code Refactoring & Performance Optimization
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For improving or simplifying existing code while preserving function and tests.

---

## 📋 Recommended Contexts

- `code-workflow.md`
- `general-problem-solving-context.md`
- Optional: domain-specific contexts

---

## 🔧 Refactoring Scope

<!-- Define what needs to be refactored or optimized -->

**Target Area:**
Dashboard Recent Activity API Endpoint (`/api/dashboard/recent-activity/route.ts`)

**Refactoring Type:**
- [ ] Code Simplification
- [x] Performance Optimization
- [ ] Architecture Improvement
- [x] Technical Debt Reduction
- [ ] Test Coverage Improvement
- [ ] Documentation Enhancement

**Current Issues:**
1. **Slow Response Time**: Endpoint takes 3-5 seconds to load on dashboard with 500+ activities
2. **N+1 Query Problem**: Loops through activities and makes separate DB query for each user/business
3. **Memory Usage**: Loads all activities into memory before filtering (no pagination)
4. **Duplicate Code**: Similar activity fetching logic exists in 3 different endpoints
5. **Complex Query Logic**: 200+ lines of conditional query building that's hard to maintain
6. **No Caching**: Fetches same data repeatedly even when unchanged

**Desired Outcome:**
- Reduce response time from 3-5s to < 500ms (90% improvement)
- Eliminate N+1 queries using Prisma's `include` for eager loading
- Implement cursor-based pagination (50 items per page)
- Extract reusable activity query builder to shared utility
- Add Redis caching with 60-second TTL for dashboard activities
- Simplify query logic to < 100 lines with clear separation of concerns

---

## 📊 Current State Analysis

<!-- Document the current state of the code -->

**Code Location:**
- `src/app/api/dashboard/recent-activity/route.ts` (primary file)
- Related files:
  - `src/app/api/admin/activity-log/route.ts` (duplicate logic)
  - `src/app/api/users/[userId]/activity/route.ts` (duplicate logic)

**Current Metrics:**
- Lines of Code: 287 lines
- Cyclomatic Complexity: ~25 (very high - should be < 10)
- Test Coverage: 0% (no tests exist)
- Performance Baseline:
  - 10 activities: 200ms (acceptable)
  - 100 activities: 1.2s (slow)
  - 500 activities: 3-5s (unacceptable)
  - 1000+ activities: 10s+ timeout risk

**Known Problems:**
1. **N+1 Query Pattern**:
```typescript
// Current problematic code
const activities = await prisma.activity.findMany()
for (const activity of activities) {
  const user = await prisma.user.findUnique({ where: { id: activity.userId } })
  const business = await prisma.business.findUnique({ where: { id: activity.businessId } })
  // 500 activities = 1000+ database queries!
}
```

2. **No Pagination**:
```typescript
// Loads everything into memory
const activities = await prisma.activity.findMany({
  where: filters,
  orderBy: { createdAt: 'desc' }
})
// If 10,000 activities, all loaded at once
```

3. **Repeated Logic**:
Same query building logic duplicated in 3 files with minor variations

4. **Complex Conditional Building**:
```typescript
// 80+ lines of if/else for building where clause
if (scope === 'my') { ... }
else if (scope === 'business') { ... }
else if (scope === 'user') { ... }
// Hard to test, maintain, extend
```

---

## 🎯 Optimization Goals

<!-- Define specific, measurable goals -->

**Performance Targets:**
- **Response time**: < 500ms for 95th percentile (currently 3-5s)
- **Database queries**: Max 3 queries per request (currently 500+)
- **Memory usage**: < 50MB per request (currently 200MB+)
- **Throughput**: Support 100 concurrent users (currently struggles with 10)

**Code Quality Goals:**
- **Cyclomatic complexity**: Reduce from 25 to < 10
- **Lines of code**: Reduce from 287 to < 150 (extract reusable utilities)
- **Test coverage**: Achieve 80% coverage (currently 0%)
- **Maintainability index**: Improve from C (poor) to A (good)

**Maintainability Improvements:**
- Extract query builder to `src/lib/activity-query-builder.ts` utility
- Create reusable `ActivityService` class with methods:
  - `getRecentActivities(filters, pagination)`
  - `getUserActivities(userId, pagination)`
  - `getBusinessActivities(businessId, pagination)`
- Add JSDoc comments explaining query optimization strategies
- Create unit tests for query builder logic
- Document caching strategy in README

---

## ⚠️ Constraints

<!-- List any constraints or requirements to preserve -->

**Must Preserve:**
- All existing filter functionality (scope, userId, businessId)
- Current API response format (don't break frontend)
- Permission checking logic (users see only allowed activities)
- Activity type variations (expenses, orders, projects, etc.)
- Financial summary calculations (totalRevenue, totalExpenses, netAmount)

**Breaking Changes:**
- [ ] Allowed
- [x] Not Allowed

**Backward Compatibility:**
- Must maintain exact same response structure
- Must support all existing query parameters
- Frontend dashboard component should not need any changes
- Existing test cases (if any) must still pass

**Additional Constraints:**
- Cannot add external dependencies (no new npm packages)
- Must use existing Redis cache (already in infrastructure)
- Must use Prisma (no raw SQL unless absolutely necessary)
- Must maintain Next.js 14 App Router patterns

---

## 🧪 Validation Plan

<!-- How to ensure refactoring doesn't break functionality -->

**Existing Tests:**
- ❌ No tests currently exist for this endpoint
- Need to create baseline tests BEFORE refactoring

**New Tests Required:**
1. **Unit Tests** (for extracted utilities):
   - Query builder creates correct Prisma queries
   - Filter logic works for all scope types
   - Pagination cursor encoding/decoding
   - Permission filtering logic

2. **Integration Tests** (for API endpoint):
   - Response format matches expected structure
   - All filter combinations work correctly
   - Pagination returns correct results
   - Permission checks prevent unauthorized access
   - Financial summaries calculate correctly

3. **Performance Tests**:
   - Load test with 1000 activities (target: < 500ms)
   - Concurrent request test (10 simultaneous users)
   - Memory profiling (ensure no memory leaks)
   - Database query count verification (max 3 queries)

**Manual Testing:**
1. Test dashboard with various user roles (admin, manager, employee)
2. Verify financial summaries match current values
3. Test all filter combinations (my, all, user, business)
4. Test on production-like dataset (1000+ activities)
5. Test pagination navigation (next/previous pages)
6. Test cache invalidation (create new activity, verify appears)

**Validation Checklist:**
- [ ] All existing functionality works identically
- [ ] Response times meet performance targets
- [ ] Database query count reduced to < 5
- [ ] No memory leaks under load
- [ ] All permission checks still enforced
- [ ] Financial calculations remain accurate
- [ ] Pagination works correctly
- [ ] Cache invalidation working
- [ ] Tests pass with 80%+ coverage

---

## 📝 Session Notes

<!-- Add any additional context or considerations -->

**Performance Bottlenecks Identified:**
1. **Primary**: N+1 query problem - most significant impact
2. **Secondary**: Loading all activities without pagination
3. **Tertiary**: No caching for frequently accessed data
4. **Minor**: Inefficient JavaScript loops for calculations

**Refactoring Strategy (Prioritized):**
**Phase 1 - Quick Wins** (Est: 2 hours):
- Add Prisma `include` to eliminate N+1 queries
- Add simple pagination (limit/offset)
- Expected improvement: 2-3s → 800ms

**Phase 2 - Structural Improvements** (Est: 4 hours):
- Extract query builder to reusable utility
- Implement cursor-based pagination
- Add Redis caching
- Expected improvement: 800ms → 400ms

**Phase 3 - Testing & Documentation** (Est: 3 hours):
- Write comprehensive tests
- Add performance monitoring
- Document caching strategy

**Total Estimated Time**: ~9 hours

**Alternative Approaches Considered:**
1. **Database Views**: Create materialized view for activities
   - Pros: Very fast queries
   - Cons: Complex to maintain, requires DB migration
   - Decision: Not chosen - too complex for current needs

2. **GraphQL with DataLoader**: Replace REST with GraphQL
   - Pros: Built-in batching/caching
   - Cons: Major architectural change, frontend rewrite needed
   - Decision: Not chosen - too invasive

3. **Background Job + Cache**: Pre-compute activities in background
   - Pros: Ultra-fast responses (always from cache)
   - Cons: Adds complexity, stale data possible
   - Decision: Not chosen - current approach sufficient

4. **Selected Approach**: Incremental optimization (Phases 1-3 above)
   - Pros: Low risk, measurable progress, backward compatible
   - Cons: Takes longer than quick hack
   - Decision: Chosen - best balance of risk/reward

**Risks & Mitigation:**
- **Risk**: Prisma `include` might be slow with deep nesting
  - Mitigation: Test with production data size, add indexes if needed

- **Risk**: Cache invalidation might be tricky
  - Mitigation: Use simple time-based TTL (60s), not event-based

- **Risk**: Breaking existing frontend functionality
  - Mitigation: Maintain exact API contract, write integration tests first

**Related Technical Debt:**
- Similar refactoring needed for `/api/admin/activity-log` endpoint
- Consider creating unified activity service for all modules
- Notification system also has N+1 query issues (separate task)

---

## ✅ Start Session

Ready to begin refactoring. Please:
1. Analyze the current code structure in `/api/dashboard/recent-activity/route.ts`
2. Identify optimization opportunities:
   - N+1 query patterns
   - Missing indexes
   - Inefficient algorithms
   - Memory usage issues
3. Propose refactoring strategy with phases:
   - Phase 1: Critical performance fixes (N+1 queries)
   - Phase 2: Code quality improvements (extract utilities)
   - Phase 3: Testing and documentation
4. Highlight risks and mitigation approaches:
   - Backward compatibility concerns
   - Database migration needs (if any)
   - Cache invalidation strategy
5. Suggest validation methods:
   - Performance benchmarks before/after
   - Test coverage metrics
   - Load testing approach
6. Create task-scoped project plan: `projectplan-activity-refactor-2025-10-18.md`

**Success Criteria:**
- Response time < 500ms for 500 activities
- Database queries < 5 per request
- Code complexity < 10
- Test coverage > 80%
- Zero breaking changes to API

---
