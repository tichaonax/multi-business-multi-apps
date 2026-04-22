// Run: npx ts-node --project tsconfig.server.json scripts/check-backup-coverage.ts
// Compares every table in the database against what backup-clean.ts covers.

const DB_TABLES: string[] = [
  '_prisma_migrations',
  'account_outgoing_loan_payments','account_outgoing_loans','accounts','app_notifications',
  'asset_categories','asset_depreciation_entries','asset_images','asset_maintenance_logs',
  'audit_logs','barcode_inventory_items','barcode_print_jobs','barcode_templates',
  'benefit_types','business_accounts','business_assets','business_brands',
  'business_categories','business_customers','business_loan_expenses','business_loan_managers',
  'business_loan_pre_lock_repayments','business_loans','business_locations','business_memberships',
  'business_order_items','business_orders','business_products','business_rent_configs',
  'business_stock_movements','business_suppliers','business_token_menu_items',
  'business_transactions','business_transfer_ledger','businesses',
  'cash_allocation_line_items','cash_allocation_reports','cash_bucket_entries',
  'chat_messages','chat_participants','chat_rooms',
  'chicken_batches','chicken_bird_weights','chicken_cullings','chicken_feed_logs',
  'chicken_inventory','chicken_inventory_movements','chicken_labor_logs',
  'chicken_medication_logs','chicken_mortalities','chicken_run_settings',
  'chicken_utility_costs','chicken_vaccination_logs','chicken_vaccination_schedules',
  'chicken_weight_logs','clothing_bale_bogo_history','clothing_bale_categories',
  'clothing_bales','clothing_label_print_history','compensation_types',
  'conflict_resolutions','construction_expenses','construction_projects',
  'contract_benefits','contract_renewals','coupon_usages','coupons',
  'custom_bulk_products','customer_display_ads','customer_display_sessions',
  'customer_layby_payments','customer_laybys','customer_rewards','data_snapshots',
  'delivery_account_transactions','delivery_customer_accounts','delivery_order_meta',
  'delivery_runs','device_connection_history','device_registry','disciplinary_actions',
  'driver_authorizations','driver_license_templates','ecocash_conversions','emoji_lookup',
  'employee_absences','employee_allowances','employee_attendance','employee_benefits',
  'employee_bonuses','employee_business_assignments','employee_contracts',
  'employee_deduction_payments','employee_deductions','employee_leave_balance',
  'employee_leave_requests','employee_loan_payments','employee_loans','employee_login_log',
  'employee_salary_increases','employee_time_tracking','employees','eod_payment_batches',
  'esp32_connected_clients',
  'expense_account_auto_deposits','expense_account_deposits','expense_account_grants',
  'expense_account_lenders','expense_account_loans','expense_account_payments',
  'expense_accounts','expense_categories','expense_domains','expense_payment_receipts',
  'expense_payment_vouchers','expense_sub_subcategories','expense_subcategories',
  'expiry_actions','external_clock_in','full_sync_sessions','fund_sources',
  'grouped_eod_run_dates','grouped_eod_runs','id_format_templates','images',
  'inter_business_loans','inventory_domains','inventory_subcategories',
  'inventory_transfer_items','inventory_transfers','invoice_items','invoices',
  'item_expiry_batches','job_titles','loan_transactions','loan_withdrawal_requests',
  'mac_acl_entries','meal_program_eligible_items','meal_program_participants',
  'meal_program_transactions','menu_combo_items','menu_combos',
  'menu_item_inventory_batches','menu_item_inventory_config','menu_items',
  'menu_promotions','network_partitions','network_printers','node_states',
  'offline_queue','order_items','orders','paye_tax_brackets','payment_batch_submissions',
  'payment_notes','payment_reversal_logs','payroll_account_deposits',
  'payroll_account_payments','payroll_accounts','payroll_adjustments','payroll_entries',
  'payroll_entry_benefits','payroll_exports','payroll_payment_vouchers','payroll_periods',
  'payroll_slips','payroll_tax_constants','payroll_zimra_remittances','per_diem_entries',
  'permission_templates','permissions','personal_budgets','personal_deposit_sources',
  'personal_expenses','persons','petty_cash_requests','petty_cash_transactions',
  'portal_integrations','pos_terminal_configs','print_jobs','product_attributes',
  'product_barcodes','product_images','product_price_changes','product_variants',
  'project_contractors','project_stages','project_transactions','project_types',
  'projects','promo_campaigns',
  'r710_business_integrations','r710_business_token_menu_items','r710_connected_clients',
  'r710_device_registry','r710_device_tokens','r710_sync_logs','r710_token_configs',
  'r710_token_sales','r710_tokens','r710_wlans',
  'receipt_sequences','reprint_logs','salesperson_eod_reports','saved_reports',
  'seed_data_templates','sessions','sku_sequences','stage_contractor_assignments',
  'stock_take_draft_items','stock_take_drafts','stock_take_report_employees','stock_take_reports',
  'supplier_payment_request_items','supplier_payment_request_partials',
  'supplier_payment_requests','supplier_products','supplier_ratings',
  'sync_configurations','sync_events','sync_metrics','sync_nodes','sync_sessions',
  'system_settings','token_configurations','user_permissions','users',
  'vehicle_drivers','vehicle_expenses','vehicle_licenses','vehicle_maintenance_records',
  'vehicle_maintenance_service_expenses','vehicle_maintenance_services',
  'vehicle_reimbursements','vehicle_trips','vehicles',
  'wifi_token_devices','wifi_token_sales','wifi_tokens','wifi_usage_analytics',
]

// All camelCase keys written into businessData + deviceData in backup-clean.ts
const BACKED_UP_CAMEL: string[] = [
  'accountOutgoingLoanPayments','accountOutgoingLoans','accounts','appNotifications',
  'assetCategories','assetDepreciationEntries','assetImages','assetMaintenanceLogs',
  'auditLogs','barcodeInventoryItems','barcodePrintJobs','barcodeTemplates',
  'benefitTypes','businessAccounts','businessAssets','businessBrands',
  'businessCategories','businessCustomers','businesses','businessLoanExpenses',
  'businessLoanManagers','businessLoanPreLockRepayments','businessLoans',
  'businessLocations','businessMemberships','businessOrderItems','businessOrders',
  'businessProducts','businessRentConfigs','businessStockMovements','businessSuppliers',
  'businessTokenMenuItems','businessTransactions','businessTransferLedger',
  'cashAllocationLineItems','cashAllocationReports','cashBucketEntries',
  'chatMessages','chatParticipants','chatRooms',
  'chickenBatches','chickenBirdWeights','chickenCulling','chickenFeedLogs',
  'chickenInventory','chickenInventoryMovements','chickenLaborLogs','chickenMedicationLogs',
  'chickenMortality','chickenRunSettings','chickenUtilityCosts','chickenVaccinationLogs',
  'chickenVaccinationSchedules','chickenWeightLogs','clothingBaleBogoHistory',
  'clothingBaleCategories','clothingBales','clothingLabelPrintHistory',
  'compensationTypes','conflictResolutions','constructionExpenses','constructionProjects',
  'contractBenefits','contractRenewals','coupons','couponUsages','customBulkProducts',
  'customerDisplayAds','customerLaybyPayments','customerLaybys','customerRewards',
  'dataSnapshots','deliveryAccountTransactions','deliveryCustomerAccounts',
  'deliveryOrderMeta','deliveryRuns','disciplinaryActions','driverAuthorizations',
  'driverLicenseTemplates','ecocashConversions','emojiLookup','employeeAbsences',
  'employeeAllowances','employeeAttendance','employeeBenefits','employeeBonuses',
  'employeeBusinessAssignments','employeeContracts','employeeDeductionPayments',
  'employeeDeductions','employeeLeaveBalance','employeeLeaveRequests',
  'employeeLoanPayments','employeeLoans','employeeLoginLog','employees',
  'employeeSalaryIncreases','employeeTimeTracking','eodPaymentBatches',
  'expenseAccountAutoDeposits','expenseAccountDeposits','expenseAccountGrants',
  'expenseAccountLenders','expenseAccountLoans','expenseAccountPayments',
  'expenseAccounts','expenseCategories','expenseDomains','expensePaymentReceipts',
  'expensePaymentVouchers','expenseSubcategories','expenseSubSubcategories',
  'expiryActions','externalClockIn','fundSources','groupedEODRunDates','groupedEODRuns',
  'idFormatTemplates','images','interBusinessLoans','inventoryDomains',
  'inventorySubcategories','inventoryTransferItems','inventoryTransfers',
  'invoiceItems','invoices','itemExpiryBatches','jobTitles','loanTransactions',
  'loanWithdrawalRequests','macAclEntry','mealProgramEligibleItems',
  'mealProgramParticipants','mealProgramTransactions','menuComboItems','menuCombos',
  'menuItemInventoryBatches','menuItemInventoryConfigs','menuItems','menuPromotions',
  'networkPrinters','orderItems','orders','payeTaxBrackets','paymentBatchSubmissions',
  'paymentNotes','paymentReversalLogs','payrollAccountDeposits','payrollAccountPayments',
  'payrollAccounts','payrollAdjustments','payrollEntries','payrollEntryBenefits',
  'payrollExports','payrollPaymentVouchers','payrollPeriods','payrollSlips',
  'payrollTaxConstants','payrollZimraRemittances','perDiemEntries','permissions',
  'permissionTemplates','personalBudgets','personalDepositSources','personalExpenses',
  'persons','pettyCashRequests','pettyCashTransactions','portalIntegrations',
  'posTerminalConfigs','printJobs','productAttributes','productBarcodes','productImages',
  'productPriceChanges','productVariants','projectContractors','projects','projectStages',
  'projectTransactions','projectTypes','promoCampaigns','receiptSequences','reprintLog',
  'salespersonEodReports','savedReports','seedDataTemplates','skuSequences',
  'stageContractorAssignments','stockTakeDraftItems','stockTakeDrafts',
  'stockTakeReportEmployees','stockTakeReports','supplierPaymentRequestItems',
  'supplierPaymentRequestPartials','supplierPaymentRequests','supplierProducts',
  'supplierRatings','systemSettings','tokenConfigurations','userPermissions','users',
  'vehicleDrivers','vehicleExpenses','vehicleLicenses','vehicleMaintenanceRecords',
  'vehicleMaintenanceServiceExpenses','vehicleMaintenanceServices','vehicleReimbursements',
  'vehicles','vehicleTrips','wifiTokenDevices','wifiTokens','wifiTokenSales',
  'wiFiUsageAnalytics',
  // R710 WiFi System
  'r710DeviceRegistry','r710BusinessIntegrations','r710Wlans','r710TokenConfigs',
  'r710Tokens','r710TokenSales','r710DeviceTokens','r710BusinessTokenMenuItems','r710SyncLogs',
  // deviceData
  'syncSessions','fullSyncSessions','syncNodes','syncMetrics','nodeStates',
  'syncEvents','syncConfigurations','offlineQueue','deviceRegistry',
  'deviceConnectionHistory','networkPartitions',
]

function toSnake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

// DB table names that don't match the standard camelCase→snake_case of the backup key
// (e.g. Prisma pluralises the @@map differently, or backup uses a different casing)
const MANUAL_MAPPINGS = new Set([
  'chicken_cullings',           // backup key: chickenCulling → chicken_culling
  'chicken_mortalities',        // backup key: chickenMortality → chicken_mortality
  'mac_acl_entries',            // backup key: macAclEntry → mac_acl_entry
  'reprint_logs',               // backup key: reprintLog → reprint_log
  'menu_item_inventory_config', // backup key: menuItemInventoryConfigs → menu_item_inventory_configs
  'wifi_usage_analytics',       // backup key: wiFiUsageAnalytics → wi_fi_usage_analytics
])

// Tables intentionally excluded from backup — ephemeral / runtime state only
const INTENTIONAL_SKIPS = new Set([
  'sessions',                  // NextAuth login sessions — expire naturally, invalid after restore
  'customer_display_sessions', // Active WebSocket connections for customer display screens
  'esp32_connected_clients',   // Real-time connected clients on ESP32 WiFi AP — live network state
  'r710_connected_clients',    // Real-time connected clients on R710 WiFi — live network state
])

const covered = new Set(BACKED_UP_CAMEL.map(toSnake))

const notCovered: string[] = []
const intentionallySkipped: string[] = []

for (const t of DB_TABLES) {
  if (t === '_prisma_migrations') continue
  if (covered.has(t)) continue
  if (MANUAL_MAPPINGS.has(t)) continue
  if (INTENTIONAL_SKIPS.has(t)) { intentionallySkipped.push(t); continue }
  notCovered.push(t)
}

const total = DB_TABLES.length - 1
console.log('═════════════════════════════════════════════════════')
console.log('  BACKUP COVERAGE ANALYSIS')
console.log('═════════════════════════════════════════════════════')
console.log(`Total DB tables (excl _prisma_migrations): ${total}`)
console.log(`Covered by backup:         ${total - notCovered.length - intentionallySkipped.length}`)
console.log(`Intentionally skipped:     ${intentionallySkipped.length}`)
console.log(`UNEXPECTED gaps:           ${notCovered.length}`)
console.log('')
if (notCovered.length === 0) {
  console.log('✅  No unexpected gaps — all tables accounted for.')
} else {
  console.log('❌  UNEXPECTED GAPS (need to add to backup or intentional skips):')
  for (const t of notCovered) console.log(`  ${t}`)
}
console.log('')
console.log('Intentionally skipped (ephemeral/runtime state):')
for (const t of intentionallySkipped) console.log(`  ${t}`)
console.log('')
console.log(`Result: ${notCovered.length === 0 ? 'PASS' : 'FAIL'}`)
process.exit(notCovered.length === 0 ? 0 : 1)
