import * as XLSX from 'xlsx'

interface PayrollEmployeeData {
  idNumber: string
  dateOfBirth: string
  firstName: string
  lastName: string
  workDays: number
  basicSalary: number
  commission?: number
  livingAllowance?: number
  vehicleReimbursement?: number
  travelAllowance?: number
  overtime?: number
  advances?: number
  loans?: number
  benefitsTotal?: number
}

interface PayrollExportOptions {
  month: number
  year: number
  businessName: string
}

export function generatePayrollWorksheet(
  employees: PayrollEmployeeData[],
  options: PayrollExportOptions
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  // Create worksheet headers based on the Employee-Worksheet format
  const headers = [
    'ID Number',
    'Date Of Birth',
    'First Name',
    'Last Name',
    'Work Days',
    'Basic Salary',
    'Commission',
    'Living Allowance',
    'Vehicle Reimbursement',
    'Travel Allowance',
    'Overtime',
    'Benefits',
    'Advances',
    'Loans',
    'Gross Pay',
    'Deductions',
  'Net Gross'
  ]

  // Transform employee data to worksheet rows
  const worksheetData = employees.map(emp => {
    // If the calling code already provided computed gross/net (server-side), prefer those values
    const providedGross = (emp as any).grossPay
    const providedNet = (emp as any).netPay

    const computedGross = (emp.basicSalary || 0) +
      (emp.commission || 0) +
      (emp.livingAllowance || 0) +
      (emp.vehicleReimbursement || 0) +
      (emp.travelAllowance || 0) +
      (emp.overtime || 0) +
      (emp.benefitsTotal || 0)

    const deductions = (emp.advances || 0) + (emp.loans || 0)

    const grossPay = typeof providedGross === 'number' && providedGross !== 0 ? providedGross : computedGross
    const netPay = typeof providedNet === 'number' && providedNet !== 0 ? providedNet : (grossPay - deductions)

    return [
      emp.idNumber,
      emp.dateOfBirth,
      emp.firstName,
      emp.lastName,
      emp.workDays,
      emp.basicSalary || 0,
      emp.commission || 0,
      emp.livingAllowance || 0,
      emp.vehicleReimbursement || 0,
      emp.travelAllowance || 0,
      emp.overtime || 0,
      emp.benefitsTotal || 0,
      emp.advances || 0,
      emp.loans || 0,
      grossPay,
      deductions,
      netPay
    ]
  })

  // Add headers as first row
  const allData = [headers, ...worksheetData]

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(allData)

  // Set column widths
  const colWidths = [
    { wch: 15 }, // ID Number
    { wch: 12 }, // Date Of Birth
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 10 }, // Work Days
    { wch: 12 }, // Basic Salary
    { wch: 12 }, // Commission
    { wch: 15 }, // Living Allowance
    { wch: 18 }, // Vehicle Reimbursement
    { wch: 15 }, // Travel Allowance
    { wch: 10 }, // Overtime
    { wch: 12 }, // Benefits
    { wch: 10 }, // Advances
    { wch: 10 }, // Loans
    { wch: 12 }, // Gross Pay
    { wch: 12 }, // Deductions
  { wch: 12 }  // Net Gross
  ]

  worksheet['!cols'] = colWidths

  // Format currency columns
  const currencyFormat = '"$"#,##0.00'
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:P1')

  for (let row = 1; row <= range.e.r; row++) {
    // Format salary columns (F through Q except work days column E)
    for (let col = 5; col <= 16; col++) {
      if (col === 4) continue // Skip work days column
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].z = currencyFormat
      }
    }
  }

  // Add worksheet to workbook
  const sheetName = `${options.businessName} - ${getMonthName(options.month)} ${options.year}`
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  return workbook
}

export function exportPayrollToBuffer(
  employees: PayrollEmployeeData[],
  options: PayrollExportOptions,
  format: 'xlsx' | 'csv' = 'xlsx'
): Buffer {
  const workbook = generatePayrollWorksheet(employees, options)

  if (format === 'csv') {
    const worksheet = workbook.Sheets[Object.keys(workbook.Sheets)[0]]
    const csvData = XLSX.utils.sheet_to_csv(worksheet)
    return Buffer.from(csvData, 'utf8')
  }

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

export function getPayrollFilename(options: PayrollExportOptions, format: 'xlsx' | 'csv' = 'xlsx'): string {
  const monthName = getMonthName(options.month)
  const businessName = options.businessName.replace(/[^a-zA-Z0-9]/g, '_')
  return `${businessName}_Payroll_${monthName}_${options.year}.${format}`
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1] || 'Unknown'
}

export interface PayrollSummary {
  totalEmployees: number
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  averageWorkDays: number
}

export function calculatePayrollSummary(employees: PayrollEmployeeData[]): PayrollSummary {
  if (employees.length === 0) {
    return {
      totalEmployees: 0,
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      averageWorkDays: 0
    }
  }

  let totalGrossPay = 0
  let totalDeductions = 0
  let totalWorkDays = 0

  employees.forEach(emp => {
    const grossPay = (emp.basicSalary || 0) +
      (emp.commission || 0) +
      (emp.livingAllowance || 0) +
      (emp.vehicleReimbursement || 0) +
      (emp.travelAllowance || 0) +
      (emp.overtime || 0) +
      (emp.benefitsTotal || 0)

    const deductions = (emp.advances || 0) + (emp.loans || 0)

    totalGrossPay += grossPay
    totalDeductions += deductions
    totalWorkDays += emp.workDays
  })

  return {
    totalEmployees: employees.length,
    totalGrossPay,
    totalDeductions,
    totalNetPay: totalGrossPay - totalDeductions,
    averageWorkDays: Math.round((totalWorkDays / employees.length) * 100) / 100
  }
}