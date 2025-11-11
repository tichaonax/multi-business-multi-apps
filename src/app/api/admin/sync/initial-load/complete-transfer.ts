/**
 * COMPLETE Initial Load - Transfer ALL System Data
 * Includes users, employees, vehicles, projects, personal finances, etc.
 */

import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

interface TransferStats {
  transferred: number
  total: number
  bytes: bigint
}

/**
 * Transfer complete system - ALL tables in correct dependency order
 */
export async function transferCompleteSystem(
  sessionId: string,
  sourceNodeId: string,
  targetPeer: any,
  targetPort: number,
  regHash: string,
  options: any
) {
  const stats: TransferStats = {
    transferred: 0,
    total: 0,
    bytes: BigInt(0)
  }

  try {
    console.log(`📦 Starting COMPLETE system transfer`)

    await updateSession(sessionId, {
      status: 'TRANSFERRING',
      currentStep: 'Counting all records...'
    })

    // Count everything first
    stats.total = await countAllSystemRecords()

    await updateSession(sessionId, {
      totalRecords: stats.total,
      currentStep: 'Starting complete system transfer'
    })

    console.log(`📊 Total records to transfer: ${stats.total}`)

    // PHASE 1: Reference/Lookup Tables (no dependencies)
    await transferReferenceTables(sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 2: Users & Authentication (CRITICAL!)
    await transferUsersAndAuth(sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 3: Persons & Personal Data
    await transferPersonalData(sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 4: Businesses (filter out demo)
    const businessIds = await transferBusinessData(sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats, options)

    // PHASE 5: Employees (linked to businesses and users)
    await transferEmployeeData(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 6: Vehicles & Fleet
    await transferVehicleData(sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 7: Projects & Contractors
    await transferProjectData(sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 8: Inter-Business Loans
    await transferLoanData(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 9: Customer Layby
    await transferLaybyData(sessionId, businessIds, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // PHASE 10: Chat & Collaboration
    await transferChatData(sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

    // Complete
    await updateSession(sessionId, {
      status: 'COMPLETED',
      progress: 100,
      currentStep: `Transfer complete - ${stats.transferred} records`,
      completedAt: new Date()
    })

    console.log(`✅ COMPLETE transfer finished: ${stats.transferred} records, ${stats.bytes} bytes`)

  } catch (error) {
    console.error('❌ Transfer failed:', error)
    await updateSession(sessionId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date()
    })
    throw error
  }
}

/**
 * Count ALL system records
 */
async function countAllSystemRecords(): Promise<number> {
  const counts = await Promise.all([
    // Reference tables
    prisma.benefitTypes.count(),
    prisma.compensationTypes.count(),
    prisma.jobTitles.count(),
    prisma.permissionTemplates.count(),
    prisma.idFormatTemplates.count(),
    prisma.driverLicenseTemplates.count(),
    prisma.expenseCategories.count(),
    prisma.expenseSubcategories.count(),
    prisma.expenseDomains.count(),
    prisma.fundSources.count(),
    prisma.projectTypes.count(),

    // Users & Auth
    prisma.users.count(),
    prisma.accounts.count(),
    prisma.businessMemberships.count(),

    // Personal data
    prisma.persons.count(),
    prisma.personalBudgets.count(),
    prisma.personalExpenses.count(),

    // Businesses (exclude demo)
    prisma.businesses.count().then(count => count), // Will filter demo later

    // Employees
    prisma.employees.count(),
    prisma.employeeContracts.count(),
    prisma.employeeBenefits.count(),
    prisma.employeeLoans.count(),
    prisma.employeeLoanPayments.count(),
    prisma.employeeBonuses.count(),
    prisma.employeeDeductions.count(),
    prisma.employeeDeductionPayments.count(),
    prisma.employeeSalaryIncreases.count(),
    prisma.employeeAttendance.count(),
    prisma.employeeLeaveBalance.count(),
    prisma.employeeLeaveRequests.count(),
    prisma.employeeAllowances.count(),
    prisma.employeeTimeTracking.count(),
    prisma.employeeBusinessAssignments.count(),
    prisma.disciplinaryActions.count(),

    // Vehicles
    prisma.vehicles.count(),
    prisma.vehicleDrivers.count(),
    prisma.vehicleLicenses.count(),
    prisma.vehicleMaintenanceRecords.count(),
    prisma.vehicleExpenses.count(),
    prisma.vehicleTrips.count(),
    prisma.vehicleReimbursements.count(),
    prisma.driverAuthorizations.count(),

    // Projects
    prisma.constructionProjects.count(),
    prisma.projectContractors.count(),
    prisma.projectStages.count(),
    prisma.stageContractorAssignments.count(),
    prisma.constructionExpenses.count(),
    prisma.projectTransactions.count()
  ])

  return counts.reduce((sum, count) => sum + count, 0)
}

/**
 * PHASE 1: Reference/Lookup Tables
 */
async function transferReferenceTables(
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring reference tables...' })

  await transferTable('BenefitTypes', await prisma.benefitTypes.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('CompensationTypes', await prisma.compensationTypes.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('JobTitles', await prisma.jobTitles.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('PermissionTemplates', await prisma.permissionTemplates.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('IdFormatTemplates', await prisma.idFormatTemplates.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('DriverLicenseTemplates', await prisma.driverLicenseTemplates.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('ExpenseCategories', await prisma.expenseCategories.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('ExpenseSubcategories', await prisma.expenseSubcategories.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('ExpenseDomains', await prisma.expenseDomains.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('FundSources', await prisma.fundSources.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
  await transferTable('ProjectTypes', await prisma.projectTypes.findMany(), sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * PHASE 2: Users & Authentication
 */
async function transferUsersAndAuth(
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring users & authentication...' })

  // Users (exclude demo users if any)
  const users = await prisma.users.findMany()
  await transferTable('Users', users, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // OAuth/NextAuth accounts
  const accounts = await prisma.accounts.findMany()
  await transferTable('Accounts', accounts, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Business memberships (user access to businesses)
  const memberships = await prisma.businessMemberships.findMany()
  await transferTable('BusinessMemberships', memberships, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Note: Sessions are NOT transferred (they expire anyway)
}

/**
 * PHASE 3: Personal Data
 */
async function transferPersonalData(
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring personal data...' })

  const persons = await prisma.persons.findMany()
  await transferTable('Persons', persons, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const budgets = await prisma.personalBudgets.findMany()
  await transferTable('PersonalBudgets', budgets, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const expenses = await prisma.personalExpenses.findMany()
  await transferTable('PersonalExpenses', expenses, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * PHASE 4: Business Data (from existing comprehensive-transfer.ts logic)
 */
async function transferBusinessData(
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats,
  options: any
): Promise<string[]> {
  await updateSession(sessionId, { currentStep: 'Transferring business data...' })

  // Get non-demo businesses
  const allBusinesses = await prisma.businesses.findMany()
  const businesses = allBusinesses.filter(b => !isDemoBusinessId(b.id))
  const businessIds = businesses.map(b => b.id)

  // Use existing business transfer logic
  const { transferAllBusinessData } = await import('./comprehensive-transfer')
  await transferAllBusinessData(sessionId, sourceNodeId, targetPeer, targetPort, regHash, { ...options, internal: true })

  return businessIds
}

/**
 * PHASE 5: Employee Data
 */
async function transferEmployeeData(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring employee data...' })

  // Employees
  const employees = await prisma.employees.findMany()
  await transferTable('Employees', employees, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Get employee IDs for related tables
  const employeeIds = employees.map(e => e.id)

  // Employee contracts
  const contracts = await prisma.employeeContracts.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeContracts', contracts, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Employee benefits
  const benefits = await prisma.employeeBenefits.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeBenefits', benefits, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Employee loans
  const loans = await prisma.employeeLoans.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeLoans', loans, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const loanPayments = await prisma.employeeLoanPayments.findMany({ where: { employee_loans: { employeeId: { in: employeeIds } } } })
  await transferTable('EmployeeLoanPayments', loanPayments, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Employee bonuses
  const bonuses = await prisma.employeeBonuses.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeBonuses', bonuses, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Employee deductions
  const deductions = await prisma.employeeDeductions.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeDeductions', deductions, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const deductionPayments = await prisma.employeeDeductionPayments.findMany({ where: { employee_deductions: { employeeId: { in: employeeIds } } } })
  await transferTable('EmployeeDeductionPayments', deductionPayments, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Salary increases
  const salaryIncreases = await prisma.employeeSalaryIncreases.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeSalaryIncreases', salaryIncreases, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Attendance
  const attendance = await prisma.employeeAttendance.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeAttendance', attendance, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Leave balance & requests
  const leaveBalance = await prisma.employeeLeaveBalance.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeLeaveBalance', leaveBalance, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const leaveRequests = await prisma.employeeLeaveRequests.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeLeaveRequests', leaveRequests, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Allowances
  const allowances = await prisma.employeeAllowances.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeAllowances', allowances, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Time tracking
  const timeTracking = await prisma.employeeTimeTracking.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeTimeTracking', timeTracking, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Business assignments
  const assignments = await prisma.employeeBusinessAssignments.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('EmployeeBusinessAssignments', assignments, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  // Disciplinary actions
  const disciplinary = await prisma.disciplinaryActions.findMany({ where: { employeeId: { in: employeeIds } } })
  await transferTable('DisciplinaryActions', disciplinary, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * PHASE 6: Vehicle & Fleet Data
 */
async function transferVehicleData(
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring vehicle data...' })

  const vehicles = await prisma.vehicles.findMany()
  await transferTable('Vehicles', vehicles, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const vehicleIds = vehicles.map(v => v.id)

  // VehicleDrivers is a standalone table - no direct vehicleId field
  const drivers = await prisma.vehicleDrivers.findMany()
  await transferTable('VehicleDrivers', drivers, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const licenses = await prisma.vehicleLicenses.findMany({ where: { vehicleId: { in: vehicleIds } } })
  await transferTable('VehicleLicenses', licenses, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const maintenance = await prisma.vehicleMaintenanceRecords.findMany({ where: { vehicleId: { in: vehicleIds } } })
  await transferTable('VehicleMaintenanceRecords', maintenance, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const expenses = await prisma.vehicleExpenses.findMany({ where: { vehicleId: { in: vehicleIds } } })
  await transferTable('VehicleExpenses', expenses, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const trips = await prisma.vehicleTrips.findMany({ where: { vehicleId: { in: vehicleIds } } })
  await transferTable('VehicleTrips', trips, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const reimbursements = await prisma.vehicleReimbursements.findMany({ where: { vehicleId: { in: vehicleIds } } })
  await transferTable('VehicleReimbursements', reimbursements, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const authorizations = await prisma.driverAuthorizations.findMany()
  await transferTable('DriverAuthorizations', authorizations, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * PHASE 7: Projects & Contractors
 */
async function transferProjectData(
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring project data...' })

  const projects = await prisma.constructionProjects.findMany()
  await transferTable('ConstructionProjects', projects, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const projectIds = projects.map(p => p.id)

  const contractors = await prisma.projectContractors.findMany({ where: { projectId: { in: projectIds } } })
  await transferTable('ProjectContractors', contractors, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const stages = await prisma.projectStages.findMany({ where: { projectId: { in: projectIds } } })
  await transferTable('ProjectStages', stages, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const assignments = await prisma.stageContractorAssignments.findMany()
  await transferTable('StageContractorAssignments', assignments, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const expenses = await prisma.constructionExpenses.findMany({ where: { projectId: { in: projectIds } } })
  await transferTable('ConstructionExpenses', expenses, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const transactions = await prisma.projectTransactions.findMany({ where: { projectId: { in: projectIds } } })
  await transferTable('ProjectTransactions', transactions, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * PHASE 8: Inter-Business Loans
 */
async function transferLoanData(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring loan data...' })

  const loans = await prisma.interBusinessLoans.findMany({
    where: {
      OR: [
        { lenderBusinessId: { in: businessIds } },
        { borrowerBusinessId: { in: businessIds } }
      ]
    }
  })
  await transferTable('InterBusinessLoans', loans, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const loanIds = loans.map(l => l.id)
  const transactions = await prisma.loanTransactions.findMany({ where: { loanId: { in: loanIds } } })
  await transferTable('LoanTransactions', transactions, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * PHASE 9: Customer Layby
 */
async function transferLaybyData(
  sessionId: string,
  businessIds: string[],
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring layby data...' })

  const laybys = await prisma.customerLayby.findMany({ where: { businessId: { in: businessIds } } })
  await transferTable('CustomerLayby', laybys, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const laybyIds = laybys.map(l => l.id)
  const payments = await prisma.customerLaybyPayment.findMany({ where: { laybyId: { in: laybyIds } } })
  await transferTable('CustomerLaybyPayment', payments, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * PHASE 10: Chat & Collaboration
 */
async function transferChatData(
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  await updateSession(sessionId, { currentStep: 'Transferring chat data...' })

  const rooms = await prisma.chatRooms.findMany()
  await transferTable('ChatRooms', rooms, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const roomIds = rooms.map(r => r.id)

  const participants = await prisma.chatParticipants.findMany({ where: { roomId: { in: roomIds } } })
  await transferTable('ChatParticipants', participants, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)

  const messages = await prisma.chatMessages.findMany({ where: { roomId: { in: roomIds } } })
  await transferTable('ChatMessages', messages, sessionId, targetPeer, targetPort, sourceNodeId, regHash, stats)
}

/**
 * Generic table transfer function
 */
async function transferTable(
  tableName: string,
  records: any[],
  sessionId: string,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  stats: TransferStats
) {
  if (records.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no records)`)
    return
  }

  console.log(`📤 Transferring ${records.length} ${tableName} records`)

  for (const record of records) {
    await transferRecord(tableName, record.id, record, targetPeer, targetPort, sourceNodeId, regHash, sessionId, stats)
  }
}

/**
 * Transfer individual record
 */
async function transferRecord(
  tableName: string,
  recordId: string,
  data: any,
  targetPeer: any,
  targetPort: number,
  sourceNodeId: string,
  regHash: string,
  sessionId: string,
  stats: TransferStats
) {
  const syncEvent = {
    id: crypto.randomUUID(),
    sourceNodeId,
    table: tableName,
    recordId,
    operation: 'UPSERT', // Use UPSERT to make initial load re-runnable
    data,
    checksum: crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
  }

  const response = await fetch(`http://${targetPeer.ipAddress}:${targetPort}/api/sync/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Node-ID': sourceNodeId,
      'X-Registration-Hash': regHash
    },
    body: JSON.stringify({
      sessionId,
      sourceNodeId,
      events: [syncEvent]
    })
  })

  if (response.ok) {
    stats.transferred++
    stats.bytes += BigInt(JSON.stringify(syncEvent).length)

    if (stats.transferred % 20 === 0) {
      const progress = Math.min(Math.round((stats.transferred / stats.total) * 100), 99)
      await updateSession(sessionId, {
        transferredRecords: stats.transferred,
        transferredBytes: stats.bytes,
        progress
      })
    }
  } else {
    const errorText = await response.text()
    throw new Error(`Failed to transfer ${tableName} ${recordId}: ${errorText}`)
  }

  await new Promise(resolve => setTimeout(resolve, 5))
}

/**
 * Update session status
 */
async function updateSession(sessionId: string, data: any) {
  await prisma.initialLoadSessions.update({
    where: { sessionId },
    data
  })
}

/**
 * Check if business ID is demo
 */
function isDemoBusinessId(businessId: string): boolean {
  if (!businessId || typeof businessId !== 'string') return false
  const lower = businessId.toLowerCase()
  return lower.includes('-demo-business') || lower.endsWith('-demo') || lower.startsWith('demo-') || lower === 'demo'
}
