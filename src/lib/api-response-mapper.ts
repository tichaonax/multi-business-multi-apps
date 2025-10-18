/**
 * API Response Mapper
 * 
 * Transforms Prisma query results (snake_case relations) to UI-friendly format (camelCase).
 * This ensures backward compatibility with existing UI code while maintaining correct
 * Prisma schema relation names.
 */

// Employee response mapper
export function mapEmployeeResponse(employee: any): any {
  if (!employee) return employee

  const mapped = { ...employee }

  // Map job_titles -> jobTitle
  if (employee.job_titles) {
    mapped.jobTitle = employee.job_titles
    // Keep original for APIs that might need it
    // delete mapped.job_titles
  }

  // Map other_employees -> otherEmployees (subordinates)
  if (employee.other_employees) {
    mapped.otherEmployees = employee.other_employees
    mapped.subordinates = employee.other_employees // Keep legacy alias
  }

  // Map employee_contracts relation (self-referential)
  if (employee.employee_contracts) {
    mapped.previousContract = employee.employee_contracts
  }

  // Map the long generated relation name
  if (employee.employee_contracts_employee_contracts_employeeIdToemployees) {
    mapped.employeeContracts = employee.employee_contracts_employee_contracts_employeeIdToemployees
    mapped.contracts = employee.employee_contracts_employee_contracts_employeeIdToemployees
  }

  // Map payroll_entries -> payrollEntries
  if (employee.payroll_entries) {
    mapped.payrollEntries = employee.payroll_entries.map(mapPayrollEntryResponse)
  }

  // Map _count fields
  if (employee._count) {
    const mappedCount = { ...employee._count }
    if (employee._count.other_employees !== undefined) {
      mappedCount.otherEmployees = employee._count.other_employees
      mappedCount.subordinates = employee._count.other_employees
    }
    if (employee._count.employee_contracts_employee_contracts_employeeIdToemployees !== undefined) {
      mappedCount.employeeContracts = employee._count.employee_contracts_employee_contracts_employeeIdToemployees
    }
    if (employee._count.payroll_entries !== undefined) {
      mappedCount.payrollEntries = employee._count.payroll_entries
    }
    mapped._count = mappedCount
  }

  return mapped
}

// Payroll entry response mapper
export function mapPayrollEntryResponse(entry: any): any {
  if (!entry) return entry

  const mapped = { ...entry }

  // Map employees -> employee (UI expects singular)
  if (entry.employees) {
    mapped.employee = mapEmployeeResponse(entry.employees)
  }

  // Map payroll_periods -> payrollPeriod
  if (entry.payroll_periods) {
    mapped.payrollPeriod = mapPayrollPeriodResponse(entry.payroll_periods)
  }

  // Map payroll_adjustments -> payrollAdjustments
  if (entry.payroll_adjustments) {
    mapped.payrollAdjustments = entry.payroll_adjustments.map(mapPayrollAdjustmentResponse)
  }

  // Map payroll_entry_benefits -> payrollEntryBenefits
  if (entry.payroll_entry_benefits) {
    mapped.payrollEntryBenefits = entry.payroll_entry_benefits.map(mapPayrollEntryBenefitResponse)
  }

  return mapped
}

// Payroll period response mapper
export function mapPayrollPeriodResponse(period: any): any {
  if (!period) return period

  const mapped = { ...period }

  // Map payroll_entries -> payrollEntries
  if (period.payroll_entries) {
    mapped.payrollEntries = period.payroll_entries.map(mapPayrollEntryResponse)
  }

  // Map payroll_exports -> payrollExports
  if (period.payroll_exports) {
    mapped.payrollExports = period.payroll_exports
  }

  // Map users relations
  if (period.users_payroll_periods_createdByTousers) {
    mapped.createdBy = period.users_payroll_periods_createdByTousers
  }
  if (period.users_payroll_periods_approvedByTousers) {
    mapped.approvedBy = period.users_payroll_periods_approvedByTousers
  }

  // Map businesses
  if (period.businesses) {
    mapped.business = period.businesses
  }

  return mapped
}

// Payroll adjustment response mapper
export function mapPayrollAdjustmentResponse(adjustment: any): any {
  if (!adjustment) return adjustment

  const mapped = { ...adjustment }

  // Map users relations
  if (adjustment.users_payroll_adjustments_createdByTousers) {
    mapped.createdBy = adjustment.users_payroll_adjustments_createdByTousers
  }
  if (adjustment.users_payroll_adjustments_approvedByTousers) {
    mapped.approvedBy = adjustment.users_payroll_adjustments_approvedByTousers
  }

  return mapped
}

// Payroll entry benefit response mapper
export function mapPayrollEntryBenefitResponse(benefit: any): any {
  if (!benefit) return benefit

  const mapped = { ...benefit }

  // Map benefit_types -> benefitType
  if (benefit.benefit_types) {
    mapped.benefitType = benefit.benefit_types
  }

  return mapped
}

// Payroll export response mapper
export function mapPayrollExportResponse(exportRecord: any): any {
  if (!exportRecord) return exportRecord

  const mapped = { ...exportRecord }

  // Map users -> exporter (UI expects this alias)
  if (exportRecord.users) {
    mapped.exporter = exportRecord.users
  }

  // Map payroll_periods -> payrollPeriod
  if (exportRecord.payroll_periods) {
    mapped.payrollPeriod = mapPayrollPeriodResponse(exportRecord.payroll_periods)
  }

  // Map businesses -> business
  if (exportRecord.businesses) {
    mapped.business = exportRecord.businesses
  }

  return mapped
}

// Contract response mapper
export function mapContractResponse(contract: any): any {
  if (!contract) return contract

  const mapped = { ...contract }

  // Map employees -> employee
  if (contract.employees) {
    mapped.employee = mapEmployeeResponse(contract.employees)
  }

  // Map contract_benefits -> contractBenefits
  if (contract.contract_benefits) {
    mapped.contractBenefits = contract.contract_benefits.map((b: any) => ({
      ...b,
      benefitType: b.benefit_types || b.benefitType
    }))
  }

  // Map job_titles -> jobTitle
  if (contract.job_titles) {
    mapped.jobTitle = contract.job_titles
  }

  // Map businesses -> business
  if (contract.businesses) {
    mapped.business = contract.businesses
  }

  return mapped
}

// Array mappers
export function mapEmployeeArray(employees: any[]): any[] {
  return employees.map(mapEmployeeResponse)
}

export function mapPayrollEntryArray(entries: any[]): any[] {
  return entries.map(mapPayrollEntryResponse)
}

export function mapPayrollPeriodArray(periods: any[]): any[] {
  return periods.map(mapPayrollPeriodResponse)
}

export function mapPayrollExportArray(exports: any[]): any[] {
  return exports.map(mapPayrollExportResponse)
}

export function mapContractArray(contracts: any[]): any[] {
  return contracts.map(mapContractResponse)
}
