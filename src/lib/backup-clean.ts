/**
 * Clean Backup Implementation v3.0
 * Creates deterministic, flat backups without nested relations
 * Suitable for cross-machine restore with predictable results
 *
 * Supports:
 * - Full backups (all businesses)
 * - Business-specific backups (with all dependencies)
 * - Full-device backups (includes device-specific sync state)
 * - Compression
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import os from 'os'

export interface BackupMetadata {
  // Version
  version: string // "3.0"

  // Source device identification
  sourceNodeId: string
  sourceDeviceId?: string
  sourceDeviceName?: string
  sourceHostname?: string
  sourcePlatform?: string

  // Backup creation metadata
  timestamp: string
  createdBy?: string

  // Backup type and scope
  backupType: 'full' | 'business-specific' | 'full-device'

  // Business filtering
  businessFilter?: {
    businessId?: string
    includeDemoData: boolean
  }

  // List of actual business IDs captured in this backup (used for scoped validation)
  backedUpBusinessIds?: string[]

  // Statistics
  stats: {
    totalRecords: number
    totalTables: number
    businessRecords: number
    deviceRecords: number
    uncompressedSize: number
  }

  // Schema version
  schemaVersion: string

  // Checksums for integrity
  checksums: {
    businessData: string
    deviceData?: string
  }

  // Legacy fields (for compatibility)
  includeAuditLogs: boolean
  includeBusinessData: boolean
  note: string
}

export interface BackupData {
  metadata: BackupMetadata
  businessData: {
    [key: string]: any
  }
  deviceData?: {
    [key: string]: any
  }
}

/**
 * Helper: Get current node ID
 */
async function getCurrentNodeId(prisma: PrismaClient): Promise<string> {
  const node = await prisma.syncNodes.findFirst({
    where: { isActive: true },
    orderBy: { lastSeen: 'desc' }
  })

  if (node) {
    return node.id
  }

  // No node exists - generate temporary ID
  const hostname = os.hostname()
  const platform = os.platform()
  const random = crypto.randomBytes(8).toString('hex')
  return `node-${platform}-${hostname}-${random}`
}

/**
 * Helper: Generate checksum for data
 */
function generateChecksum(data: any): string {
  const jsonString = JSON.stringify(data)
  return crypto.createHash('sha256').update(jsonString).digest('hex')
}

/**
 * Helper: Count records in data object
 */
function countRecords(data: any): number {
  let count = 0
  for (const key in data) {
    if (Array.isArray(data[key])) {
      count += data[key].length
    }
  }
  return count
}

/**
 * Helper: Count tables in data object
 */
function countTables(data: any): number {
  let count = 0
  for (const key in data) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      count++
    }
  }
  return count
}

/**
 * Create a clean backup without nested relations
 * All data is stored flat - relations are handled through foreign keys
 */
export async function createCleanBackup(
  prisma: PrismaClient,
  options: {
    backupType?: 'full' | 'business-specific' | 'full-device'
    includeAuditLogs?: boolean
    includeDemoData?: boolean
    includeBusinessData?: boolean
    includeDeviceData?: boolean
    businessId?: string
    auditLogLimit?: number
    createdBy?: string
  } = {}
): Promise<BackupData> {
  const {
    backupType = 'full',
    includeAuditLogs = false,
    includeDemoData = false,
    includeBusinessData = true,
    includeDeviceData = false,
    businessId,
    auditLogLimit = 1000,
    createdBy
  } = options

  const timestamp = new Date().toISOString()
  const currentNodeId = await getCurrentNodeId(prisma)

  // Initialize business data container
  const businessData: any = {}

  // Build business filter
  let businessFilter: any

  if (businessId) {
    // Business-specific backup: include only this business (ignore demo filter)
    businessFilter = { id: businessId }
  } else {
    // Full backup: filter demo data if needed
    businessFilter = includeDemoData ? {} : { isDemo: false }
  }

  // 0. System settings (global)
  businessData.systemSettings = await prisma.systemSettings.findMany()

  // 1. Core business and user data (NO INCLUDES)
  businessData.businesses = await prisma.businesses.findMany({
    where: businessFilter
  })

  const businessIds = businessData.businesses.map((b: any) => b.id)

  // For business-specific backups, also get related users
  // (users who are members of this business)
  let userIds: string[] = []

  if (businessId) {
    // Get all users who are members of this specific business
    const memberships = await prisma.businessMemberships.findMany({
      where: { businessId: { in: businessIds } },
      select: { userId: true }
    })
    userIds = [...new Set(memberships.map(m => m.userId))]
  }
  const businessTypes = [...new Set(businessData.businesses.map((b: any) => b.type))]

  // 2. Users
  if (businessId) {
    // Business-specific: only users who are members of this business
    businessData.users = await prisma.users.findMany({
      where: { id: { in: userIds } }
    })
  } else {
    // Full backup: include ALL users (they are system/seed data)
    businessData.users = await prisma.users.findMany()
  }

  // 3. Accounts
  if (businessId) {
    // Business-specific: only accounts for users in this business
    businessData.accounts = await prisma.accounts.findMany({
      where: { userId: { in: userIds } }
    })
  } else {
    // Full backup: include all accounts
    businessData.accounts = await prisma.accounts.findMany()
  }

  // 4. Business memberships
  businessData.businessMemberships = await prisma.businessMemberships.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  // 5. Employees and HR data
  businessData.employees = await prisma.employees.findMany({
    where: {
      primaryBusinessId: { in: businessIds }
    }
  })

  businessData.employeeContracts = await prisma.employeeContracts.findMany({
    where: {
      primaryBusinessId: { in: businessIds }
    }
  })

  businessData.employeeBusinessAssignments = await prisma.employeeBusinessAssignments.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  businessData.employeeBenefits = await prisma.employeeBenefits.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeAllowances = await prisma.employeeAllowances.findMany({
    where: {
      employees_employee_allowances_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeBonuses = await prisma.employeeBonuses.findMany({
    where: {
      employees_employee_bonuses_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeDeductions = await prisma.employeeDeductions.findMany({
    where: {
      employees_employee_deductions_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeLoans = await prisma.employeeLoans.findMany({
    where: {
      employees_employee_loans_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeSalaryIncreases = await prisma.employeeSalaryIncreases.findMany({
    where: {
      employees_employee_salary_increases_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeLeaveRequests = await prisma.employeeLeaveRequests.findMany({
    where: {
      employees_employee_leave_requests_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeLeaveBalance = await prisma.employeeLeaveBalance.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeAttendance = await prisma.employeeAttendance.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeTimeTracking = await prisma.employeeTimeTracking.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.disciplinaryActions = await prisma.disciplinaryActions.findMany({
    where: {
      employees_disciplinary_actions_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.employeeDeductionPayments = await prisma.employeeDeductionPayments.findMany({
    where: {
      employee_deductions: {
        employees_employee_deductions_employeeIdToemployees: {
          primaryBusinessId: { in: businessIds }
        }
      }
    }
  })

  businessData.employeeLoanPayments = await prisma.employeeLoanPayments.findMany({
    where: {
      employee_loans: {
        employees_employee_loans_employeeIdToemployees: {
          primaryBusinessId: { in: businessIds }
        }
      }
    }
  })

  businessData.contractBenefits = await prisma.contractBenefits.findMany({
    where: {
      employee_contracts: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  businessData.contractRenewals = await prisma.contractRenewals.findMany({
    where: {
      employee_contracts_contract_renewals_originalContractIdToemployee_contracts: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  // 6. Business data (if included)
  if (includeBusinessData) {
    businessData.businessProducts = await prisma.businessProducts.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.productVariants = await prisma.productVariants.findMany({
      where: {
        business_products: {
          businessId: { in: businessIds }
        }
      }
    })

    businessData.productImages = await prisma.productImages.findMany({
      where: {
        business_products: {
          businessId: { in: businessIds }
        }
      }
    })

    businessData.productAttributes = await prisma.productAttributes.findMany({
      where: {
        business_products: {
          businessId: { in: businessIds }
        }
      }
    })

    // Include ALL product barcodes (they're seed/system data, no isDemo flag)
    businessData.productBarcodes = await prisma.productBarcodes.findMany()

    businessData.businessStockMovements = await prisma.businessStockMovements.findMany({
      where: { businessId: { in: businessIds } }
    })

    // Business categories - include business-specific ones AND all system-wide defaults
    businessData.businessCategories = await prisma.businessCategories.findMany({
      where: {
        OR: [
          { businessId: { in: businessIds } }, // Business-specific categories
          { businessId: null } // All system-wide/default categories (regardless of businessType)
        ]
      }
    })

    // Business suppliers - include business-specific ones AND all system-wide defaults
    businessData.businessSuppliers = await prisma.businessSuppliers.findMany({
      where: {
        OR: [
          { businessId: { in: businessIds } }, // Business-specific suppliers
          { businessId: null } // All system-wide/default suppliers (regardless of businessType)
        ]
      }
    })

    businessData.businessCustomers = await prisma.businessCustomers.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.businessBrands = await prisma.businessBrands.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.businessLocations = await prisma.businessLocations.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.businessAccounts = await prisma.businessAccounts.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.businessOrders = await prisma.businessOrders.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.businessOrderItems = await prisma.businessOrderItems.findMany({
      where: {
        business_orders: {
          businessId: { in: businessIds }
        }
      }
    })

    businessData.businessTransactions = await prisma.businessTransactions.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.customerLaybys = await prisma.customerLayby.findMany({
      where: {
        customer: {
          businessId: { in: businessIds }
        }
      }
    })

    businessData.customerLaybyPayments = await prisma.customerLaybyPayment.findMany({
      where: {
        layby: {
          customer: {
            businessId: { in: businessIds }
          }
        }
      }
    })

    // 30. Promo Campaigns and Customer Rewards
    businessData.promoCampaigns = await prisma.promoCampaigns.findMany({
      where: { businessId: { in: businessIds } }
    })

    businessData.customerRewards = await prisma.customerRewards.findMany({
      where: { businessId: { in: businessIds } }
    })
  }

  // 7. Inventory system
  businessData.inventoryDomains = await prisma.inventoryDomains.findMany()

  businessData.inventorySubcategories = await prisma.inventorySubcategories.findMany()

  // 8. Expense management
  businessData.expenseDomains = await prisma.expenseDomains.findMany()

  businessData.expenseCategories = await prisma.expenseCategories.findMany()

  businessData.expenseSubcategories = await prisma.expenseSubcategories.findMany()

  // Get user IDs for expense account filtering (need this before querying expense accounts)
  // For full backups: all users. For business-specific: only member users
  userIds = businessData.users.map((u: any) => u.id)

  // 8. Expense accounts and transactions
  // For FULL backups: Include ALL expense accounts (generic, system, and business-specific)
  // These don't have isDemo flag, so back up everything
  businessData.expenseAccounts = await prisma.expenseAccounts.findMany()

  // Grants (access control per expense account)
  businessData.expenseAccountGrants = await prisma.expenseAccountGrants.findMany()

  // Personal deposit sources (reference table for personal expense accounts)
  businessData.personalDepositSources = await prisma.personalDepositSources.findMany()

  // Lenders and loans
  businessData.expenseAccountLenders = await prisma.expenseAccountLenders.findMany()
  businessData.expenseAccountLoans = await prisma.expenseAccountLoans.findMany()

  // Include ALL deposits (including generic ones with sourceBusinessId=null)
  businessData.expenseAccountDeposits = await prisma.expenseAccountDeposits.findMany()

  // Business transfer ledger (cross-business transfers, must come before payments)
  businessData.businessTransferLedger = await prisma.businessTransferLedger.findMany()

  // Include ALL payments (including generic ones with payeeBusinessId=null)
  businessData.expenseAccountPayments = await prisma.expenseAccountPayments.findMany()

  // 9. Payroll system
  businessData.payrollPeriods = await prisma.payrollPeriods.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  businessData.payrollEntries = await prisma.payrollEntries.findMany({
    where: {
      payroll_periods: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.payrollEntryBenefits = await prisma.payrollEntryBenefits.findMany({
    where: {
      payroll_entries: {
        payroll_periods: {
          businessId: { in: businessIds }
        }
      }
    }
  })

  businessData.payrollExports = await prisma.payrollExports.findMany({
    where: {
      payroll_periods: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.payrollAdjustments = await prisma.payrollAdjustments.findMany({
    where: {
      payroll_entries: {
        payroll_periods: {
          businessId: { in: businessIds }
        }
      }
    }
  })

  businessData.payrollAccounts = await prisma.payrollAccounts.findMany({
    where: {
      OR: [
        { businessId: { in: businessIds } },  // Business-specific accounts
        { businessId: null }                  // Global/system accounts
      ]
    }
  })

  // 10. Personal finance
  // Note: userIds already defined earlier for expense accounts

  businessData.personalBudgets = await prisma.personalBudgets.findMany({
    where: {
      userId: { in: userIds }
    }
  })

  businessData.personalExpenses = await prisma.personalExpenses.findMany({
    where: {
      userId: { in: userIds }
    }
  })

  businessData.fundSources = await prisma.fundSources.findMany({
    where: {
      userId: { in: userIds }
    }
  })

  // 11. Projects and construction
  businessData.projects = await prisma.projects.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  businessData.projectStages = await prisma.projectStages.findMany({
    where: {
      projects: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.projectContractors = await prisma.projectContractors.findMany({
    where: {
      projects: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.projectTransactions = await prisma.projectTransactions.findMany({
    where: {
      projects: {
        businessId: { in: businessIds }
      }
    }
  })

  // Construction projects don't have businessId - include all
  businessData.constructionProjects = await prisma.constructionProjects.findMany()

  businessData.constructionExpenses = await prisma.constructionExpenses.findMany()

  businessData.stageContractorAssignments = await prisma.stageContractorAssignments.findMany()

  // 12. Vehicle fleet management
  // Include vehicles with null businessId (shared/unassigned vehicles) alongside business-specific ones
  businessData.vehicles = await prisma.vehicles.findMany({
    where: {
      OR: [
        { businessId: { in: businessIds } },
        { businessId: null }
      ]
    }
  })

  // VehicleDrivers don't have direct business relation - include all
  businessData.vehicleDrivers = await prisma.vehicleDrivers.findMany()

  // Include ALL vehicle expenses (including generic ones with businessId=null)
  businessData.vehicleExpenses = await prisma.vehicleExpenses.findMany()

  businessData.vehicleLicenses = await prisma.vehicleLicenses.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.vehicleMaintenanceRecords = await prisma.vehicleMaintenanceRecords.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.vehicleMaintenanceServices = await prisma.vehicleMaintenanceServices.findMany({
    where: {
      vehicle_maintenance_records: {
        vehicles: {
          businessId: { in: businessIds }
        }
      }
    }
  })

  businessData.vehicleMaintenanceServiceExpenses = await prisma.vehicleMaintenanceServiceExpenses.findMany({
    where: {
      vehicle_maintenance_services: {
        vehicle_maintenance_records: {
          vehicles: {
            businessId: { in: businessIds }
          }
        }
      }
    }
  })

  businessData.vehicleTrips = await prisma.vehicleTrips.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.vehicleReimbursements = await prisma.vehicleReimbursements.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.driverAuthorizations = await prisma.driverAuthorizations.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  // 13. Restaurant/Menu data
  businessData.menuItems = await prisma.menuItems.findMany()

  businessData.menuCombos = await prisma.menuCombos.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  businessData.menuComboItems = await prisma.menuComboItems.findMany({
    where: {
      menu_combos: {
        businessId: { in: businessIds }
      }
    }
  })

  businessData.menuPromotions = await prisma.menuPromotions.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  // 14. Orders (universal)
  businessData.orders = await prisma.orders.findMany()

  businessData.orderItems = await prisma.orderItems.findMany()

  // 15. Supplier products
  businessData.supplierProducts = await prisma.supplierProducts.findMany()

  // Inventory transfers (inter-business stock movements)
  businessData.inventoryTransfers = await prisma.inventoryTransfers.findMany({
    where: {
      OR: [
        { sourceBusinessId: { in: businessIds } },
        { targetBusinessId: { in: businessIds } }
      ]
    }
  })
  businessData.inventoryTransferItems = await prisma.inventoryTransferItems.findMany({
    where: {
      transfer: {
        OR: [
          { sourceBusinessId: { in: businessIds } },
          { targetBusinessId: { in: businessIds } }
        ]
      }
    }
  })

  // 16. Persons
  businessData.persons = await prisma.persons.findMany()

  // 17. Project types
  businessData.projectTypes = await prisma.projectTypes.findMany()

  // 18. Inter-business loans
  businessData.interBusinessLoans = await prisma.interBusinessLoans.findMany({
    where: {
      OR: [
        { lenderBusinessId: { in: businessIds } },
        { borrowerBusinessId: { in: businessIds } }
      ]
    }
  })

  businessData.loanTransactions = await prisma.loanTransactions.findMany({
    where: {
      inter_business_loans: {
        OR: [
          { lenderBusinessId: { in: businessIds } },
          { borrowerBusinessId: { in: businessIds } }
        ]
      }
    }
  })

  // 19. Reference data (global)
  businessData.emojiLookup = await prisma.emojiLookup.findMany()
  businessData.jobTitles = await prisma.jobTitles.findMany()
  businessData.compensationTypes = await prisma.compensationTypes.findMany()
  businessData.benefitTypes = await prisma.benefitTypes.findMany()
  businessData.idFormatTemplates = await prisma.idFormatTemplates.findMany()
  businessData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany()
  businessData.permissionTemplates = await prisma.permissionTemplates.findMany()

  // 20. System data
  businessData.conflictResolutions = await prisma.conflictResolutions.findMany()
  businessData.dataSnapshots = await prisma.dataSnapshots.findMany()
  businessData.seedDataTemplates = await prisma.seedDataTemplates.findMany()

  // 21. WiFi Portal - ESP32 System (6 tables) - NEW
  // First get business token menu items to find which token configs are used
  businessData.businessTokenMenuItems = await prisma.businessTokenMenuItems.findMany({
    where: { businessId: { in: businessIds } }
  })

  // Get token config IDs used by businesses
  const tokenConfigIds = [...new Set(businessData.businessTokenMenuItems.map((item: any) => item.tokenConfigId))]

  // Get token configurations (global table, filter by usage)
  businessData.tokenConfigurations = await prisma.tokenConfigurations.findMany({
    where: { id: { in: tokenConfigIds } }
  })

  // Get WiFi tokens for businesses
  businessData.wifiTokens = await prisma.wifiTokens.findMany({
    where: { businessId: { in: businessIds } }
  })

  // Get WiFi token devices for business tokens
  const wifiTokenIds = businessData.wifiTokens.map((t: any) => t.id)
  businessData.wifiTokenDevices = await prisma.wifiTokenDevices.findMany({
    where: { wifiTokenId: { in: wifiTokenIds } }
  })

  businessData.wifiTokenSales = await prisma.wifiTokenSales.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  // businessTokenMenuItems already fetched above (needed for tokenConfigIds)

  businessData.wiFiUsageAnalytics = await prisma.wiFiUsageAnalytics.findMany({
    where: { businessId: { in: businessIds } }
  })

  // 22. WiFi Portal - R710 System (10 tables) - NEW
  businessData.r710DeviceRegistry = await prisma.r710DeviceRegistry.findMany()

  businessData.r710BusinessIntegrations = await prisma.r710BusinessIntegrations.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.r710Wlans = await prisma.r710Wlans.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.r710TokenConfigs = await prisma.r710TokenConfigs.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.r710Tokens = await prisma.r710Tokens.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.r710TokenSales = await prisma.r710TokenSales.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.r710DeviceTokens = await prisma.r710DeviceTokens.findMany()

  businessData.r710BusinessTokenMenuItems = await prisma.r710BusinessTokenMenuItems.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.r710SyncLogs = await prisma.r710SyncLogs.findMany()

  // 23. Barcode Management System (6 tables) - NEW
  // NetworkPrinters is device-level (has nodeId, not businessId) - include all
  businessData.networkPrinters = await prisma.networkPrinters.findMany()

  businessData.barcodeTemplates = await prisma.barcodeTemplates.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.barcodePrintJobs = await prisma.barcodePrintJobs.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.barcodeInventoryItems = await prisma.barcodeInventoryItems.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.printJobs = await prisma.printJobs.findMany({
    where: { businessId: { in: businessIds } }
  })

  businessData.reprintLog = await prisma.reprintLog.findMany({
    where: { businessId: { in: businessIds } }
  })

  // 24. Security & Access Control (3 tables) - NEW
  businessData.permissions = await prisma.permissions.findMany()

  businessData.userPermissions = await prisma.userPermissions.findMany({
    where: { userId: { in: userIds } }
  })

  businessData.macAclEntry = await prisma.macAclEntry.findMany()

  // 25. Portal Integrations - NEW
  businessData.portalIntegrations = await prisma.portalIntegrations.findMany({
    where: { businessId: { in: businessIds } }
  })

  // 26. SKU Sequences - NEW
  businessData.skuSequences = await prisma.sku_sequences.findMany({
    where: { businessId: { in: businessIds } }
  })

  // 27. Payroll Account Transactions - NEW
  // Include deposits/payments for both business-specific and global (null businessId) payroll accounts
  businessData.payrollAccountDeposits = await prisma.payrollAccountDeposits.findMany({
    where: {
      OR: [
        { payroll_accounts: { businessId: { in: businessIds } } },
        { payroll_accounts: { businessId: null } }
      ]
    }
  })

  businessData.payrollAccountPayments = await prisma.payrollAccountPayments.findMany({
    where: {
      OR: [
        { payroll_accounts: { businessId: { in: businessIds } } },
        { payroll_accounts: { businessId: null } }
      ]
    }
  })

  // 28. Product Price Changes (audit trail) - NEW
  businessData.productPriceChanges = await prisma.product_price_changes.findMany()

  // 29. Audit Logs (optional) - NEW
  if (includeAuditLogs) {
    businessData.auditLogs = await prisma.auditLogs.findMany({
      take: auditLogLimit,
      orderBy: { timestamp: 'desc' }
    })
  }

  // Collect device-specific data (Category B) - only if full-device backup
  let deviceData: any = undefined

  if (includeDeviceData) {
    deviceData = {
      syncSessions: await prisma.syncSessions.findMany(),
      fullSyncSessions: await prisma.fullSyncSessions.findMany(),
      syncNodes: await prisma.syncNodes.findMany(),
      syncMetrics: await prisma.syncMetrics.findMany(),
      nodeStates: await prisma.nodeStates.findMany(),
      syncEvents: await prisma.syncEvents.findMany(),
      syncConfigurations: await prisma.syncConfigurations.findMany(),
      offlineQueue: await prisma.offlineQueue.findMany(),
      deviceRegistry: await prisma.deviceRegistry.findMany(),
      deviceConnectionHistory: await prisma.deviceConnectionHistory.findMany(),
      networkPartitions: await prisma.networkPartitions.findMany()
    }
  }

  // Calculate statistics
  const businessRecords = countRecords(businessData)
  const deviceRecords = deviceData ? countRecords(deviceData) : 0
  const totalRecords = businessRecords + deviceRecords

  // Generate checksums
  const businessDataChecksum = generateChecksum(businessData)
  const deviceDataChecksum = deviceData ? generateChecksum(deviceData) : undefined

  // Calculate uncompressed size
  const tempBackup = {
    metadata: {} as any, // Temporary empty metadata
    businessData,
    deviceData
  }
  const uncompressedSize = Buffer.byteLength(JSON.stringify(tempBackup), 'utf8')

  // Create metadata
  const metadata: BackupMetadata = {
    version: '3.0',
    sourceNodeId: currentNodeId,
    sourceDeviceName: os.hostname(),
    sourceHostname: os.hostname(),
    sourcePlatform: os.platform(),
    timestamp,
    createdBy,
    backupType,
    businessFilter: {
      businessId,
      includeDemoData
    },
    backedUpBusinessIds: businessIds,
    stats: {
      totalRecords,
      totalTables: countTables(businessData) + (deviceData ? countTables(deviceData) : 0),
      businessRecords,
      deviceRecords,
      uncompressedSize
    },
    schemaVersion: '6.19.1',
    checksums: {
      businessData: businessDataChecksum,
      deviceData: deviceDataChecksum
    },
    // Legacy fields
    includeAuditLogs,
    includeBusinessData,
    note: businessId
      ? `Business-specific backup (${businessId})`
      : includeDemoData
        ? 'Demo data included'
        : 'Production data (demo excluded)'
  }

  return {
    metadata,
    businessData,
    deviceData
  }
}
