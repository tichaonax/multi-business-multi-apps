import { PrismaClient } from '@prisma/client'
import { chunk } from './dev/chunk-helper-unsafe'
// helper to convert names
function snakeToCamel(s: string) {
  return s.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase())
}

/**
 * Strip nested relations from data object to avoid Prisma validation errors during upsert.
 * Relations should be handled separately, not as part of basic create/update operations.
 */
function stripNestedRelations(data: any): any {
  if (!data || typeof data !== 'object') return data

  const cleaned = { ...data }

  // Remove common relation field patterns
  const relationFields = [
    // Direct relations (camelCase)
    'businesses', 'users', 'employees', 'business_memberships', 'business_categories',
    'business_products', 'business_orders', 'business_order_items', 'business_transactions',
    'business_accounts', 'business_brands', 'business_customers', 'business_locations',
    'business_stock_movements', 'business_suppliers', 'customer_laybys', 'customer_layby_payments',
    'inventory_domains', 'inventory_subcategories', 'expense_domains', 'expense_categories',
    'expense_subcategories', 'job_titles', 'compensation_types', 'benefit_types',
    'permission_templates', 'employee_contracts', 'employee_benefits', 'employee_allowances',
    'employee_bonuses', 'employee_deductions', 'employee_deduction_payments', 'employee_leave_balance',
    'employee_leave_requests', 'employee_loans', 'employee_loan_payments', 'employee_salary_increases',
    'employee_time_tracking', 'employee_attendance', 'employee_business_assignments',
    'contract_benefits', 'contract_renewals', 'disciplinary_actions', 'benefit_types',
    'payroll_accounts', 'payroll_exports', 'payroll_periods', 'print_jobs', 'product_variants',
    'product_images', 'product_attributes', 'product_barcodes', 'supplier_products',
    'menu_combos', 'menu_combo_items', 'menu_promotions', 'projects', 'project_contractors',
    'project_stages', 'project_transactions', 'construction_projects', 'construction_expenses',
    'vehicles', 'vehicle_trips', 'vehicle_expenses', 'vehicle_reimbursements', 'vehicle_drivers',
    'driver_authorizations', 'persons', 'inter_business_loans', 'expense_account_deposits',
    'expense_account_payments', 'business_memberships', 'other_businesses', 'employees',
    'business_categories', 'other_business_categories', 'domain', 'parent_location',
    'child_locations', 'business_products', 'business_suppliers', 'business_locations',
    'business_accounts', 'business_transactions', 'business_orders', 'business_order_items',
    'business_customers', 'business_stock_movements', 'customer_laybys', 'customer_layby_payments',
    'inventory_subcategories', 'business_brands', 'product_variants', 'product_images',
    'product_attributes', 'product_barcodes', 'supplier_products', 'menu_combos',
    'menu_combo_items', 'menu_promotions',

    // Reverse relations (plural forms that might be included)
    'business_memberships', 'employees', 'business_categories', 'business_products',
    'business_orders', 'business_order_items', 'business_transactions', 'business_accounts',
    'business_brands', 'business_customers', 'business_locations', 'business_stock_movements',
    'business_suppliers', 'customer_laybys', 'customer_layby_payments', 'inventory_subcategories',
    'product_variants', 'product_images', 'product_attributes', 'product_barcodes',
    'supplier_products', 'menu_combos', 'menu_combo_items', 'menu_promotions'
  ]

  // Remove relation fields
  for (const field of relationFields) {
    if (cleaned[field] !== undefined) {
      delete cleaned[field]
    }
  }

  // Also remove any field that is an array or object (potential relations)
  for (const [key, value] of Object.entries(cleaned)) {
    if (Array.isArray(value) || (value !== null && typeof value === 'object' && !isDateLike(value))) {
      delete cleaned[key]
    }
  }

  return cleaned
}

/**
 * Check if an object looks like a Date (has date-like properties)
 */
function isDateLike(obj: any): boolean {
  return obj && typeof obj === 'object' &&
         (obj.hasOwnProperty('toISOString') || obj.hasOwnProperty('$type') ||
          (typeof obj.$date === 'string') || (typeof obj.$date === 'number'))
}

export function findPrismaModelName(prisma: AnyPrismaClient, name: string) {
  // direct match
  if ((prisma as any)[name]) return name
  // snake_case -> camelCase
  const camel = snakeToCamel(name)
  if ((prisma as any)[camel]) return camel
  // try lowerCase compare and remove underscores
  const ncmp = name.replace(/_/g, '').toLowerCase()
  const ncmpSingular = ncmp.replace(/s$/, '')
  for (const k of Object.keys(prisma)) {
    const kcmp = k.replace(/_/g, '').toLowerCase()
    const kcmpSingular = kcmp.replace(/s$/, '')
    // exact match or equivalent when removing underscores
    if (kcmp === ncmp || kcmpSingular === ncmp || kcmp === ncmpSingular || kcmpSingular === ncmpSingular) return k
  }
  // fallback to original name
  return name
}

// Default batch size for upserts to avoid long-running transactions
const DEFAULT_BATCH_SIZE = Number(process.env.RESTORE_BATCH_SIZE ?? '200')
const DEFAULT_TX_TIMEOUT = Number(process.env.RESTORE_TX_TIMEOUT_MS ?? String(10 * 60 * 1000)) // 10 minutes per transaction

type AnyPrismaClient = PrismaClient & any

/**
 * Upsert items into a prisma model in batches and small transactions to avoid transaction timeouts.
 * modelName must be the exact field name on `PrismaClient` (e.g., 'jobTitles', 'businesses').
 */
export async function upsertModelInBatches(
  prisma: AnyPrismaClient,
  modelName: string,
  items: any[] | undefined,
  batchSize = DEFAULT_BATCH_SIZE,
  timeoutMs = DEFAULT_TX_TIMEOUT
  ,
  onProgress?: (payload: { model: string; index: number; total: number; id?: string | number | null }) => void,
  onError?: (payload: { model: string; id?: string | number | null; error?: string }) => void
): Promise<{ failedRows: any[] }> {
  if (!items || !Array.isArray(items) || items.length === 0) return { failedRows: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedName = findPrismaModelName(prisma, modelName)
  const model = (prisma as any)[resolvedName]
  if (!model) {
    // If we cannot resolve to a delegate on the prisma client, try a relaxed fallback
    // - this function should not crash; instead report failed rows as empty and log an explicit error
    console.warn(`[restore-utils] Prisma model delegate not found for resolvedName=${resolvedName} (original=${modelName})`)
    return { failedRows: [] }
  }

  if (typeof model.upsert !== 'function' && typeof model.create !== 'function') {
    console.warn(`[restore-utils] Prisma delegate for ${resolvedName} does not expose upsert/create methods; skipping restore for this model`) 
    return { failedRows: [] }
  }

  const groups = chunk(items, batchSize)
  const totalForModel = items.length
  let localProcessed = 0
  const failedRows: any[] = []
  for (let i = 0; i < groups.length; i++) {
    const batch = groups[i]
    // Each batch runs in its own short transaction
    try {
      // Collect successfully processed ids in this transaction. We will only report progress *after* transaction succeeds to avoid double-counting (transaction rollback means nothing was committed).
      const processedIdsInTx: (string | number | null)[] = []
      await prisma.$transaction(async (tx: AnyPrismaClient) => {
        if (!tx[resolvedName] || typeof tx[resolvedName].upsert !== 'function') {
          throw new Error(`tx delegate for ${resolvedName} does not expose upsert; aborting transaction`) 
        }
        for (let ri = 0; ri < batch.length; ri++) {
          const row = batch[ri]
          const where = { id: row.id }
          try {
            // Strip nested relations from the data to avoid Prisma validation errors
            const cleanRow = stripNestedRelations(row)

            // If `id` is not present, fall back to create or skip
            if (!row.id) {
              await tx[resolvedName].create({ data: cleanRow })
            } else {
              await tx[resolvedName].upsert({ where, create: cleanRow, update: cleanRow })
            }
            processedIdsInTx.push(row?.id ?? null)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            console.warn(`Failed to upsert (transaction) ${resolvedName} id=${row.id}:`, msg)
            if (onError) {
              try { onError({ model: resolvedName, id: row?.id, error: msg }) } catch (ex) {}
            }
            // Throw to abort this tx so we can fallback to per-row handling
            throw e
          }
        }
        console.log(`[restore-utils] Transaction batch ${i} for model ${resolvedName} completed successfully (processed ${processedIdsInTx.length}/${totalForModel})`)
      }, { timeout: timeoutMs })
      // Report progress for ids processed in this successful transaction
      for (const id of processedIdsInTx) {
        localProcessed++
        if (onProgress) {
          try { onProgress({ model: resolvedName, index: localProcessed, total: totalForModel, id }) } catch (e) {}
        }
      }
    } catch (txErr) {
      console.warn(`[restore-utils] Transaction failed for ${resolvedName} batch ${i} - falling back to per-row upserts`, txErr instanceof Error ? txErr.message : String(txErr))
      // Fallback to per-row non-transactional upserts so we can catch and continue individual errors without aborting a transaction
      for (let ri = 0; ri < batch.length; ri++) {
        const row = batch[ri]
        const where = { id: row.id }
        try {
          // Strip nested relations from the data to avoid Prisma validation errors
          const cleanRow = stripNestedRelations(row)

          if (!row.id) {
            await prisma[resolvedName].create({ data: cleanRow })
          } else {
            await prisma[resolvedName].upsert({ where, create: cleanRow, update: cleanRow })
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.warn(`Failed to upsert ${resolvedName} id=${row.id}:`, msg)
          if (onError) {
            try { onError({ model: resolvedName, id: row?.id, error: msg }) } catch (ex) {}
          }
          failedRows.push({ model: resolvedName, row, error: msg })
        } finally {
          localProcessed++
          if (onProgress) {
            try { onProgress({ model: resolvedName, index: localProcessed, total: totalForModel, id: row?.id }) } catch (e) {}
          }
        }
      }
    }
  }
  return { failedRows }
}

/**
 * Orchestrates restore by upserting models in an order that preserves referential integrity.
 * This is a pragmatic order - adjust as needed per schema relationships.
 */
export async function restoreBackupData(
  prisma: AnyPrismaClient,
  backupData: Record<string, any>,
  options: { batchSize?: number; timeoutMs?: number; onProgress?: (payload: { model: string; index: number; total: number; id?: string | number | null }) => void; onError?: (payload: { model: string; id?: string | number | null; error?: string }) => void } = {}
): Promise<void> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  const timeoutMs = options.timeoutMs ?? DEFAULT_TX_TIMEOUT

  // Define the restore order - start with reference data
  const orderedModels = [
    'jobTitles',
    'compensationTypes',
    'benefitTypes',
    'permission_templates',
    'users',
    'businesses',
    'businessMemberships',
    'employees',
    'employeeContracts',
    'businessProducts',
    'productVariants',
    'productImages',
    'businessOrders',
    'businessOrderItems',
    'businessTransactions',
    'customerLaybys',
    'customerLaybyPayments',
    'inventoryDomains',
    'inventorySubcategories',
    'businessStockMovements',
    'expenseDomains',
    'expenseCategories',
    'expenseSubcategories',
    'businessAccounts',
    // Add additional models from backupData as needed
  ]

  const processedModels = new Set<string>()
  const allFailedRows: any[] = []
  for (const modelName of orderedModels) {
    // try with the expected model name
    if (backupData[modelName]) {
      const resolved = findPrismaModelName(prisma, modelName)
      if (!processedModels.has(resolved)) {
        processedModels.add(resolved)
        console.log(`[restore-utils] restore model=${resolved} (from ${modelName}) items=${(backupData[modelName] || []).length}`)
        const { failedRows } = await upsertModelInBatches(prisma, resolved, backupData[modelName], batchSize, timeoutMs, options.onProgress, options.onError)
        allFailedRows.push(...failedRows)
      }
    }
    // try snake_case table name fallback (e.g., `benefit_types`)
    const snakeName = modelName.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)
    if (backupData[snakeName] && snakeName !== modelName) {
      const resolved = findPrismaModelName(prisma, snakeName)
        if (!processedModels.has(resolved)) {
        processedModels.add(resolved)
        console.log(`[restore-utils] restore model (snake-key)=${resolved} (from ${snakeName}) items=${(backupData[snakeName] || []).length}`)
        const { failedRows } = await upsertModelInBatches(prisma, resolved, backupData[snakeName], batchSize, timeoutMs, options.onProgress, options.onError)
        allFailedRows.push(...failedRows)
      }
    }
  }

  // As a catch-all, upsert any other models present in the backupData (not in orderedModels)
  for (const key of Object.keys(backupData)) {
    if (orderedModels.includes(key)) continue
    if (!Array.isArray(backupData[key])) continue
    const resolved = findPrismaModelName(prisma, key)
    if (processedModels.has(resolved)) {
      console.log(`[restore-utils] skipping already processed resolved model=${resolved} (key=${key})`)
      continue
    }
    processedModels.add(resolved)
    console.log(`[restore-utils] restore model (other-key)=${resolved} (from ${key}) items=${(backupData[key] || []).length}`)
    const { failedRows } = await upsertModelInBatches(prisma, resolved, backupData[key], batchSize, timeoutMs, options.onProgress, options.onError)
    allFailedRows.push(...failedRows)
  }

  // After processing all models, attempt to retry failed rows (possibly due to FK dependencies)
  if (allFailedRows.length > 0) {
    console.log(`[restore-utils] retrying ${allFailedRows.length} failed rows after first pass`)
    const retryFailures: any[] = []
    for (const fr of allFailedRows) {
      try {
        const model = fr.model
        const row = fr.row
        try {
          await prisma[model].upsert({ where: { id: row.id }, create: row, update: row })
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.warn(`[restore-utils] retry failed for model=${model} id=${row.id}: ${msg}`)
          retryFailures.push({ model, row, error: msg })
        }
      } catch (e) {
        console.warn('[restore-utils] retry loop error', e)
      }
    }
    if (retryFailures.length > 0) {
      console.warn(`[restore-utils] final retry failures: ${retryFailures.length}`)
    }
  }
}
