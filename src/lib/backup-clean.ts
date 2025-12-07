/**
 * Clean Backup Implementation
 * Creates deterministic, flat backups without nested relations
 * Suitable for cross-machine restore with predictable results
 */

import { PrismaClient } from '@prisma/client'

export interface BackupMetadata {
  backupType: string
  timestamp: string
  version: string
  source: string
  includeAuditLogs: boolean
  includeDemoData: boolean
  includeBusinessData: boolean
  businessId?: string
  note: string
}

export interface BackupData {
  metadata: BackupMetadata
  [key: string]: any
}

/**
 * Create a clean backup without nested relations
 * All data is stored flat - relations are handled through foreign keys
 */
export async function createCleanBackup(
  prisma: PrismaClient,
  options: {
    backupType?: string
    includeAuditLogs?: boolean
    includeDemoData?: boolean
    includeBusinessData?: boolean
    businessId?: string
    auditLogLimit?: number
  } = {}
): Promise<BackupData> {
  const {
    backupType = 'full',
    includeAuditLogs = false,
    includeDemoData = false,
    includeBusinessData = true,
    businessId,
    auditLogLimit = 1000
  } = options

  const backupData: BackupData = {
    metadata: {
      backupType,
      timestamp: new Date().toISOString(),
      version: '2.0',
      source: 'multi-business-multi-apps',
      includeAuditLogs,
      includeDemoData,
      includeBusinessData,
      businessId,
      note: businessId 
        ? `Specific business backup (${businessId})`
        : includeDemoData 
          ? 'Demo data included' 
          : 'Demo data excluded (production backup)'
    }
  }

  // Filter for non-demo businesses by default
  const businessFilter = includeDemoData ? {} : { isDemo: false }

  // 0. System settings (global)
  backupData.systemSettings = await prisma.systemSettings.findMany()

  // 1. Core business and user data (NO INCLUDES)
  backupData.businesses = await prisma.businesses.findMany({
    where: businessFilter
  })

  const businessIds = backupData.businesses.map((b: any) => b.id)
  const businessTypes = [...new Set(backupData.businesses.map((b: any) => b.type))]

  // 2. Users (only those with memberships in backed up businesses)
  backupData.users = await prisma.users.findMany({
    where: includeDemoData ? {} : {
      business_memberships: {
        some: {
          businessId: { in: businessIds }
        }
      }
    }
  })

  // 3. Accounts
  backupData.accounts = await prisma.accounts.findMany()

  // 4. Business memberships
  backupData.businessMemberships = await prisma.businessMemberships.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  // 5. Employees and HR data
  backupData.employees = await prisma.employees.findMany({
    where: {
      primaryBusinessId: { in: businessIds }
    }
  })

  backupData.employeeContracts = await prisma.employeeContracts.findMany({
    where: {
      primaryBusinessId: { in: businessIds }
    }
  })

  backupData.employeeBusinessAssignments = await prisma.employeeBusinessAssignments.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  backupData.employeeBenefits = await prisma.employeeBenefits.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeAllowances = await prisma.employeeAllowances.findMany({
    where: {
      employees_employee_allowances_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeBonuses = await prisma.employeeBonuses.findMany({
    where: {
      employees_employee_bonuses_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeDeductions = await prisma.employeeDeductions.findMany({
    where: {
      employees_employee_deductions_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeLoans = await prisma.employeeLoans.findMany({
    where: {
      employees_employee_loans_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeSalaryIncreases = await prisma.employeeSalaryIncreases.findMany({
    where: {
      employees_employee_salary_increases_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeLeaveRequests = await prisma.employeeLeaveRequests.findMany({
    where: {
      employees_employee_leave_requests_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeLeaveBalance = await prisma.employeeLeaveBalance.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeAttendance = await prisma.employeeAttendance.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeTimeTracking = await prisma.employeeTimeTracking.findMany({
    where: {
      employees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.disciplinaryActions = await prisma.disciplinaryActions.findMany({
    where: {
      employees_disciplinary_actions_employeeIdToemployees: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.employeeDeductionPayments = await prisma.employeeDeductionPayments.findMany({
    where: {
      employee_deductions: {
        employees_employee_deductions_employeeIdToemployees: {
          primaryBusinessId: { in: businessIds }
        }
      }
    }
  })

  backupData.employeeLoanPayments = await prisma.employeeLoanPayments.findMany({
    where: {
      employee_loans: {
        employees_employee_loans_employeeIdToemployees: {
          primaryBusinessId: { in: businessIds }
        }
      }
    }
  })

  backupData.contractBenefits = await prisma.contractBenefits.findMany({
    where: {
      employee_contracts: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  backupData.contractRenewals = await prisma.contractRenewals.findMany({
    where: {
      employee_contracts_contract_renewals_originalContractIdToemployee_contracts: {
        primaryBusinessId: { in: businessIds }
      }
    }
  })

  // 6. Business data (if included)
  if (includeBusinessData) {
    backupData.businessProducts = await prisma.businessProducts.findMany({
      where: { businessId: { in: businessIds } }
    })

    backupData.productVariants = await prisma.productVariants.findMany({
      where: {
        business_products: {
          businessId: { in: businessIds }
        }
      }
    })

    backupData.productImages = await prisma.productImages.findMany({
      where: {
        business_products: {
          businessId: { in: businessIds }
        }
      }
    })

    backupData.productAttributes = await prisma.productAttributes.findMany({
      where: {
        business_products: {
          businessId: { in: businessIds }
        }
      }
    })

    backupData.productBarcodes = await prisma.productBarcodes.findMany({
      where: {
        product_variant: {
          business_products: {
            businessId: { in: businessIds }
          }
        }
      }
    })

    backupData.businessStockMovements = await prisma.businessStockMovements.findMany({
      where: { businessId: { in: businessIds } }
    })

    // Business categories - include business-specific ones AND all system-wide defaults
    backupData.businessCategories = await prisma.businessCategories.findMany({
      where: {
        OR: [
          { businessId: { in: businessIds } }, // Business-specific categories
          { businessId: null } // All system-wide/default categories (regardless of businessType)
        ]
      }
    })

    // Business suppliers - include business-specific ones AND all system-wide defaults
    backupData.businessSuppliers = await prisma.businessSuppliers.findMany({
      where: {
        OR: [
          { businessId: { in: businessIds } }, // Business-specific suppliers
          { businessId: null } // All system-wide/default suppliers (regardless of businessType)
        ]
      }
    })

    backupData.businessCustomers = await prisma.businessCustomers.findMany({
      where: { businessId: { in: businessIds } }
    })

    backupData.businessBrands = await prisma.businessBrands.findMany({
      where: { businessId: { in: businessIds } }
    })

    backupData.businessLocations = await prisma.businessLocations.findMany({
      where: { businessId: { in: businessIds } }
    })

    backupData.businessAccounts = await prisma.businessAccounts.findMany({
      where: { businessId: { in: businessIds } }
    })

    backupData.businessOrders = await prisma.businessOrders.findMany({
      where: { businessId: { in: businessIds } }
    })

    backupData.businessOrderItems = await prisma.businessOrderItems.findMany({
      where: {
        business_orders: {
          businessId: { in: businessIds }
        }
      }
    })

    backupData.businessTransactions = await prisma.businessTransactions.findMany({
      where: { businessId: { in: businessIds } }
    })

    backupData.customerLaybys = await prisma.customerLayby.findMany({
      where: {
        customer: {
          businessId: { in: businessIds }
        }
      }
    })

    backupData.customerLaybyPayments = await prisma.customerLaybyPayment.findMany({
      where: {
        layby: {
          customer: {
            businessId: { in: businessIds }
          }
        }
      }
    })
  }

  // 7. Inventory system
  backupData.inventoryDomains = await prisma.inventoryDomains.findMany()

  backupData.inventorySubcategories = await prisma.inventorySubcategories.findMany()

  // 8. Expense management
  backupData.expenseDomains = await prisma.expenseDomains.findMany()

  backupData.expenseCategories = await prisma.expenseCategories.findMany()

  backupData.expenseSubcategories = await prisma.expenseSubcategories.findMany()

  // Get user IDs for expense account filtering (need this before querying expense accounts)
  const userIds = backupData.users.map((u: any) => u.id)

  // Include expense accounts that are:
  // 1. Created by users in backed-up businesses, OR
  // 2. Have deposits from backed-up businesses, OR
  // 3. Have payments to backed-up businesses
  // This ensures empty accounts (setup accounts) are included
  backupData.expenseAccounts = await prisma.expenseAccounts.findMany({
    where: {
      OR: [
        { createdBy: { in: userIds } },
        { deposits: { some: { sourceBusinessId: { in: businessIds } } } },
        { payments: { some: { payeeBusinessId: { in: businessIds } } } }
      ]
    }
  })

  backupData.expenseAccountDeposits = await prisma.expenseAccountDeposits.findMany({
    where: {
      sourceBusinessId: { in: businessIds }
    }
  })

  backupData.expenseAccountPayments = await prisma.expenseAccountPayments.findMany({
    where: {
      payeeBusinessId: { in: businessIds }
    }
  })

  // 9. Payroll system
  backupData.payrollPeriods = await prisma.payrollPeriods.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  backupData.payrollEntries = await prisma.payrollEntries.findMany({
    where: {
      payroll_periods: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.payrollEntryBenefits = await prisma.payrollEntryBenefits.findMany({
    where: {
      payroll_entries: {
        payroll_periods: {
          businessId: { in: businessIds }
        }
      }
    }
  })

  backupData.payrollExports = await prisma.payrollExports.findMany({
    where: {
      payroll_periods: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.payrollAdjustments = await prisma.payrollAdjustments.findMany({
    where: {
      payroll_entries: {
        payroll_periods: {
          businessId: { in: businessIds }
        }
      }
    }
  })

  backupData.payrollAccounts = await prisma.payrollAccounts.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  // 10. Personal finance
  // Note: userIds already defined earlier for expense accounts

  backupData.personalBudgets = await prisma.personalBudgets.findMany({
    where: {
      userId: { in: userIds }
    }
  })

  backupData.personalExpenses = await prisma.personalExpenses.findMany({
    where: {
      userId: { in: userIds }
    }
  })

  backupData.fundSources = await prisma.fundSources.findMany({
    where: {
      userId: { in: userIds }
    }
  })

  // 11. Projects and construction
  backupData.projects = await prisma.projects.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  backupData.projectStages = await prisma.projectStages.findMany({
    where: {
      projects: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.projectContractors = await prisma.projectContractors.findMany({
    where: {
      projects: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.projectTransactions = await prisma.projectTransactions.findMany({
    where: {
      projects: {
        businessId: { in: businessIds }
      }
    }
  })

  // Construction projects don't have businessId - include all
  backupData.constructionProjects = await prisma.constructionProjects.findMany()

  backupData.constructionExpenses = await prisma.constructionExpenses.findMany()

  backupData.stageContractorAssignments = await prisma.stageContractorAssignments.findMany()

  // 12. Vehicle fleet management
  backupData.vehicles = await prisma.vehicles.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  // VehicleDrivers don't have direct business relation - include all
  backupData.vehicleDrivers = await prisma.vehicleDrivers.findMany()

  backupData.vehicleExpenses = await prisma.vehicleExpenses.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  backupData.vehicleLicenses = await prisma.vehicleLicenses.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.vehicleMaintenanceRecords = await prisma.vehicleMaintenanceRecords.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.vehicleMaintenanceServices = await prisma.vehicleMaintenanceServices.findMany({
    where: {
      vehicle_maintenance_records: {
        vehicles: {
          businessId: { in: businessIds }
        }
      }
    }
  })

  backupData.vehicleMaintenanceServiceExpenses = await prisma.vehicleMaintenanceServiceExpenses.findMany({
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

  backupData.vehicleTrips = await prisma.vehicleTrips.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.vehicleReimbursements = await prisma.vehicleReimbursements.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.driverAuthorizations = await prisma.driverAuthorizations.findMany({
    where: {
      vehicles: {
        businessId: { in: businessIds }
      }
    }
  })

  // 13. Restaurant/Menu data
  backupData.menuItems = await prisma.menuItems.findMany()

  backupData.menuCombos = await prisma.menuCombos.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  backupData.menuComboItems = await prisma.menuComboItems.findMany({
    where: {
      menu_combos: {
        businessId: { in: businessIds }
      }
    }
  })

  backupData.menuPromotions = await prisma.menuPromotions.findMany({
    where: {
      businessId: { in: businessIds }
    }
  })

  // 14. Orders (universal)
  backupData.orders = await prisma.orders.findMany()

  backupData.orderItems = await prisma.orderItems.findMany()

  // 15. Supplier products
  backupData.supplierProducts = await prisma.supplierProducts.findMany()

  // 16. Persons
  backupData.persons = await prisma.persons.findMany()

  // 17. Project types
  backupData.projectTypes = await prisma.projectTypes.findMany()

  // 18. Inter-business loans
  backupData.interBusinessLoans = await prisma.interBusinessLoans.findMany({
    where: {
      OR: [
        { lenderBusinessId: { in: businessIds } },
        { borrowerBusinessId: { in: businessIds } }
      ]
    }
  })

  backupData.loanTransactions = await prisma.loanTransactions.findMany({
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
  backupData.emojiLookup = await prisma.emojiLookup.findMany()
  backupData.jobTitles = await prisma.jobTitles.findMany()
  backupData.compensationTypes = await prisma.compensationTypes.findMany()
  backupData.benefitTypes = await prisma.benefitTypes.findMany()
  backupData.idFormatTemplates = await prisma.idFormatTemplates.findMany()
  backupData.driverLicenseTemplates = await prisma.driverLicenseTemplates.findMany()
  backupData.permissionTemplates = await prisma.permissionTemplates.findMany()

  // 20. System data
  backupData.conflictResolutions = await prisma.conflictResolutions.findMany()
  backupData.dataSnapshots = await prisma.dataSnapshots.findMany()
  backupData.seedDataTemplates = await prisma.seedDataTemplates.findMany()

  return backupData
}
