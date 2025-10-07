import ExcelJS from 'exceljs'

interface PayrollEntryBenefit {
  id: string
  benefitTypeId: string
  benefitName: string
  amount: number
  isActive: boolean
}

interface PayrollEntry {
  employeeNumber: string
  employeeName: string
  nationalId: string
  dateOfBirth: Date | null
  hireDate: Date
  terminationDate: Date | null
  workDays: number
  baseSalary: number
  commission: number
  livingAllowance: number
  vehicleAllowance: number
  travelAllowance: number
  overtimePay: number
  advanceDeductions: number
  loanDeductions: number
  miscDeductions: number
  grossPay: number
  totalDeductions: number
  netPay: number
  payrollEntryBenefits?: PayrollEntryBenefit[]
}

interface PayrollPeriod {
  year: number
  month: number
  periodStart: Date
  periodEnd: Date
  status: string
}

/**
 * Generate Excel file for payroll export with dynamic benefit columns
 * Format:
 * ID Number | DOB | Employee Surname | Employee First Names | Days | Date Engaged | Date Dismissed |
 * Basic Salary | Commission | Overtime | [Dynamic Benefits...] | Misc Reimbursement | Advances Loans | Misc Deductions
 */
export async function generatePayrollExcel(
  period: PayrollPeriod,
  entries: PayrollEntry[],
  businessName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Business Management System'
  workbook.created = new Date()
  workbook.modified = new Date()

  // Create worksheet
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const sheetName = `${monthNames[period.month - 1]} ${period.year}`
  const worksheet = workbook.addWorksheet(sheetName)

  // Get unique benefits from contract data (only show columns with at least one non-zero value)
  const normalizeName = (s?: string) => (s || '').normalize?.('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
  const uniqueBenefitsMap = new Map<string, { id: string, name: string }>()
  entries.forEach(entry => {
    // Start with contract benefits
    const contractBenefits = (entry as any).contract?.pdfGenerationData?.benefits || []

    contractBenefits.forEach((cb: any) => {
      const contractAmount = Number(cb.amount || 0)

      // Check for any override (active or inactive)
      const override = entry.payrollEntryBenefits?.find((pb: any) =>
        pb.benefitName === cb.name
      )

      // If inactive override exists, skip this benefit entirely
      if (override && override.isActive === false) {
        return
      }

      // Determine the effective amount to display
      let effectiveAmount = contractAmount
      if (override && override.isActive === true) {
        effectiveAmount = Number(override.amount || 0)
      }

      // Only show column if effective amount > 0
      if (effectiveAmount > 0) {
        const name = cb.name || ''
        const key = normalizeName(name)
        if (!uniqueBenefitsMap.has(key)) {
          const benefitId = cb.benefitTypeId || cb.name
          uniqueBenefitsMap.set(key, { id: String(benefitId), name })
        }
      }
    })

    // Add manual benefits (not from contract at all - truly new benefits)
    entry.payrollEntryBenefits?.forEach((benefit: any) => {
      if (!benefit.isActive) return
      const amount = Number(benefit.amount || 0)
      if (amount <= 0) return

      // Only add if NOT from contract (manual additions)
      const inContract = contractBenefits.some((cb: any) => cb.name === benefit.benefitName)
      if (!inContract) {
        const name = benefit.benefitName || ''
        const key = normalizeName(name)
        if (!uniqueBenefitsMap.has(key)) {
          const benefitId = benefit.benefitTypeId || benefit.benefitName
          uniqueBenefitsMap.set(key, { id: String(benefitId), name })
        }
      }
    })
  })
  const uniqueBenefits = Array.from(uniqueBenefitsMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(b => ({ benefitTypeId: b.id, benefitName: b.name }))

  // Build dynamic header array
  const fixedHeaders = [
      'Company',
    'ID Number',
    'DOB',
    'Employee Surname',
    'Employee First Names',
    'Days',
    'Sick Total',
    'Leave Total',
    'Absence Total',
    'Date Engaged',
    'Date Dismissed',
    'Basic Salary',
    'Commission',
    'Overtime'
  ]
  const benefitHeaders = uniqueBenefits.map(b => b.benefitName)
  const endHeaders = [
    'Absence (unearned)',
    'Advances Loans',
    'Misc Deductions',
    'Benefits Total',
    'Gross Pay (incl Benefits)',
    'Net Pay (incl Benefits)'
  ]
  const allHeaders = [...fixedHeaders, ...benefitHeaders, ...endHeaders]
  const totalColumns = allHeaders.length

  // Calculate merge range for title
  const lastColumnLetter = getColumnLetter(totalColumns)

  // Add title
  worksheet.mergeCells(`A1:${lastColumnLetter}1`)
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `${businessName} - Payroll for ${sheetName}`
  titleCell.font = { size: 14, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // Add period info
  worksheet.mergeCells(`A2:${lastColumnLetter}2`)
  const periodCell = worksheet.getCell('A2')
  periodCell.value = `Period: ${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`
  periodCell.font = { size: 11 }
  periodCell.alignment = { horizontal: 'center' }

  // Add blank row
  worksheet.addRow([])

  // Define columns with headers
  const headerRow = worksheet.addRow(allHeaders)

  // Style header row
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 20

  // Set column widths dynamically
  // Build column widths matching headers
  const columnWidths: number[] = []
  allHeaders.forEach((h) => {
    switch (h) {
        case 'Company': columnWidths.push(10); break
      case 'ID Number': columnWidths.push(15); break
      case 'DOB': columnWidths.push(12); break
      case 'Employee Surname': columnWidths.push(20); break
      case 'Employee First Names': columnWidths.push(20); break
      case 'Days': columnWidths.push(10); break
      case 'Sick Total': columnWidths.push(10); break
      case 'Leave Total': columnWidths.push(10); break
      case 'Absence Total': columnWidths.push(10); break
      case 'Date Engaged': columnWidths.push(12); break
      case 'Date Dismissed': columnWidths.push(12); break
      case 'Basic Salary': columnWidths.push(15); break
      case 'Commission': columnWidths.push(15); break
      case 'Overtime': columnWidths.push(15); break
      default:
        // benefit or end columns
        columnWidths.push(15)
    }
  })

  worksheet.columns = columnWidths.map(width => ({ width }))

  // Add data rows
  entries.forEach((entry) => {
    // Prefer explicit firstName/lastName if provided; otherwise split employeeName
    let firstName = ''
    let surname = ''
    if ((entry as any).employeeFirstName || (entry as any).employeeLastName) {
      firstName = (entry as any).employeeFirstName || ''
      surname = (entry as any).employeeLastName || ''
    } else {
      const nameParts = (entry as any).employeeName ? (entry as any).employeeName.split(' ') : []
      firstName = nameParts.slice(0, -1).join(' ') || ''
      surname = nameParts.slice(-1)[0] || ''
    }

    // Build row data array
    const rowData = [
        // company short label - prefer server-provided shortName when available
        (() => {
          const pb = (entry as any).primaryBusiness
          if (pb && pb.shortName) return pb.shortName
          const name = pb?.name || ''
          if (!name) return ''
          const parts = name.split(/\s+/).filter(Boolean)
          if (parts.length >= 2) return parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 4)
          return name.replace(/\s+/g, '').toUpperCase().slice(0, 4)
        })(),
      entry.nationalId,
      // Prefer employeeDateOfBirth if present (string/Date), otherwise entry.dateOfBirth
      (entry as any).employeeDateOfBirth ? formatDate((entry as any).employeeDateOfBirth) : (entry.dateOfBirth ? formatDate(entry.dateOfBirth) : ''),
      surname,
      firstName,
      entry.workDays,
      (entry as any).cumulativeSickDays || 0,
      (entry as any).cumulativeLeaveDays || 0,
  (entry as any).cumulativeAbsenceDays || 0,
      // Prefer employeeHireDate (contract start) when present
      (entry as any).employeeHireDate ? formatDate((entry as any).employeeHireDate) : formatDate(entry.hireDate),
      entry.terminationDate ? formatDate(entry.terminationDate) : '',
      entry.baseSalary,
      entry.commission,
      entry.overtimePay
    ]

    // Add benefit values from contract with manual overrides
    let benefitsSum = 0
    uniqueBenefits.forEach(uniqueBenefit => {
      // Get value from contract first (match by benefitTypeId for accuracy)
      const contractBenefits = (entry as any).contract?.pdfGenerationData?.benefits || []
      const contractBenefit = contractBenefits.find((cb: any) =>
        cb.benefitTypeId === uniqueBenefit.benefitTypeId || cb.name === uniqueBenefit.benefitName
      )

      // Check for manual override (match by benefitTypeId first, then name)
      const manualOverride = entry.payrollEntryBenefits?.find((pb: any) =>
        pb.isActive && (
          pb.benefitTypeId === uniqueBenefit.benefitTypeId ||
          pb.benefitName === uniqueBenefit.benefitName
        )
      )

      // Check if this benefit is deactivated
      const isDeactivated = entry.payrollEntryBenefits?.find((pb: any) =>
        !pb.isActive && (
          pb.benefitTypeId === uniqueBenefit.benefitTypeId ||
          pb.benefitName === uniqueBenefit.benefitName
        )
      )

      // Use override if exists, otherwise use contract value, unless deactivated
      const amount = isDeactivated ? null : (manualOverride?.amount ?? contractBenefit?.amount)

      if (typeof amount === 'number') benefitsSum += Number(amount || 0)
      rowData.push(typeof amount === 'number' ? amount : '') // Blank if no benefit
    })

    // Add end columns
  const advancesLoans = entry.advanceDeductions + entry.loanDeductions
    // If the server has already computed grossPay/netPay (which include benefits and adjustments), prefer those values.
    // Otherwise compute locally from components (base + commission + overtime + benefits + adjustments)
    // Prefer stored server values if present (including zero)
    const storedGrossRaw = (entry as any).grossPay
    const storedNetRaw = (entry as any).netPay
    const storedGross = storedGrossRaw !== undefined && storedGrossRaw !== null ? Number(storedGrossRaw) : undefined
    const storedNet = storedNetRaw !== undefined && storedNetRaw !== null ? Number(storedNetRaw) : undefined

  const additions = Number((entry as any).adjustmentsTotal || 0)
  // adjustmentsAsDeductions may include absence; subtract resolved absence so exports don't double-count it
  const storedAdjAs = Number((entry as any).adjustmentsAsDeductions || 0)
  const absenceDeduction = Number(((entry as any).absenceDeduction ?? (entry as any).absenceAmount) || 0)
  const adjAsDeductions = Math.max(0, storedAdjAs - absenceDeduction)
  const computedGross = Number(entry.baseSalary || 0) + Number(entry.commission || 0) + Number(entry.overtimePay || 0) + benefitsSum + additions - (absenceDeduction || 0)

    const grossInclBenefits = Number.isFinite(storedGross as number) ? (storedGross as number) : computedGross

    // Determine totalDeductions (prefer server total only when positive), otherwise derive from breakdown
    const serverTotalDeductions = Number(entry.totalDeductions ?? 0)
    const derivedTotalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0) + adjAsDeductions
    const totalDeductions = (typeof serverTotalDeductions === 'number' && serverTotalDeductions > 0) ? serverTotalDeductions : derivedTotalDeductions

  // Net (incl Benefits) in the export should reflect gross (third-party handles deductions)
  const netInclBenefits = Number.isFinite(storedNet as number) ? (storedNet as number) : grossInclBenefits

    // Compute absence/unearned value: prefer stored/persisted absenceDeduction, otherwise compute per-day using cumulativeAbsenceDays
    const absenceDeduction = Number((entry as any).absenceDeduction ?? (entry as any).absenceAmount ?? 0)
    const absenceDays = Number((entry as any).cumulativeAbsenceDays ?? (entry as any).absenceDays ?? 0)
    const workingDays = (() => {
      try {
        const d = new Date(period.periodStart)
        const month = Number((d.getMonth ? d.getMonth() : (new Date()).getMonth()) + 1)
        const year = Number(d.getFullYear ? d.getFullYear() : (new Date()).getFullYear())
        const daysInMonth = new Date(year, month, 0).getDate()
        let cnt = 0
        for (let dd = 1; dd <= daysInMonth; dd++) {
          const dt = new Date(year, month - 1, dd)
          const day = dt.getDay()
          if (day !== 0 && day !== 6) cnt++
        }
        return cnt
      } catch (e) { return 22 }
    })()
    const perDay = workingDays > 0 ? (Number(entry.baseSalary || 0) / workingDays) : 0
    const computedAbsence = absenceDeduction && absenceDeduction !== 0 ? absenceDeduction : (perDay * absenceDays)

    rowData.push(
      computedAbsence, // Absence (unearned)
      advancesLoans,
      entry.miscDeductions,
      benefitsSum,
      grossInclBenefits,
      netInclBenefits
    )

    const dataRow = worksheet.addRow(rowData)

    // Format currency columns (all numeric columns starting at Basic Salary)
    const firstCurrencyCol = allHeaders.indexOf('Basic Salary') + 1
    const lastCurrencyCol = totalColumns
    for (let col = firstCurrencyCol; col <= lastCurrencyCol; col++) {
      const cell = dataRow.getCell(col)
      // Only format if cell has a value
      if (cell.value !== '' && cell.value !== null && cell.value !== undefined) {
        cell.numFmt = '#,##0.00'
      }
      cell.alignment = { horizontal: 'right' }
    }

    // Add borders
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
  })

  // Add totals row
  const dataStartRow = 5
  const dataEndRow = 4 + entries.length
  const totalRowData: any[] = ['', '', 'TOTALS']

  // Determine important column indexes dynamically based on headers (1-based)
  const baseSalaryIndex = allHeaders.indexOf('Basic Salary') + 1
  const commissionIndex = allHeaders.indexOf('Commission') + 1
  const overtimeIndex = allHeaders.indexOf('Overtime') + 1

  // totalRowData currently has 3 items (indices 0,1,2)
  // We need to fill up to baseSalaryIndex - 1
  // Current length is 3, so we start filling from index 3
  const currentLength = totalRowData.length
  for (let i = currentLength; i < baseSalaryIndex - 1; i++) {
    totalRowData.push('')
  }

  // Add formulas for Basic Salary, Commission, Overtime
  const baseSalaryCol = getColumnLetter(baseSalaryIndex)
  const commissionCol = getColumnLetter(commissionIndex)
  const overtimeCol = getColumnLetter(overtimeIndex)
  totalRowData.push(
    { formula: `SUM(${baseSalaryCol}${dataStartRow}:${baseSalaryCol}${dataEndRow})` },
    { formula: `SUM(${commissionCol}${dataStartRow}:${commissionCol}${dataEndRow})` },
    { formula: `SUM(${overtimeCol}${dataStartRow}:${overtimeCol}${dataEndRow})` }
  )

  // Add formulas for each benefit column
  // After pushing Basic Salary, Commission, Overtime, we're now at the benefit columns
  let excelCol = overtimeIndex + 1
  uniqueBenefits.forEach(() => {
    const colLetter = getColumnLetter(excelCol)
    totalRowData.push({ formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` })
    excelCol++
  })

  // Add formulas for end columns (6 total: Misc Reimbursement, Advances/Loans, Misc Deductions, Benefits Total, Gross Pay, Net Pay)
  // excelCol now points to the first end column
  for (let i = 0; i < 6; i++) {
    const colLetter = getColumnLetter(excelCol + i)
    totalRowData.push({ formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` })
  }

  const totalRow = worksheet.addRow(totalRowData)

  // Style totals row
  totalRow.font = { bold: true }
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' }
  }

  // Format totals currency (all numeric columns starting at Basic Salary)
  const firstCurrencyColTotals = allHeaders.indexOf('Basic Salary') + 1
  for (let col = firstCurrencyColTotals; col <= totalColumns; col++) {
    const cell = totalRow.getCell(col)
    cell.numFmt = '#,##0.00'
    cell.alignment = { horizontal: 'right' }
  }

  // Add borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'medium' },
      bottom: { style: 'medium' },
      right: { style: 'medium' }
    }
  })

  // Add borders to totals
  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    }
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Generate yearly Excel workbook with one tab per month
 */
export async function generateYearlyPayrollExcel(
  year: number,
  periodsByMonth: Map<number, { period: PayrollPeriod; entries: PayrollEntry[] }>,
  businessName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'Business Management System'
  workbook.created = new Date()
  workbook.modified = new Date()

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  // Create a worksheet for each month that has data
  for (let month = 1; month <= 12; month++) {
    const monthData = periodsByMonth.get(month)
    if (!monthData) continue

    const { period, entries } = monthData
    const sheetName = monthNames[month - 1]
    const worksheet = workbook.addWorksheet(sheetName)

    // Add title
    worksheet.mergeCells('A1:O1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = `${businessName} - ${sheetName} ${year}`
    titleCell.font = { size: 14, bold: true }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    worksheet.addRow([])

    // Add headers
    const headerRow = worksheet.addRow([
      'ID Number', 'Employee Surname', 'Employee First Names', 'DOB', 'Date Engaged', 'Date Dismissed',
      'Basic Salary', 'Commission', 'Living Allowance', 'Vehicle - Reimbursement', 'Overtime',
      'Travel Allowance', 'Advances', 'Loans', 'Misc Deductions'
    ])

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // Set column widths
    worksheet.columns = [
      { width: 15 }, { width: 20 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 15 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ]

    // Add data
    entries.forEach((entry) => {
      const nameParts = entry.employeeName.split(' ')
      const firstName = nameParts.slice(0, -1).join(' ') || ''
      const surname = nameParts.slice(-1)[0] || ''

      const dataRow = worksheet.addRow([
        entry.nationalId,
        surname,
        firstName,
        entry.dateOfBirth ? formatDate(entry.dateOfBirth) : '',
        formatDate(entry.hireDate),
        entry.terminationDate ? formatDate(entry.terminationDate) : '',
        entry.baseSalary,
        entry.commission,
        entry.livingAllowance,
        entry.vehicleAllowance,
        entry.overtimePay,
        entry.travelAllowance,
        entry.advanceDeductions,
        entry.loanDeductions,
        entry.miscDeductions
      ])

      // Format currency
      const currencyColumns = [7, 8, 9, 10, 11, 12, 13, 14, 15]
      currencyColumns.forEach(col => {
        const cell = dataRow.getCell(col)
        cell.numFmt = '#,##0.00'
        cell.alignment = { horizontal: 'right' }
      })
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function getColumnLetter(columnNumber: number): string {
  let letter = ''
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    columnNumber = Math.floor((columnNumber - 1) / 26)
  }
  return letter
}
