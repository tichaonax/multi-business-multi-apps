const fs = require('fs');

const backup = fs.readFileSync('src/lib/backup-clean.ts', 'utf8');
const restore = fs.readFileSync('src/lib/restore-clean.ts', 'utf8');

function snakeToCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }

// All DB tables (excluding _prisma_migrations)
const dbTables = [
  'account_outgoing_loan_payments','account_outgoing_loans','accounts','audit_logs',
  'barcode_inventory_items','barcode_print_jobs','barcode_templates','benefit_types',
  'business_accounts','business_brands','business_categories','business_customers',
  'business_locations','business_memberships','business_order_items','business_orders',
  'business_products','business_stock_movements','business_suppliers','business_token_menu_items',
  'business_transactions','business_transfer_ledger','businesses','chat_messages',
  'chat_participants','chat_rooms','clothing_bale_categories','clothing_bales',
  'compensation_types','conflict_resolutions','construction_expenses','construction_projects',
  'contract_benefits','contract_renewals','coupon_usages','coupons','customer_display_ads',
  'customer_layby_payments','customer_laybys','customer_rewards','data_snapshots',
  'device_connection_history','device_registry','disciplinary_actions','driver_authorizations',
  'driver_license_templates','emoji_lookup','employee_allowances','employee_attendance',
  'employee_benefits','employee_bonuses','employee_business_assignments','employee_contracts',
  'employee_deduction_payments','employee_deductions','employee_leave_balance',
  'employee_leave_requests','employee_loan_payments','employee_loans','employee_salary_increases',
  'employee_time_tracking','employees','expense_account_deposits','expense_account_grants',
  'expense_account_lenders','expense_account_loans','expense_account_payments','expense_accounts',
  'expense_categories','expense_domains','expense_subcategories','full_sync_sessions',
  'fund_sources','id_format_templates','inter_business_loans','inventory_domains',
  'inventory_subcategories','inventory_transfer_items','inventory_transfers','job_titles',
  'loan_transactions','mac_acl_entries','meal_program_eligible_items','meal_program_participants',
  'meal_program_transactions','menu_combo_items','menu_combos','menu_items','menu_promotions',
  'network_partitions','network_printers','node_states','offline_queue','order_items','orders',
  'payroll_account_deposits','payroll_account_payments','payroll_accounts','payroll_adjustments',
  'payroll_entries','payroll_entry_benefits','payroll_exports','payroll_payment_vouchers',
  'payroll_periods','payroll_slips','payroll_zimra_remittances','permission_templates',
  'permissions','personal_budgets','personal_deposit_sources','personal_expenses','persons',
  'portal_integrations','print_jobs','product_attributes','product_barcodes','product_images',
  'product_price_changes','product_variants','project_contractors','project_stages',
  'project_transactions','project_types','projects','promo_campaigns','r710_business_integrations',
  'r710_business_token_menu_items','r710_connected_clients','r710_device_registry',
  'r710_device_tokens','r710_sync_logs','r710_token_configs','r710_token_sales','r710_tokens',
  'r710_wlans','receipt_sequences','reprint_logs','saved_reports','seed_data_templates',
  'sessions','sku_sequences','stage_contractor_assignments','supplier_payment_request_items',
  'supplier_payment_request_partials','supplier_payment_requests','supplier_products',
  'supplier_ratings','sync_configurations','sync_events','sync_metrics','sync_nodes',
  'sync_sessions','system_settings','token_configurations','user_permissions','users',
  'vehicle_drivers','vehicle_expenses','vehicle_licenses','vehicle_maintenance_records',
  'vehicle_maintenance_service_expenses','vehicle_maintenance_services','vehicle_reimbursements',
  'vehicle_trips','vehicles','wifi_token_devices','wifi_token_sales','wifi_tokens','wifi_usage_analytics'
];

// Tables intentionally excluded (system/transient data)
const intentionallyExcluded = [
  'sessions',            // OAuth/NextAuth sessions - transient, no value in backup
  '_prisma_migrations'   // Migration history - managed separately
];

// Device-specific tables - backed up only when includeDeviceData=true (in deviceData section)
const deviceDataTables = [
  'sync_sessions','full_sync_sessions','sync_nodes','sync_metrics','node_states',
  'sync_events','sync_configurations','offline_queue','device_registry',
  'device_connection_history','network_partitions'
];

const missing = [];
for (const dbTable of dbTables) {
  if (intentionallyExcluded.includes(dbTable)) continue;
  if (deviceDataTables.includes(dbTable)) continue;

  const camel = snakeToCamel(dbTable);
  // also check plurals and some known variant names
  const variants = [camel, camel + 's', dbTable];

  const inBackup = variants.some(v => backup.includes(v));
  const inRestore = variants.some(v => restore.includes(v));

  if (!inBackup || !inRestore) {
    missing.push({ table: dbTable, camel, inBackup, inRestore });
  }
}

if (missing.length === 0) {
  console.log('All tables have backup+restore coverage!');
} else {
  console.log('Tables with coverage gaps (' + missing.length + '):');
  console.log('');
  missing.forEach(m => {
    const status = !m.inBackup && !m.inRestore ? 'MISSING FROM BOTH' :
                   !m.inBackup ? 'NOT BACKED UP' :
                   'NOT IN RESTORE ORDER';
    console.log(` [${status}] ${m.table}`);
    console.log(`   camelCase: ${m.camel}`);
  });
}
