# Project Plan: Enable Create / Edit Business from /business/manage

Created: 2025-10-30
Repository: multi-business-multi-apps

## Objective
Enable system administrators to create and edit businesses (of any supported business type) directly from the Business Management page (`/business/manage`). The feature must reuse existing server APIs and UI components where possible, refresh the client's business membership cache, and preserve proper access control.

## Background / current state
- `src/app/business/manage/page.tsx` renders the Business Management page showing business info and members, but doesn't provide a create/edit action for businesses.
- `src/components/user-management/business-creation-modal.tsx` exists and POSTs to `/api/admin/businesses`. This modal already validates name and type and contains business type options.
- Server APIs exist:
  - `POST /api/admin/businesses` — creates a business (server-side restricts to system admins).
  - `PUT /api/admin/businesses/[id]` — updates a business (admins only).
  - `GET /api/admin/businesses` — admin listing.
  - `GET /api/user/business-memberships` and `/api/user/set-current-business` are consumed by `BusinessPermissionsProvider`.
- `src/contexts/business-permissions-context.tsx` holds cached business memberships and exposes `switchBusiness(businessId)` which (for admins) attempts to set current business on server and refresh memberships in the background.

## Goals & Success Criteria
- Primary: System admins can create a business (name + type + optional description) from `/business/manage` and the new business becomes selectable in the BusinessSwitcher.
- Secondary: System admins can edit existing business details from `/business/manage` (name, type, description, isActive). The change is reflected immediately in UI and memberships.
- Acceptance criteria:
  - Create button appears in `/business/manage` header only for admins.
  - The creation modal reuses `BusinessCreationModal`; after success, a toast is shown and the newly-created business is available in the BusinessSwitcher and optionally auto-switched-to.
  - Edit button appears to admins next to the Business Information card; editing updates server and UI without manual refresh.
  - Non-admins cannot see create/edit UI and receive 403 for admin APIs if attempted.
  - Minimal changes to provider; ideally no breaking changes.

## Assumptions
- Admin check remains server-side; UI will hide actions for non-admins but backend authorization prevents misuse.
- `BusinessCreationModal` is suitable for immediate reuse for create flow. For edit we may extend it or create a small `BusinessEditModal` wrapper.
- `switchBusiness()` will generally be sufficient to refresh memberships for admin after create; if not, we will add a `refreshMemberships()` helper on the provider.

## Out of scope (for this task)
- Implementing fine-grained business creation policies or role-driven templates.
- Changing the Prisma schema or server-side business model beyond what's already present.
- Long-running seeding flows for demo data (the provider already includes seed modal for admins).

## Detailed Tasks and Estimates
Estimates assume a single developer familiar with codebase.

A. Create flow (recommended first batch) — 2.0–3.5 hours
  A1. Add "Create Business" button to `src/app/business/manage/page.tsx` headerActions, shown only to admins. (0.25h)
  A2. Import and render `BusinessCreationModal` on the page; manage local `isOpen` state. (0.25h)
  A3. Wire `onSuccess` callback to:
    - show a toast (use `useToastContext()`),
    - call `switchBusiness(createdBusiness.id)` (admin path) and/or attempt a `/api/user/business-memberships` refresh,
    - close modal and update local UI. (0.5–1.0h)
  A4. Add simple UX polish: focus management, success toast message, error handling (modal already has onError). (0.25–0.5h)
  A5. Manual test as admin and non-admin; iterate fixes. (0.5h)

B. Edit flow (second batch) — 2.0–3.5 hours
  B1. Decide approach: extend `BusinessCreationModal` to accept `initial` & `method` OR create `BusinessEditModal` wrapper. (0.25h)
  B2. Implement modal pre-populated with `currentBusiness` data and use PUT `/api/admin/businesses/[id]`. (1.0–1.5h)
  B3. Add an "Edit" button inside the Business Information card (visible to admins) to open edit modal. (0.25h)
  B4. On success: call provider `switchBusiness(updatedBusiness.id)` or refresh memberships and show a success toast. (0.25–0.5h)
  B5. Manual test and edge-case testing (deactivate -> isActive toggles, type changes). (0.5–1.0h)

C. Provider robustness & housekeeping (optional but recommended) — 0.5–1.0 hour
  C1. If switching doesn't reliably refresh memberships for the admin-created business, add a `refreshMemberships()` function exported by `BusinessPermissionsProvider` and call it after create/update. (0.5–1.0h)
  C2. Unit or integration test hooks if you want CI coverage (optional). (1–2h, optional)

D. Polishing, docs & QA — 0.5–1.0 hour
  D1. Add a short README or developer notes into `src/app/business/` explaining how the flow works and how to test it. (0.25–0.5h)
  D2. Accessibility checks (keyboard, screen reader labels). (0.25–0.5h)

Total estimated time: 4–8 hours (depending on whether you reuse the creation modal or build a separate edit modal and whether provider refreshes reliably).

## Implementation approach (step-by-step recommended)
1. Implement Create button + wire `BusinessCreationModal` on `/business/manage` (Ship A). This is low-risk, reuses existing component and server API.
2. Implement Edit flow (extend or copy the modal) and wire to PUT endpoint (ship B).
3. If required, add `refreshMemberships()` to provider to make refresh deterministic. (C)
4. Add docs and tests as needed. (D)

## Files to change / add
- Edit: `src/app/business/manage/page.tsx` — add buttons, open modal, handle success.
- Reuse: `src/components/user-management/business-creation-modal.tsx` — reuse for create.
- Add or extend: `src/components/user-management/business-edit-modal.tsx` (or extend creation modal) — optional.
- Optional provider change: `src/contexts/business-permissions-context.tsx` — add `refreshMemberships()` API.
- Docs: `src/app/business/README.md` or add to this repository's docs.

## Acceptance tests (manual)
- As Admin:
  1. Open `/business/manage`.
  2. Click Create Business, fill in name + type, submit.
  3. Expect toast: "Business created successfully" and the BusinessSwitcher lists the new business; optionally the app auto-switches to it.
  4. Click Edit on the Business Information card, change name/type, submit — expect updated display and toast.
- As Non-admin:
  1. Open `/business/manage`.
  2. Confirm Create/Edit buttons are not visible.
  3. Attempt `POST /api/admin/businesses` — expect 403.

## Risks & Mitigations
- Race between server creating business and provider refreshing memberships.
  - Mitigation: call `switchBusiness(createdId)` for admins (provider supports admin path); if not reliable, add explicit `refreshMemberships()` in provider.
- Inconsistent relation naming or schema mismatches (we recently fixed some Prisma include issues).
  - Mitigation: test create/edit flows with sample admin account and check server logs for Prisma errors.
- Excessive scope creep (adding business templates, custom permissions): keep minimal for now.

## Rollout & Monitoring
- Deploy to staging first. Test admin create/edit flows.
- Watch server logs for errors; run `npm run -s type-check` locally to ensure no TypeScript regressions.

## Next steps (pick one to start)
- Option A (recommended): I implement the Create button + modal wiring in `src/app/business/manage/page.tsx` and run type-check and quick tests.
- Option B: I implement Create + Edit in one go.
- Option C: you review the plan and tell me which item to start with.

---

If you approve this project plan, tell me whether to start with Option A (create modal wiring). I will then implement the changes, run the type-check, and report results and the updated todo progress.