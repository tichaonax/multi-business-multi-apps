```markdown
# Requirements: MBM-103 — support add or edit businesses

Last synced: 2025-10-30
Source project plan: `ai-contexts/project-plans/active/projectplan-mbm-103-support-add-edit-businesses-2025-10-30.md`

## Summary

Allow system administrators to create and edit businesses from the Business Management page (`/business/manage`). The UI should be admin-only for create/edit actions. After create/edit, the BusinessSwitcher and business-membership cache must reflect changes immediately (or within a short retry window).

## Success Criteria

- Admins can create new businesses (name, type, optional description) from `/business/manage` and see the new business in BusinessSwitcher; optional auto-switch supported.
- Admins can edit existing business details (name, type, description, isActive) and see updates immediately.
- Non-admins cannot view or call admin APIs (403 responses enforced).
- Tests and QA steps are documented and passing in local/staging environments.

## API Contracts / Endpoints (discovered / required)

1. POST /api/admin/businesses
   - Auth: system-admin only
   - Payload (JSON): { name: string, type: string, description?: string }
   - Success: 201 { success: true, business: { id, name, type, description } }
   - Errors: 400 validation, 403 unauthorized, 500 server error

2. PUT /api/admin/businesses/{id}
   - Auth: system-admin only
   - Payload (JSON): { name?: string, type?: string, description?: string, isActive?: boolean }
   - Success: 200 { success: true, business: { id, name, type, description, isActive } }
   - Errors: 400 validation, 403 unauthorized, 404 not found

3. GET /api/admin/businesses (existing)
   - Used for admin listing (no change required for MBM-103)

4. GET /api/user/business-memberships (existing)
   - Used by `BusinessPermissionsProvider` to refresh membership cache when switchBusiness() or explicit refresh is called

Notes: If endpoints or payload shapes differ on the server, implementation will align with the canonical server-side contract; server authorization remains authoritative.

## Technical Constraints and Decisions

- Reuse `BusinessCreationModal` for the create flow. If it lacks edit-mode props, add `initial`/`mode` props or create a thin `BusinessEditModal` wrapper that adapts to PUT semantics.
- After a successful create/edit, call `switchBusiness(newId)` (admin path) to refresh current business; if not deterministic, add `refreshMemberships()` to `business-permissions-context.tsx` and call it explicitly.
- No Prisma schema changes expected. Watch for recent Prisma include mismatches in logs and adjust selects/includes if tests surface issues.

## Testing Requirements

- Backend integration tests:
  - POST /api/admin/businesses: success path, validation errors, unauthorized access
  - PUT /api/admin/businesses/{id}: success, validation, 404, unauthorized

- Frontend tests:
  - Unit test: `BusinessCreationModal` triggers `onSuccess` with returned business object
  - Component/E2E: from `/business/manage`, admin opens create modal, creates business, BusinessSwitcher lists new business (or `switchBusiness` called)

## Acceptance Tests (manual)

As Admin:
1. Open `/business/manage`.
2. Click Create Business, fill in name + type, submit.
3. Expect toast: "Business created successfully" and BusinessSwitcher lists the new business; optionally auto-switch to it.
4. Click Edit on Business Information card, change name/type, submit — expect updated display and toast.

As Non-admin:
1. Open `/business/manage`.
2. Confirm Create/Edit buttons are not visible.
3. Attempt `POST /api/admin/businesses` with non-admin credentials — expect 403.

## Security & Permissions

- All admin APIs must validate system-admin role server-side. Client-side UI should hide admin actions but not be relied upon for security.
- Use existing auth/session mechanism (next-auth session) for server checks.

## Dependencies

- `BusinessCreationModal` component
- `BusinessPermissionsProvider` (for membership refresh)
- Admin APIs (POST/PUT/GET as above)

## Rollback & Monitoring

- If issues found post-deploy, revert UI changes via git and re-deploy. For data issues, admins can remove created business via admin API if needed.
- Monitor server logs for Prisma/validation errors after initial rollout.

---

This requirements file was created by synchronizing with project plan: `ai-contexts/project-plans/active/projectplan-mbm-103-support-add-edit-businesses-2025-10-30.md`.

If you want adjustments to any requirement (payload shapes, success criteria, or tests), reply `REVISE <details>`.

```