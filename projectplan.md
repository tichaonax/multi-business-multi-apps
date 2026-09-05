# Project Plan Index

All detailed project plans live in `ai-contexts/project-plans/`.
- **In review**: `ai-contexts/project-plans/review/`
- **Completed**: `ai-contexts/project-plans/completed/YYYY-MM/`

---

## Active / In Review

| ID | Title | File | Status |
|----|-------|------|--------|
| MBM-293 | Vehicle Service Parts Picker: Browsable Grid (Add Task + Bill Job) | [view](ai-contexts/project-plans/review/projectplan-MBM-293-vehicle-service-parts-picker-grid-2026-09-05.md) | 🟢 BUILT — typechecked clean, awaiting live verification (no vehicle-service business in DB to test against) |
| MBM-292 | POS Quick-Edit Phase 2 (Grocery/Clothing/Hardware) + Clipboard-Paste Image Upload + Vehicle Service Parts Images | [view](ai-contexts/project-plans/review/projectplan-MBM-292-quickedit-rollout-clipboard-paste-2026-09-04.md) | 🟢 BUILT — typechecked clean, awaiting live browser verification; found a likely latent bug in restaurant's Phase 1 price mode (see Review) |
| MBM-291 | POS Menu-Number Support: badges, number-search, cart/receipt display, always-shown customer credit balance | [view](ai-contexts/project-plans/review/projectplan-MBM-291-pos-menu-number-search-2026-09-04.md) | 🟢 BUILT — all 14 todos done, awaiting live browser verification |
| MBM-290 | POS Quick-Edit Mode: image/price edit buttons directly on the POS screen | [view](ai-contexts/project-plans/review/projectplan-MBM-290-pos-quick-edit-mode-2026-09-04.md) | 🟢 Phase 1 BUILT (Restaurant + Universal POS) — Phase 2 (Grocery/Clothing/Hardware) not started |
| MBM-289 | Promotional Sales (Grocery & Clothing): scheduled discount pricing, pause/resume/end, customer-display badge + rotation boost | [view](ai-contexts/project-plans/review/projectplan-MBM-289-promotional-sales-grocery-clothing-2026-09-04.md) | 🟢 APPROVED — implementing on `feature/specials` |
| MBM-288 | Business Target & Cash-Flow Planning: monthly/weekly/daily targets, POS progress display | [view](ai-contexts/project-plans/review/projectplan-MBM-288-business-target-cash-flow-planning-2026-09-02.md) | 🟢 Phases 0-5 all built and live-tested end-to-end via authenticated API calls against real business data (enable, commitment CRUD, both override-validation rules, history, /today, and the new /expanded view with daily/weekly/monthly progress + comparisons + 14-day chart). Admin entry point in the Edit Business modal; POS widget (now self-opening its own expanded modal on click) wired into all 5 POS pages. Remaining: Phase 6 pilot sign-off, browser-rendering verification, and the non-admin response-shape check for /expanded |
| MBM-287 | Cash Position & Financial Insight: Homepage, Cash Bucket, Reporting | [view](ai-contexts/project-plans/review/projectplan-MBM-287-cash-position-financial-insight-2026-09-01.md) | 🟢 BUILT (complete) — everything shipped, including the set-aside purpose-fragmentation root-cause fix (two inconsistent `notes`-writing code paths corrected) |
| MBM-286 | Combo Pay Receipt Reconciliation: Independent Suppliers, Real-Time Balance, Expense Types, Reporting | [view](ai-contexts/project-plans/review/projectplan-MBM-286-combo-pay-receipt-reconciliation-2026-09-01.md) | 🟢 BUILT (Phase 1) — ComboMarkPaidModal merge (the original bug's actual fix) deliberately deferred to next pass |
| MBM-285 | Electron — Discoverable "Switch / Add Server" on Login Screen | [view](ai-contexts/project-plans/review/projectplan-MBM-285-electron-switch-server-affordance-2026-08-30.md) | 🟡 PLANNED — awaiting go-ahead |
| MBM-284 | Direction-Aware Agent/Server Version Mismatch (older server ≠ older agent) | [view](ai-contexts/project-plans/review/projectplan-MBM-284-agent-version-direction-2026-08-30.md) | 🟢 BUILT — awaiting live verification |
| MBM-281 | Agent/Server Version Compatibility Warning | [view](ai-contexts/project-plans/review/projectplan-MBM-281-agent-version-compatibility-2026-08-27.md) | 🟢 BUILT |
| MBM-280 | Two Bugs Found During MBM-279 Live Testing (round-down disables Complete Order; QZ needs per-business setup) | [view](ai-contexts/project-plans/review/projectplan-MBM-280-rounddown-and-qz-default-2026-08-27.md) | 🟢 BUILT |
| MBM-279 | Workstation Agent — Switch Active Business on Browser Switch | [view](ai-contexts/project-plans/review/projectplan-MBM-279-agent-active-business-switch-2026-08-27.md) | 🟡 Printer auto-follow fix added after live-test bug report — fresh agent build ready, awaiting redeploy to TX Bedroom + re-verify |
| MBM-278 | Surface Printer Connection Mode & Status on Workstation Agents Page | [view](ai-contexts/project-plans/review/projectplan-MBM-278-printer-mode-status-visibility-2026-08-27.md) | 🟢 BUILT |
| MBM-277 | Cross-Business Printer Preference Leak (TX Bedroom / Happy Eater) | [view](ai-contexts/project-plans/review/projectplan-MBM-277-cross-business-printer-preference-leak-2026-08-27.md) | 🟡 Root cause confirmed, fix proposed — awaiting go-ahead |
| MBM-276 | Agent Multi-Server Profile Isolation & Tray/Settings Redesign | [view](ai-contexts/project-plans/review/projectplan-MBM-276-agent-multi-profile-redesign-2026-08-26.md) | 🟡 Phases A–E done, docs updated — live two-server test still outstanding |
| MBM-275 | Workstation-Local Device Support: MG-S8200 Scale + Receipt Printing (unified agent) for Remote App Server | [view](ai-contexts/project-plans/review/projectplan-MBM-275-workstation-local-device-agent-2026-08-25.md) | 🟢 BUILT — Phases 1-5 + tray/activity/printer-UI gaps done; live-verified except Phase 6 real-hardware pilot |
| MBM-274 | R710 Admin-Issued Long-Term WiFi Tokens (issuance, revocation, report) | [view](ai-contexts/project-plans/review/projectplan-MBM-274-r710-admin-long-term-tokens-2026-08-24.md) | 🟢 BUILT — real device cap is 1 year (365 days), not 5 years; docs corrected |
| MBM-273 | Vehicle Service R710 WiFi Menu Config | [view](ai-contexts/project-plans/review/projectplan-MBM-273-vehicle-service-r710-menu-config-2026-08-24.md) | 🟡 PLANNED — awaiting go-ahead |
| MBM-272 | R710 Remote Site Support via Local Agent | [view](ai-contexts/project-plans/review/projectplan-MBM-272-r710-remote-agent-2026-08-19.md) | 🟢 Phase 1+2+3 BUILT (agent, SEA packaging, background jobs, admin UI/pairing) — Phase 4 (real-site deploy) next |
| MBM-271 | Advance/Receipt Accountability: Capture, Search, Reminders, Escalation & Cashier Verification | [view](ai-contexts/project-plans/review/projectplan-MBM-271-combo-pay-receipt-tracking-2026-08-18.md) | 🟢 BUILT & live-verified — docs (Phase 7) still pending |
| MBM-270 | Hardware Inventory Taxonomy Expansion | [view](ai-contexts/project-plans/review/projectplan-MBM-270-hardware-inventory-taxonomy-expansion-2026-08-18.md) | 🟢 All 6 phases complete — awaiting live verification after next server restart |
| MBM-268 | Vehicle Parts Inventory System | [view](ai-contexts/project-plans/review/projectplan-MBM-268-vehicle-parts-inventory-system-2026-08-16.md) | BUILT — verified live |
| MBM-267 | Vehicle Service Rework Jobs (waive labor/parts) | [view](ai-contexts/project-plans/review/projectplan-MBM-267-vehicle-service-rework-jobs-2026-08-16.md) | BUILT — verified live |
| MBM-266 | Vehicle Service: Two-Step Billing → Payment (Cashier Collects Later) | [view](ai-contexts/project-plans/review/projectplan-MBM-266-vehicle-service-two-step-billing-payment-2026-08-16.md) | BUILT — verified live |
| MBM-265 | Vehicle Service Labour Cost Configuration (customer labour charge separated from contractor payout) | [view](ai-contexts/project-plans/review/projectplan-MBM-265-vehicle-service-labour-cost-configuration-2026-08-15.md) | BUILT — verified live |
| MBM-264 | Vehicle Service Job Search, Shared Search Bar, and Cross-Business Customer Reuse | [view](ai-contexts/project-plans/review/projectplan-MBM-264-vehicle-service-job-search-and-shared-customers-2026-08-15.md) | BUILT — verified live |
| MBM-263 | Manual Balance Adjustment for Business Balance & Cash Box (Cash + EcoCash) | [view](ai-contexts/project-plans/review/projectplan-MBM-263-business-and-cashbox-balance-adjustment-2026-08-15.md) | BUILT — verified live |
| MBM-262 | Vehicle Service — Job Card, Parts Requests & Vehicle Release Workflow | [view](ai-contexts/project-plans/review/projectplan-MBM-262-vehicle-service-job-card-parts-workflow-2026-08-14.md) | BUILT — all 5 phases (A–E) complete and verified |
| MBM-261 | Vehicle Repair & Service Business Type (Contractors, Jobs/Tasks, Portal, Billing, Parts) | [view](ai-contexts/project-plans/review/projectplan-MBM-261-vehicle-service-business-type-2026-08-14.md) | BUILT — all 6 phases complete and verified |
| MBM-260 | Sale Salesperson Reassignment (Bulk + Filtered) | [view](ai-contexts/project-plans/review/projectplan-MBM-260-sale-salesperson-reassignment-2026-08-14.md) | BUILT — verified against real data, reverted |
| MBM-259 | Payroll Account Manual Balance Adjustment (Admin Only) | [view](ai-contexts/project-plans/review/projectplan-MBM-259-payroll-account-manual-balance-adjustment-2026-08-13.md) | BUILT |
| MBM-258 | Expense Account Balance Drift + Admin Manual Balance Adjustment | [view](ai-contexts/project-plans/review/projectplan-MBM-258-expense-account-balance-drift-manual-adjustment-2026-08-13.md) | BUILT — awaiting user to apply corrections |
| MBM-257 | R710 IP Mix-up (Mvimvi ↔ HXI) + Device Setup/Test UI Improvements | [view](ai-contexts/project-plans/review/projectplan-MBM-257-r710-ip-mixup-mvimvi-hxi-2026-08-10.md) | IN REVIEW — migration applied locally, prod deploy + UI code review pending |
| MBM-256 | EcoCash → Cash Conversion Could Create/Destroy Money | [view](ai-contexts/project-plans/review/projectplan-MBM-256-ecocash-conversion-amount-mismatch-2026-08-10.md) | ✅ COMPLETE — production confirmed clean |
| MBM-255 | Loan Withdrawal "Pay" Regression + Dashboard Widget Correction | [view](ai-contexts/project-plans/review/projectplan-MBM-255-loan-withdrawal-regression-and-widget-2026-08-10.md) | ✅ COMPLETE — production confirmed clean |
| MBM-254 | "Cash Box Balances" Widget Never Reflects Loan Repayments | [view](ai-contexts/project-plans/review/projectplan-MBM-254-eod-accounts-widget-stale-balance-2026-08-10.md) | ✅ COMPLETE |
| MBM-253 | Dashboard "Available Balance" Badges Mislabeled (Not a Cash Bug) | [view](ai-contexts/project-plans/review/projectplan-MBM-253-dashboard-sales-balance-mislabel-2026-08-10.md) | ✅ COMPLETE |
| MBM-252 | EOD / Cash Allocation Credits Accounts Without Sufficient Real Cash | [view](ai-contexts/project-plans/review/projectplan-MBM-252-eod-cash-allocation-insufficient-funds-2026-08-09.md) | ✅ COMPLETE — TESTED, MIGRATION APPLIED TO DEV |
| MBM-251 | Payroll Export Preview — Wrong Net Pay / Zero PAYE, NSSA, Levy | [view](ai-contexts/project-plans/review/projectplan-MBM-251-payroll-export-preview-tax-fix-2026-08-05.md) | ✅ COMPLETE |
| MBM-250 | Payment Voucher — Amount in Words + Collection Date Field | [view](ai-contexts/project-plans/review/projectplan-MBM-250-voucher-amount-words-date-2026-07-29.md) | ✅ COMPLETE |
| MBM-249 | AYLI Reverse Calibration: System-Directed Item Removal | [view](ai-contexts/project-plans/review/projectplan-MBM-249-ayli-reverse-calibration-2026-06-28.md) | ✅ COMPLETE |
| MBM-248 | Scale-Assisted Min Meat Weight in Combo Modal | [view](ai-contexts/project-plans/review/projectplan-MBM-248-scale-meat-threshold-combo-modal-2026-06-28.md) | ✅ COMPLETE |
| MBM-247 | AYLI Combo Clone + Reset Docs | [view](ai-contexts/project-plans/review/projectplan-MBM-247-ayli-clone-reset-docs-2026-06-28.md) | ✅ COMPLETE |
| MBM-246 | AYLI Pricing Wizard: Goal-First Calibration + No-Scale Item Addition | [view](ai-contexts/project-plans/review/projectplan-MBM-246-ayli-pricing-wizard-2026-06-28.md) | ✅ COMPLETE |
| MBM-245 | ZIMRA Employee Earnings Export + Employee TIN Field | [view](ai-contexts/project-plans/review/projectplan-MBM-ZIMRA-employee-earnings-export.md) | IN REVIEW |
| MBM-244 | Payroll Deductions: Dedicated UI + Description on Payslip | [view](ai-contexts/project-plans/review/projectplan-MBM-244-payroll-deductions-ui-payslip-2026-06-25.md) | IN REVIEW |
| MBM-243 | ZIMRA Tax Override (PAYE, NSSA, AIDS Levy) | [view](ai-contexts/project-plans/review/projectplan-MBM-243-zimra-tax-override-2026-06-22.md) | IN REVIEW |
| MBM-242 | Edit Submitted Payment Request | [view](ai-contexts/project-plans/review/projectplan-MBM-242-edit-payment-request-2026-06-15.md) | ✅ COMPLETE |
| MBM-241 | Cash Rounding: Max Round-Down Discount | [view](ai-contexts/project-plans/review/projectplan-MBM-241-cash-rounding-max-down-discount-2026-06-11.md) | ✅ COMPLETE |
| MBM-239 | Cash Rounding for Cash Payments | [view](ai-contexts/project-plans/review/projectplan-MBM-239-cash-rounding-2026-06-10.md) | IN REVIEW |
| MBM-238 | AYLI Pricing Calibration & Management UI | [view](ai-contexts/project-plans/review/projectplan-MBM-238-ayli-pricing-calibration-2026-06-09.md) | IN REVIEW |
| MBM-237 | Today's Daily Special — Customer Display | [view](ai-contexts/project-plans/review/projectplan-MBM-237-daily-special-customer-display-2026-06-08.md) | IN REVIEW |
| MBM-236 | Restaurant Menu Numbering | [view](ai-contexts/project-plans/review/projectplan-MBM-236-menu-numbering-2026-06-07.md) | IN REVIEW |
| MBM-235 | Scale Integration On/Off Toggle | [view](ai-contexts/project-plans/review/projectplan-MBM-235-scale-integration-toggle-2026-06-07.md) | IN REVIEW |
| MBM-234 | AYLI, Customer Display & POS Settings Permissions | [view](ai-contexts/project-plans/review/projectplan-MBM-234-ayli-display-pos-permissions-2026-06-07.md) | IN REVIEW |
| MBM-233 | Display Advertising Notes + Product Images | [view](ai-contexts/project-plans/review/projectplan-MBM-233-display-advertising-notes-images-2026-06-07.md) | IN REVIEW |
| MBM-232 | Smart Customer Display: Dynamic Product Ads | [view](ai-contexts/project-plans/review/projectplan-MBM-232-smart-customer-display-ads-2026-06-06.md) | IN REVIEW |
| MBM-231 | As-You-Like-It Weight-Based Combo | [view](ai-contexts/project-plans/review/projectplan-MBM-231-ayli-weight-combo-2026-06-06.md) | IN REVIEW |
| MBM-230 | Contractor Project Dropdown Fix + Searchable | [view](ai-contexts/project-plans/review/projectplan-MBM-230-contractor-project-dropdown-fix-2026-06-05.md) | IN REVIEW |
| MBM-229 | Sale Weight Presets + POS Settings Redesign | [view](ai-contexts/project-plans/review/projectplan-MBM-229-sale-weight-presets-pos-settings-redesign-2026-06-04.md) | ✅ COMPLETE |
| MBM-228 | Scale Panel: Pricing Rules Display + Sales Widget Suppression | [view](ai-contexts/project-plans/review/projectplan-MBM-228-scale-panel-pricing-rules-2026-06-04.md) | ✅ COMPLETE |
| MBM-227 | Grocery POS: Weight-Based Selling + Real Scale | [view](ai-contexts/project-plans/review/projectplan-MBM-227-grocery-pos-weight-selling-real-scale-2026-06-04.md) | ✅ COMPLETE |
| MBM-226 | Scale Integration: Star Micronics MG-S8200 | [view](ai-contexts/project-plans/review/projectplan-MBM-226-scale-integration-mg-s8200-2026-05-29.md) | READY TO BUILD |
| MBM-225 | Warehouse: Manifest Qty & Order Reference Totals | [view](ai-contexts/project-plans/review/projectplan-MBM-225-warehouse-manifest-qty-order-refs-2026-05-29.md) | ✅ COMPLETE |
| MBM-224 | Warehouse Order Reference Locking | [view](ai-contexts/project-plans/review/projectplan-MBM-224-warehouse-reference-locking-2026-05-29.md) | AWAITING REVIEW |
| MBM-223 | Warehouse Move Wizard Redesign (Bulk-Stock Model) | [view](ai-contexts/project-plans/review/projectplan-MBM-223-warehouse-move-wizard-redesign-2026-05-26.md) | IN PROGRESS |
| MBM-222 | Warehouse Import: Excel → Staging → Business Inventory | [view](ai-contexts/project-plans/review/projectplan-MBM-222-warehouse-import-2026-05-25.md) | AWAITING APPROVAL |
| MBM-221 | Inventory Cost Price Enforcement & Pricing Calculator | [view](ai-contexts/project-plans/review/projectplan-MBM-221-inventory-cost-price-and-pricing-calculator-2026-05-25.md) | ✅ COMPLETE |
| MBM-220 | Payee Expense Insights Report | [view](ai-contexts/project-plans/review/projectplan-MBM-220-payee-expense-insights-report-2026-05-25.md) | ✅ COMPLETE |
| MBM-219 | Payee Payment History Report | [view](ai-contexts/project-plans/review/projectplan-MBM-219-payee-payment-history-2026-05-23.md) | ✅ COMPLETE |
| MBM-218 | Inventory Decrement Fix — Code Patch + Data Repair Migration | [view](ai-contexts/project-plans/review/projectplan-MBM-218-inventory-decrement-fix-2026-05-22.md) | AWAITING APPROVAL |
| MBM-217 | Fix CamelCase Product Names Migration | [view](ai-contexts/project-plans/review/projectplan-MBM-217-camelcase-product-names-migration-2026-05-19.md) | ✅ COMPLETE |
| MBM-216 | Per-Payment Voucher for Standalone Account Approvals | [view](ai-contexts/project-plans/review/projectplan-MBM-216-standalone-approval-voucher-2026-05-16.md) | In Progress |
| MBM-215 | Copy Product to Another Business | [view](ai-contexts/project-plans/review/projectplan-MBM-215-copy-product-to-business-2026-05-15.md) | AWAITING APPROVAL |
| MBM-214 | Cash Counted Amendment — Tracked, One-Time, Audited | [view](ai-contexts/project-plans/review/projectplan-MBM-214-cash-counted-amendment-2026-05-12.md) | AWAITING APPROVAL |
| MBM-213 | Salesperson Shortfall Report | [view](ai-contexts/project-plans/review/projectplan-MBM-213-salesperson-shortfall-report-2026-05-12.md) | AWAITING APPROVAL |
| MBM-212 | Cash Box Data Integrity: Bug Fixes & Historical Data Migration | [view](ai-contexts/project-plans/review/projectplan-MBM-212-cash-box-data-integrity-2026-05-11.md) | AWAITING APPROVAL |
| MBM-211 | Grouped EOD Report: Fix cashCounted / totalSales / totalOrders | [view](ai-contexts/project-plans/review/projectplan-MBM-211-grouped-eod-report-data-fix-2026-05-11.md) | AWAITING APPROVAL |
| MBM-210 | Repeat Request from History (Payment / Combo / Petty Cash) | [view](ai-contexts/project-plans/review/projectplan-MBM-210-repeat-request-from-history-2026-05-10.md) | AWAITING APPROVAL |
| MBM-209 | Loan Withdrawal Request: Notifications & Admin Queue | [view](ai-contexts/project-plans/review/projectplan-MBM-209-loan-withdrawal-notifications-queue-2026-05-09.md) | AWAITING APPROVAL |
| MBM-207 | Rejection Flow — Reason Capture, Requester Queue & Action Buttons | [view](ai-contexts/project-plans/review/projectplan-MBM-207-rejection-flow-reason-queue-actions-2026-05-09.md) | AWAITING APPROVAL |
| MBM-206 | Rent Account Approval — Cash Bucket Validation Bug Fix | [view](ai-contexts/project-plans/review/projectplan-MBM-206-rent-account-approval-bucket-fix-2026-05-09.md) | AWAITING APPROVAL |
| MBM-205 | Split Payment Fix: Partial Credit + EcoCash / Cash / Card | [view](ai-contexts/project-plans/review/projectplan-MBM-205-split-payment-ecocash-credit-fix-2026-05-06.md) | AWAITING APPROVAL |
| MBM-204 | Customer Credit Payment at POS (All Order Types) | [view](ai-contexts/project-plans/review/projectplan-MBM-204-customer-credit-payment-pos-2026-05-06.md) | AWAITING APPROVAL |
| MBM-203 | Leave Management UI & Sick Day Tracking | [view](ai-contexts/project-plans/completed/2026-05/projectplan-MBM-203-leave-management-ui-2026-05-05.md) | ✅ COMPLETE |
| MBM-202 | Leave Management & Payslip Accuracy | [view](ai-contexts/project-plans/review/projectplan-MBM-202-leave-management-payslip-accuracy-2026-05-05.md) | ✅ COMPLETE |
| MBM-201 | Combo Request: Submit Confirmation + Return for Edits Flow | [view](ai-contexts/project-plans/completed/2026-05/projectplan-MBM-201-combo-submit-confirm-return-flow-2026-05-03.md) | ✅ COMPLETE |
| MBM-199 | Personal View Grant & Restricted Access Enforcement Fix | [view](ai-contexts/project-plans/completed/2026-05/projectplan-MBM-199-personal-view-grant-restricted-access-fix-2026-05-02.md) | ✅ COMPLETE |
| MBM-198 | Auto-Transfer Detail & Modal Improvements | [view](ai-contexts/project-plans/review/projectplan-MBM-198-transfer-detail-modal-improvements-2026-05-07.md) | AWAITING APPROVAL |
| MBM-197 | Combo Payment Requests & Restricted Expense Account Access | [view](ai-contexts/project-plans/completed/2026-05/projectplan-MBM-197-combo-payment-requests-restricted-access-2026-05-02.md) | ✅ COMPLETE |
| MBM-196 | Payment Line Items — Receipt Breakdown in Quick & Edit Payment | [view](ai-contexts/project-plans/review/projectplan-MBM-196-payment-line-items-breakdown-2026-04-30.md) | COMPLETE |
| MBM-195 | Expense Payment Category Display — Sync with Edit & Quick Payment Hierarchy | [view](ai-contexts/project-plans/review/projectplan-MBM-195-category-display-sync-2026-04-30.md) | COMPLETE |
| MBM-194 | Expense Payment Downward Adjustment & Deposit Source Tracking | [view](ai-contexts/project-plans/review/projectplan-MBM-194-expense-payment-adjustment-source-tracking-2026-04-30.md) | AWAITING APPROVAL |
| MBM-193 | Inventory Activity Report (Shrinkage Detection) | [view](ai-contexts/project-plans/review/projectplan-MBM-193-inventory-activity-report-2026-04-28.md) | AWAITING APPROVAL |
| MBM-192 | Payment Cancellation & Manager Override Code System | [view](ai-contexts/project-plans/review/projectplan-MBM-192-payment-cancellation-manager-override-2026-04-25.md) | AWAITING APPROVAL |
| MBM-191 | Salesperson EOD: Standalone Submit + Next-Day Attribution | [view](ai-contexts/project-plans/review/projectplan-MBM-191-salesperson-eod-standalone-submit-2026-04-25.md) | IN REVIEW |
| MBM-190 | Salesperson Inventory Access Control | [view](ai-contexts/project-plans/review/projectplan-MBM-190-salesperson-inventory-access-control-2026-04-23.md) | COMPLETE |
| MBM-189 | Policy Management & Employee Acknowledgment System | [view](ai-contexts/project-plans/review/projectplan-MBM-189-policy-management-2026-04-23.md) | AWAITING APPROVAL |
| MBM-187 | Salesperson EOD Reporting & Discrepancy Tracking | [view](ai-contexts/project-plans/review/projectplan-MBM-187-salesperson-eod-reporting-2026-04-22.md) | AWAITING APPROVAL |
| MBM-186 | Inventory Expiration Tracking & Management | [view](ai-contexts/project-plans/review/projectplan-MBM-186-expiry-tracking-management-2026-04-22.md) | AWAITING APPROVAL |
| MBM-185 | Business Asset Management | [view](ai-contexts/project-plans/review/projectplan-MBM-185-asset-management-2026-04-22.md) | AWAITING APPROVAL |
| MBM-184 | Restaurant Delivery Service | [view](ai-contexts/project-plans/review/projectplan-MBM-184-restaurant-delivery-service-2026-04-21.md) | AWAITING APPROVAL |
| MBM-183 | Restaurant Prepared Item Inventory Tracking | [view](ai-contexts/project-plans/review/projectplan-MBM-183-restaurant-prep-inventory-tracking-2026-04-20.md) | AWAITING APPROVAL |
| MBM-182 | Custom Bulk Modal: Business Dropdown + Expense Classification + Suggest | [view](ai-contexts/project-plans/review/projectplan-MBM-182-custom-bulk-business-dropdown-classification-2026-04-19.md) | COMPLETE |
| MBM-178 | Invoices & Quotations | [view](ai-contexts/project-plans/review/projectplan-MBM-178-invoices-quotations-2026-04-15.md) | AWAITING APPROVAL |
| MBM-177 | Expense Transaction List — Richer Descriptions | [view](ai-contexts/project-plans/review/projectplan-MBM-177-expense-transaction-richer-descriptions-2026-04-13.md) | AWAITING APPROVAL |
| MBM-176 | Reorder Level Threshold & Low Stock Notifications | [view](ai-contexts/project-plans/review/projectplan-MBM-176-reorder-level-notifications-2026-04-13.md) | COMPLETE |
| MBM-175 | Electron SSL Deploy + Inventory Intelligence Reports | [view](ai-contexts/project-plans/review/projectplan-MBM-175-inventory-intelligence-reports-2026-04-11.md) | AWAITING APPROVAL |
| MBM-174 | Expense Account Transfers | [view](ai-contexts/project-plans/review/projectplan-MBM-174-expense-account-transfers-2026-04-10.md) | AWAITING APPROVAL |
| MBM-172 | QZ Tray Local Printer Support | [view](ai-contexts/project-plans/review/projectplan-MBM-172-qz-tray-local-printing-2026-04-06.md) | AWAITING APPROVAL |
| MBM-171 | Cashier-Assisted Payment Requests (Personal Accounts) | [view](ai-contexts/project-plans/review/projectplan-MBM-171-cashier-assisted-payment-requests-2026-04-05.md) | IN PROGRESS |
| MBM-170 | EOD Submissions in Expense Account Queue | [view](ai-contexts/project-plans/review/projectplan-MBM-170-eod-submissions-in-queue-2026-04-04.md) | IN PROGRESS |
| MBM-169 | Business Domain Full Seed + Payment Domain Defaulting | [view](ai-contexts/project-plans/review/projectplan-MBM-169-business-domain-seed-2026-03-29.md) | PENDING REVIEW |
| MBM-168 | Per Diem Approval Modal in Payroll Entry Detail | [view](ai-contexts/project-plans/review/projectplan-MBM-168-perdiem-approval-modal-2026-03-28.md) | AWAITING APPROVAL |
| MBM-167 | Employee Meal Program: EOD Batch Payment | [view](ai-contexts/project-plans/review/projectplan-MBM-167-meal-program-eod-batch-2026-03-28.md) | AWAITING APPROVAL |
| MBM-166 | Predefined Domain / Category / Sub-Category Taxonomy for All Business Types | [view](ai-contexts/project-plans/review/projectplan-MBM-166-predefined-domain-category-taxonomy-2026-03-27.md) | AWAITING APPROVAL |
| MBM-165 | Salesperson Attribution at POS: Shared Terminal, Per-Sale Assignment | [view](ai-contexts/project-plans/review/projectplan-MBM-165-salesperson-attribution-pos-2026-03-25.md) | AWAITING APPROVAL |
| MBM-164 | Stock Take: Sales Conflict Handling & Sync Workflow | [view](ai-contexts/project-plans/review/projectplan-MBM-164-stock-take-sales-conflict-2026-03-24.md) | AWAITING APPROVAL |
| MBM-163 | Bale Transfer: Fixes, Notifications & Report | [view](ai-contexts/project-plans/review/projectplan-MBM-163-bale-transfer-fixes-2026-03-24.md) | READY FOR TESTING |
| MBM-162 | Custom Bulk Product Mode | [view](ai-contexts/project-plans/review/projectplan-MBM-162-custom-bulk-product-mode-2026-03-23.md) | READY FOR TESTING |
| MBM-161 | Stock Take Mode for Bulk Stocking Panel | [view](ai-contexts/project-plans/review/projectplan-MBM-161-stock-take-mode-2026-03-23.md) | AWAITING APPROVAL |
| MBM-160 | Bulk Stock: Multi-Draft Support with Names | [view](ai-contexts/project-plans/review/projectplan-MBM-160-bulk-stock-multi-draft-2026-03-22.md) | AWAITING APPROVAL |
| MBM-159 | EcoCash Refactoring and Enhancements | [view](ai-contexts/project-plans/review/projectplan-MBM-159-ecocash-refactoring-enhancements-2026-03-21.md) | AWAITING APPROVAL |
| MBM-158 | Combined Stock Take & Stock Receive Workflow | [view](ai-contexts/project-plans/review/projectplan-MBM-158-stock-take-receive-combined-workflow-2026-03-21.md) | AWAITING APPROVAL |
| MBM-157 | Admin Test Barcode Generator | [view](ai-contexts/project-plans/review/projectplan-MBM-157-admin-test-barcode-generator-2026-03-21.md) | AWAITING APPROVAL |
| MBM-156 | Bulk Stocking Workflow | [view](ai-contexts/project-plans/review/projectplan-MBM-156-bulk-stocking-workflow-2026-03-20.md) | AWAITING APPROVAL |
| MBM-155 | Add Stock Panel: Department, Category & Supplier Fields | [view](ai-contexts/project-plans/review/projectplan-MBM-155-add-stock-panel-category-supplier-2026-03-20.md) | AWAITING APPROVAL |
| MBM-154 | Clothing Inventory Stocking Streamlining | [view](ai-contexts/project-plans/review/projectplan-MBM-154-clothing-inventory-stocking-2026-03-19.md) | AWAITING APPROVAL |
| MBM-153 | Reverse Expense Payments to Petty Cash | [view](ai-contexts/project-plans/review/projectplan-MBM-153-reverse-payments-to-petty-cash-2026-03-19.md) | AWAITING APPROVAL |
| MBM-152 | Rent Payment Workflow: Auto-Request, Full-Amount & Correct Approval | [view](ai-contexts/project-plans/review/projectplan-MBM-152-rent-payment-workflow-2026-03-18.md) | AWAITING APPROVAL |
| MBM-151 | Bales BOGO Toggle: Audit Trail & Irreversibility | [view](ai-contexts/project-plans/review/projectplan-MBM-151-bales-bogo-audit-trail-irreversible-2026-03-18.md) | AWAITING APPROVAL |
| MBM-150 | EcoCash Payment Support | [view](ai-contexts/project-plans/review/projectplan-MBM-150-ecocash-payment-support-2026-03-15.md) | AWAITING APPROVAL |
| MBM-149 | EOD Zero-Sales Resilience & Cash Allocation Flexibility | [view](ai-contexts/project-plans/review/projectplan-MBM-149-eod-zero-sales-allocation-resilience-2026-03-13.md) | AWAITING APPROVAL |
| MBM-148 | Real-Time Notifications & Payment Queue Updates | [view](ai-contexts/project-plans/review/projectplan-MBM-148-real-time-notifications-payment-queue-2026-03-13.md) | AWAITING APPROVAL |
| MBM-146 | Expense Payment Lifecycle: Paid Status & Cash Box Alignment | [view](ai-contexts/project-plans/review/projectplan-MBM-146-expense-payment-lifecycle-paid-status-2026-03-13.md) | AWAITING APPROVAL |
| MBM-145 | Chicken Run Management System | [view](ai-contexts/project-plans/review/projectplan-MBM-145-chicken-run-management-2026-03-11.md) | READY FOR TESTING |
| MBM-139 | Expense Account Enhancements: Personal Categories, Loans & Transfers | [view](ai-contexts/project-plans/review/projectplan-MBM-139-expense-account-enhancements.md) | DESIGN REVIEW |

---

## Recently Completed

| ID | Title | Status |
|----|-------|--------|
| MBM-138 | Customer Activity Reports & Behavior Insights | ✅ COMPLETED |
| MBM-137 | Customer Loyalty Card Printing & Barcode Scan | ✅ COMPLETED |
| MBM-136 | Petty Cash: Signature Capture at Fund Handover | ✅ COMPLETED |

---

# UI Fix: Show Actual Handed-In Value for Grouped EOD Reports

## Objective
Ensure that the actual cash handed in (groupedRun.totalCashReceived) is displayed for grouped EOD catch-up reports in both the Pending Actions page and the bell dropdown. Daily reports should continue to show totalReported.

## Impact Analysis
- **Backend**: Already returns groupedRun.totalCashReceived for grouped reports. No changes needed.
- **Frontend**:
  - Pending Actions page (src/app/admin/pending-actions/page.tsx): Currently displays totalReported for all reports.
  - Bell dropdown (src/components/layout/global-header.tsx): Also displays totalReported for all reports.
  - Both need conditional logic to display groupedRun.totalCashReceived for grouped reports.
- **Risk**: Minimal, as the change is isolated to display logic and does not affect data flow or backend.

## Plan & Todos
1. Update Pending Actions page to show groupedRun.totalCashReceived for grouped reports.
2. Update bell dropdown to show groupedRun.totalCashReceived for grouped reports.
3. Test both locations to ensure correct values are displayed for both grouped and daily reports.
4. Add a review section summarizing the changes and any follow-up suggestions.

## Review
(To be completed after implementation)

| MBM-165 | Payment Voucher with Collector Capture | review/projectplan-MBM-165-payment-voucher-collector-capture-2026-03-28.md | In Progress |
