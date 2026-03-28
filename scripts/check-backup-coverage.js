const fs = require('fs');

const backup = fs.readFileSync('src/lib/backup-clean.ts', 'utf8');
const restore = fs.readFileSync('src/lib/restore-clean.ts', 'utf8');

function snakeToCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }

// All DB tables from actual database (excluding _prisma_migrations)
// Run: SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
const dbTables = [
  'account_outgoing_loan_payments','account_outgoing_loans','accounts','app_notifications','audit_logs',
  'barcode_inventory_items','barcode_print_jobs','barcode_templates','benefit_types',
  'business_accounts','business_brands','business_categories','business_customers',
  'business_loan_expenses','business_loan_managers','business_loan_pre_lock_repayments','business_loans',
  'business_locations','business_memberships','business_order_items','business_orders',
  'business_products','business_rent_configs','business_stock_movements','business_suppliers',
  'business_token_menu_items','business_transactions','business_transfer_ledger','businesses',
  'cash_allocation_line_items','cash_allocation_reports','cash_bucket_entries',
  'chat_messages','chat_participants','chat_rooms',
  'custom_bulk_products',
  'chicken_batches','chicken_bird_weights','chicken_cullings','chicken_feed_logs',
  'chicken_inventory','chicken_inventory_movements','chicken_labor_logs','chicken_medication_logs',
  'chicken_mortalities','chicken_run_settings','chicken_utility_costs','chicken_vaccination_logs',
  'chicken_vaccination_schedules','chicken_weight_logs',
  'clothing_bale_bogo_history','clothing_bale_categories','clothing_bales','clothing_label_print_history',
  'compensation_types','conflict_resolutions',
  'construction_expenses','construction_projects','contract_benefits','contract_renewals',
  'coupon_usages','coupons','customer_display_ads','customer_display_sessions','customer_layby_payments',
  'customer_laybys','customer_rewards','data_snapshots','device_connection_history','device_registry',
  'disciplinary_actions','driver_authorizations','driver_license_templates','emoji_lookup',
  'employee_absences','employee_allowances','employee_attendance','employee_benefits','employee_bonuses',
  'employee_business_assignments','employee_contracts','employee_deduction_payments','employee_deductions',
  'employee_leave_balance','employee_leave_requests','employee_loan_payments','employee_loans',
  'employee_login_log','employee_salary_increases','employee_time_tracking','employees',
  'eod_payment_batches','esp32_connected_clients','expense_account_auto_deposits',
  'expense_account_deposits','expense_account_grants','expense_account_lenders','expense_account_loans',
  'expense_account_payments','expense_accounts','expense_categories','expense_domains','expense_subcategories',
  'external_clock_in','full_sync_sessions','fund_sources',
  'grouped_eod_run_dates','grouped_eod_runs','id_format_templates','images',
  'inter_business_loans','inventory_domains','inventory_subcategories',
  'inventory_transfer_items','inventory_transfers','job_titles','loan_transactions','loan_withdrawal_requests',
  'mac_acl_entries','meal_program_eligible_items','meal_program_participants','meal_program_transactions',
  'menu_combo_items','menu_combos','menu_items','menu_promotions',
  'network_partitions','network_printers','node_states','offline_queue','order_items','orders',
  'payment_batch_submissions','payment_reversal_logs','payroll_account_deposits','payroll_account_payments','payroll_accounts',
  'payroll_adjustments','payroll_entries','payroll_entry_benefits','payroll_exports',
  'payroll_payment_vouchers','payroll_periods','payroll_slips','payroll_zimra_remittances',
  'per_diem_entries','permission_templates','permissions','personal_budgets','personal_deposit_sources',
  'personal_expenses','persons','petty_cash_requests','petty_cash_transactions',
  'portal_integrations','print_jobs','product_attributes','product_barcodes',
  'product_images','product_price_changes','product_variants','project_contractors','project_stages',
  'project_transactions','project_types','projects','promo_campaigns',
  'r710_business_integrations','r710_business_token_menu_items','r710_connected_clients',
  'r710_device_registry','r710_device_tokens','r710_sync_logs','r710_token_configs',
  'r710_token_sales','r710_tokens','r710_wlans','receipt_sequences','reprint_logs',
  'saved_reports','seed_data_templates','sessions','sku_sequences','stage_contractor_assignments',
  'stock_take_drafts','stock_take_draft_items','stock_take_reports','stock_take_report_employees',
  'supplier_payment_request_items','supplier_payment_request_partials','supplier_payment_requests',
  'supplier_products','supplier_ratings','sync_configurations','sync_events','sync_metrics',
  'sync_nodes','sync_sessions','system_settings','token_configurations','user_permissions','users',
  'vehicle_drivers','vehicle_expenses','vehicle_licenses','vehicle_maintenance_records',
  'vehicle_maintenance_service_expenses','vehicle_maintenance_services','vehicle_reimbursements',
  'vehicle_trips','vehicles','wifi_token_devices','wifi_token_sales','wifi_tokens','wifi_usage_analytics',
];

// Tables intentionally excluded (system/transient data)
const intentionallyExcluded = [
  'sessions',                  // OAuth/NextAuth sessions - transient
  '_prisma_migrations',        // Migration history - managed separately
  'audit_logs',                // Optional - backed up only when includeAuditLogs=true
  'r710_connected_clients',    // Ephemeral: real-time R710 WiFi client sessions
  'esp32_connected_clients',   // Ephemeral: real-time ESP32 WiFi client sessions
  'customer_display_sessions', // Ephemeral: active customer display monitor sessions
  'images',                    // Backed up inline (employee profile photos only, filtered by ID)
  'pos_terminal_configs',      // Unused schema stub — no API or UI built yet
];

// Device-specific tables - backed up only when includeDeviceData=true (in deviceData section)
const deviceDataTables = [
  'sync_sessions','full_sync_sessions','sync_nodes','sync_metrics','node_states',
  'sync_events','sync_configurations','offline_queue','device_registry',
  'device_connection_history','network_partitions',
];

// Known naming exceptions: backup/restore use a different camelCase form than
// the naive snake_case → camelCase conversion would produce
const knownVariants = {
  'mac_acl_entries':       ['macAclEntry'],           // Prisma model: MacAclEntry (singular)
  'reprint_logs':          ['reprintLog'],             // Prisma model: ReprintLog (singular)
  'wifi_usage_analytics':  ['wiFiUsageAnalytics'],     // Prisma model: WiFiUsageAnalytics (capital F)
  'r710_sync_logs':        ['r710SyncLog', 'r710SyncLogs'],
  'r710_device_registry':  ['r710DeviceRegistry'],
  'r710_device_tokens':    ['r710DeviceToken', 'r710DeviceTokens'],
  'chicken_cullings':      ['chickenCulling'],         // Prisma model: ChickenCulling (singular)
  'chicken_mortalities':   ['chickenMortality'],       // Prisma model: ChickenMortality (singular)
  'grouped_eod_runs':      ['groupedEODRuns'],         // Prisma key: groupedEODRuns (uppercase EOD)
  'grouped_eod_run_dates': ['groupedEODRunDates'],     // Prisma key: groupedEODRunDates (uppercase EOD)
  'payment_reversal_logs': ['paymentReversalLogs'],    // backup key: paymentReversalLogs (plural)
};

const missing = [];
for (const dbTable of dbTables) {
  if (intentionallyExcluded.includes(dbTable)) continue;
  if (deviceDataTables.includes(dbTable)) continue;

  const camel = snakeToCamel(dbTable);
  // Check standard variants + known exceptions
  const variants = [camel, camel + 's', dbTable, ...(knownVariants[dbTable] || [])];

  const inBackup = variants.some(v => backup.includes(v));
  const inRestore = variants.some(v => restore.includes(v));

  if (!inBackup || !inRestore) {
    missing.push({ table: dbTable, camel, inBackup, inRestore });
  }
}

if (missing.length === 0) {
  console.log('✅ All tables have backup+restore coverage!');
  console.log('\nExclusions:');
  console.log('  Intentionally excluded (ephemeral/system):', intentionallyExcluded.join(', '));
  console.log('  Device-data only (requiresincludeDeviceData=true):', deviceDataTables.join(', '));
} else {
  console.log('⚠️  Tables with coverage gaps (' + missing.length + '):');
  console.log('');
  missing.forEach(m => {
    const status = !m.inBackup && !m.inRestore ? 'MISSING FROM BOTH' :
                   !m.inBackup ? 'NOT BACKED UP' :
                   'NOT IN RESTORE ORDER';
    console.log(` [${status}] ${m.table}`);
    console.log(`   camelCase: ${m.camel}`);
  });
}
