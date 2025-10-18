# Feature Development Session Template

> **Template Type:** Feature Development
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For creating new features, screens, or endpoints with structured planning.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents:

### Core Contexts (Always Load)
- `ai-contexts/code-workflow.md` - Standard workflow and task tracking
- `ai-contexts/master-context.md` - General principles and conventions

### Feature-Specific Contexts (Load as needed)
- `ai-contexts/frontend/component-context.md` - For UI component development
- `ai-contexts/frontend/ui-context.md` - For UI consistency and styling
- `ai-contexts/backend/backend-api-context.md` - For API endpoint development
- `ai-contexts/backend/database-context.md` - For database schema changes
- `ai-contexts/testing/unit-testing-context.md` - For test coverage

### Optional Contexts
- Domain-specific contexts based on the module being developed

**How to load:** Use the Read tool to load each relevant context document before beginning work.

---

## 🚀 Session Objective

<!-- Fill in your specific feature requirements before starting -->

**Feature Name:**
Employee Leave Request Management System

**Feature Description:**
Implement a complete leave request system that allows employees to submit leave requests (vacation, sick leave, personal days), managers to approve/reject requests, and admins to view leave balances and generate reports. The system should track different leave types, validate against available balances, prevent conflicts with existing leave, and send notifications.

**Target Module/Component:**
- Backend: `/api/employees/[employeeId]/leave-requests`
- Frontend: `/src/app/employees/[employeeId]/leave/page.tsx`
- Component: `/src/components/employees/leave-request-form.tsx`
- Component: `/src/components/employees/leave-request-list.tsx`

**API Endpoints (if applicable):**
1. `POST /api/employees/[employeeId]/leave-requests` - Submit new leave request
2. `GET /api/employees/[employeeId]/leave-requests` - List employee's leave requests
3. `GET /api/leave-requests/[requestId]` - Get single leave request details
4. `PUT /api/leave-requests/[requestId]/approve` - Approve leave request (manager only)
5. `PUT /api/leave-requests/[requestId]/reject` - Reject leave request (manager only)
6. `DELETE /api/leave-requests/[requestId]` - Cancel leave request (employee only, if pending)
7. `GET /api/employees/[employeeId]/leave-balance` - Get current leave balance

**UI/UX Requirements:**
- **Leave Request Form:**
  - Date range picker (start date, end date)
  - Leave type dropdown (vacation, sick, personal)
  - Text area for notes/reason
  - Show available balance for selected leave type
  - Validation: prevent past dates, prevent exceeding balance
  - Show conflict warnings if dates overlap with existing requests

- **Leave Request List:**
  - Filterable by status (pending, approved, rejected)
  - Sortable by date, status, type
  - Color-coded status badges (yellow=pending, green=approved, red=rejected)
  - Quick actions: Cancel (if pending), View details
  - Manager view: Shows all team members' requests with approve/reject buttons

- **Leave Balance Card:**
  - Display available days for each leave type
  - Show used vs. total days
  - Progress bar visualization
  - Link to request history

**Acceptance Criteria:**
1. ✅ Employee can submit leave request with date range and type
2. ✅ System validates request doesn't exceed available balance
3. ✅ System prevents overlapping leave requests for same employee
4. ✅ Manager receives notification when team member submits request
5. ✅ Manager can approve/reject requests with optional comments
6. ✅ Employee receives notification when request is approved/rejected
7. ✅ Employee can cancel pending requests
8. ✅ Leave balance updates automatically when request is approved
9. ✅ Admin can view all leave requests across all employees
10. ✅ System prevents backdated leave requests (must request at least 1 day in advance)

---

## 📐 Technical Specifications

<!-- Add technical details, architecture notes, or design patterns -->

**Technologies:**
- Frontend: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- Backend: Next.js API Routes, NextAuth for authentication
- Database: Prisma ORM with PostgreSQL
- UI Components: Existing component library (button, card, badge, form inputs)
- Date Handling: date-fns library
- Notifications: In-app notification system (existing)

**Dependencies:**
- `date-fns` - Date manipulation and validation
- `react-hook-form` - Form state management
- `zod` - Request validation
- Existing: `@prisma/client`, `next-auth`, `tailwindcss`

**Data Models:**
```prisma
model LeaveRequest {
  id          String   @id @default(cuid())
  employeeId  String   @map("employee_id")
  employee    Employee @relation(fields: [employeeId], references: [id])

  leaveType   LeaveType @map("leave_type")
  startDate   DateTime  @map("start_date")
  endDate     DateTime  @map("end_date")
  daysCount   Int       @map("days_count")

  status      LeaveStatus @default(PENDING)

  reason      String?

  reviewerId  String?   @map("reviewer_id")
  reviewer    User?     @relation("ReviewedLeaveRequests", fields: [reviewerId], references: [id])
  reviewDate  DateTime? @map("review_date")
  reviewNotes String?   @map("review_notes")

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@map("leave_requests")
  @@index([employeeId, status])
  @@index([startDate, endDate])
}

enum LeaveType {
  VACATION
  SICK
  PERSONAL
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model LeaveBalance {
  id          String   @id @default(cuid())
  employeeId  String   @map("employee_id")
  employee    Employee @relation(fields: [employeeId], references: [id])

  leaveType   LeaveType @map("leave_type")
  totalDays   Int       @map("total_days")
  usedDays    Int       @default(0) @map("used_days")
  year        Int

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@unique([employeeId, leaveType, year])
  @@map("leave_balances")
}
```

**Integration Points:**
1. **Employee Module**: Link from employee detail page to leave management
2. **Notification System**: Send notifications on request submit/approve/reject
3. **Activity Feed**: Log leave request events to recent activity
4. **Permission System**: Check `canManageLeave` permission for managers
5. **Dashboard**: Show pending leave requests count in stats

---

## 🧪 Testing Requirements

<!-- Define test coverage expectations -->

**Unit Tests:**
- Date validation logic (no past dates, no overlaps)
- Leave balance calculation
- Business days calculation (exclude weekends)
- Permission checking logic
- Leave request status transitions

**Integration Tests:**
- API endpoint authentication/authorization
- Database transaction handling (balance updates)
- Notification triggering on status changes
- Conflict detection across multiple requests

**E2E Tests:**
- Employee submits leave request and sees success message
- Manager approves request and employee receives notification
- Employee tries to request more days than available balance (should fail)
- Employee cancels pending request
- Manager rejects request with reason

---

## 📝 Session Notes

<!-- Add any additional notes, constraints, or context here -->

**Business Rules:**
- Employees can only submit requests for future dates (minimum 1 day advance notice)
- Weekend days don't count toward leave balance
- Overlapping requests for same employee are not allowed
- Only pending requests can be cancelled
- Approved requests can only be cancelled by manager or admin
- Leave balance resets annually (future enhancement: pro-rated for mid-year hires)

**Design Decisions:**
- Using enum for leave types (easier to extend in future)
- Separate LeaveBalance table for performance (avoid calculating from all requests)
- Soft delete pattern (keep rejected/cancelled requests for audit trail)
- Manager approval required (no auto-approval based on balance)

**Future Enhancements:**
- Calendar view showing team's leave schedule
- Export leave reports to CSV/PDF
- Email notifications (currently only in-app)
- Recurring leave patterns (e.g., every Friday)
- Public holidays integration

**Known Constraints:**
- Business days calculation is basic (doesn't account for company holidays yet)
- No support for half-day leave (all requests are full days)
- Single approver model (no multi-level approval workflow)

---

## ✅ Start Session

Ready to begin feature development. Please:
1. Review the feature requirements and acceptance criteria
2. Load all required context documents (code-workflow.md, backend-api-context.md, database-context.md, component-context.md)
3. Propose an implementation plan with phases:
   - Phase 1: Database schema (models, migrations)
   - Phase 2: Backend API endpoints with validation
   - Phase 3: Frontend components (form, list, balance card)
   - Phase 4: Integration with notification system
   - Phase 5: Testing
4. Identify technical challenges:
   - Date overlap detection query performance
   - Transaction handling for balance updates
   - Permission checking for managers vs. employees
5. Suggest a testing strategy for each phase
6. Create task-scoped project plan: `projectplan-leave-request-system-2025-10-18.md`

---
