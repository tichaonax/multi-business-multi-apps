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

  // Get unique benefits using server-provided mergedBenefits when available
  // Match the preview logic: include active merged benefits (regardless of amount)
  const normalizeName = (s?: string) => (s || '').normalize?.('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
  const uniqueBenefitsMap = new Map<string, { id: string, name: string }>()
  entries.forEach(entry => {
    // Prefer mergedBenefits from server if present
    const merged = (entry as any).mergedBenefits || []
    merged.forEach((mb: any) => {
      if (!mb) return
      if (mb.isActive === false) return
      const name = mb.benefitType?.name || mb.benefitName || mb.key || mb.name || ''
      const key = normalizeName(name)
      if (!key) return
      if (!uniqueBenefitsMap.has(key)) {
        const id = String(mb.benefitType?.id || mb.benefitTypeId || mb.benefitName || name)
        uniqueBenefitsMap.set(key, { id, name })
      }
    })

    // Fallback to contract benefits if merged not present
    const contractBenefits = (entry as any).contract?.pdfGenerationData?.benefits || []
    contractBenefits.forEach((cb: any) => {
      const name = cb.name || ''
      const key = normalizeName(name)
      if (!key) return
      if (!uniqueBenefitsMap.has(key)) {
        const benefitId = cb.benefitTypeId || cb.name
        uniqueBenefitsMap.set(key, { id: String(benefitId), name })
      }
    })

    // Finally include any manual payrollEntryBenefits that aren't already captured
    entry.payrollEntryBenefits?.forEach((benefit: any) => {
      if (!benefit.isActive) return
      const name = benefit.benefitName || ''
      const key = normalizeName(name)
      if (!key) return
      if (!uniqueBenefitsMap.has(key)) {
        const benefitId = benefit.benefitTypeId || benefit.benefitName
        uniqueBenefitsMap.set(key, { id: String(benefitId), name })
      }
    })
  })
  const uniqueBenefits = Array.from(uniqueBenefitsMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(b => ({ benefitTypeId: b.id, benefitName: b.name }))

  // Build dynamic header array
  // Align headers with the preview modal: include Employee ID and Adjustments
  const fixedHeaders = [
    'Company (Short)',
    'Employee ID',
    'ID Number',
    'DOB',
    'Surname',
    'First Names',
    'Job Title',
    'Work Days',
    'Sick Total',
    'Leave Total',
    'Absence Total',
    'Date Engaged',
    'Date Dismissed',
    'Basic Salary',
    'Commission',
    'Overtime',
    'Adjustments'
  ]
  const benefitHeaders = uniqueBenefits.map(b => b.benefitName)
  // End columns: match preview which uses a single Deductions column
  const endHeaders = [
    'Absence (unearned)',
    'Deductions',
    'Benefits Total',
    'Gross (incl Benefits)',
    'Net (incl Benefits)'
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

  // Style header row: bold, colored, and allow wrapping so long titles like "Company (Short)" wrap
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  // Double the header height so wrapped header text is visible
  headerRow.height = 72

  // Set column widths dynamically
  // Build column widths matching headers
  const columnWidths: number[] = []
  allHeaders.forEach((h) => {
    switch (h) {
      case 'Company (Short)': columnWidths.push(12); break
      case 'Employee ID': columnWidths.push(12); break
      case 'ID Number': columnWidths.push(15); break
      case 'DOB': columnWidths.push(12); break
      case 'Surname': columnWidths.push(18); break
      case 'First Names': columnWidths.push(20); break
      case 'Job Title': columnWidths.push(24); break
      case 'Work Days': columnWidths.push(10); break
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

  // Add data rows. Support entries that may already be grouped server-side. When
  // encountering a change in company shortName/name, insert a company header row
  // and after each group insert a subtotal row.
  let currentCompanyKey = null as string | null
  let groupStartRow = null as number | null
  let writtenRows = 0
  // Track subtotal row numbers so grand totals can sum subtotals (avoid double-counting)
  const subtotalRowNumbers: number[] = []
  const pushSubtotalForGroup = (companyKey: string | null, startRow: number | null, endRow: number) => {
    if (!companyKey || !startRow) return
    // Build subtotal row formulas for numeric columns (Basic Salary..Net)
    const subtotalRowData: any[] = []
    // Fill up to Basic Salary column with blanks (we'll put 'SUBTOTAL for <company>' in column 3)
    subtotalRowData.push('', '', `SUBTOTAL - ${companyKey}`)
    while (subtotalRowData.length < allHeaders.indexOf('Basic Salary')) subtotalRowData.push('')
    const baseSalaryIndex = allHeaders.indexOf('Basic Salary') + 1
    const commissionIndex = allHeaders.indexOf('Commission') + 1
    const overtimeIndex = allHeaders.indexOf('Overtime') + 1
    const firstCurrencyCol = baseSalaryIndex
    const lastCurrencyCol = totalColumns
    for (let col = firstCurrencyCol; col <= lastCurrencyCol; col++) {
      const colLetter = getColumnLetter(col)
      subtotalRowData.push({ formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})` })
    }
    const subtotalRow = worksheet.addRow(subtotalRowData)
    subtotalRow.font = { italic: true, bold: true }
    subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } }
    // format currency
    for (let col = firstCurrencyCol; col <= lastCurrencyCol; col++) {
      const cell = subtotalRow.getCell(col)
      cell.numFmt = '#,##0.00'
      cell.alignment = { horizontal: 'right' }
    }
    subtotalRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })
    writtenRows++
    // remember this subtotal row so grand totals can reference only subtotal cells
    if (subtotalRow && subtotalRow.number) subtotalRowNumbers.push(subtotalRow.number)
  }

  // Helper: short company label (hoisted so it can be used when inserting group headers)
  const makeShortCompanyLabel = (nameOrShort?: string | null) => {
    if (!nameOrShort) return ''
    const s = String(nameOrShort).trim()
    if (!s) return ''
    // Use explicit short-name if present and short-ish
    if (s.length <= 4 && !/\s/.test(s)) return s.toUpperCase()
    const parts = s.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const acronym = parts.map(p => p[0]).join('').toUpperCase()
      return acronym.slice(0, 4)
    }
    // Single-word company name: return up to 10 chars of the name (uppercased)
    return s.replace(/\s+/g, '').slice(0, 10)
  }

  entries.forEach((entry) => {
    // Determine company display key for this entry
    const companyDisplay = (entry as any).primaryBusiness && ((entry as any).primaryBusiness.shortName || (entry as any).primaryBusiness.name) ? ((entry as any).primaryBusiness.shortName || (entry as any).primaryBusiness.name) : (entry as any).contract?.pdfGenerationData?.businessName || ''
    const companyKey = String(companyDisplay || '').trim() || 'ZZZ'
    if (currentCompanyKey === null) {
      // first group
      currentCompanyKey = companyKey
      // Insert a blank row before the group header
      worksheet.addRow([])
      // Insert a company header row with shortName (bold) + full business name (normal)
      const businessFull = (entry as any).primaryBusiness?.name || (entry as any).contract?.pdfGenerationData?.businessName || businessName || ''
      const shortLabel = makeShortCompanyLabel((entry as any).primaryBusiness?.shortName || businessFull)
      const headerRow = worksheet.addRow([])
      const headerCell = headerRow.getCell(1)
      if (shortLabel && businessFull && shortLabel.toLowerCase() !== businessFull.toLowerCase()) {
        headerCell.value = { richText: [ { text: String(shortLabel) + ' ', font: { bold: true } }, { text: String(businessFull), font: { bold: false } } ] }
      } else {
        const textVal = shortLabel || businessFull || ''
        headerCell.value = { richText: [ { text: String(textVal), font: { bold: Boolean(shortLabel) } } ] }
      }
      headerRow.alignment = { horizontal: 'left' }
      // merge header across full width
      worksheet.mergeCells(`A${headerRow.number}:${getColumnLetter(totalColumns)}${headerRow.number}`)
      writtenRows++
      groupStartRow = headerRow.number + 1
    } else if (companyKey !== currentCompanyKey) {
      // close previous group with subtotal using rows: groupStartRow .. last data row
      const lastDataRow = worksheet.lastRow ? worksheet.lastRow.number : null
      if (groupStartRow && lastDataRow && lastDataRow >= groupStartRow) {
        pushSubtotalForGroup(currentCompanyKey, groupStartRow, lastDataRow)
      }
      // start new group
      currentCompanyKey = companyKey
      // insert blank line then formatted header
      worksheet.addRow([])
      const businessFull = (entry as any).primaryBusiness?.name || (entry as any).contract?.pdfGenerationData?.businessName || businessName || ''
      const shortLabel = makeShortCompanyLabel((entry as any).primaryBusiness?.shortName || businessFull)
      const headerRow = worksheet.addRow([])
      const headerCell = headerRow.getCell(1)
      if (shortLabel && businessFull && shortLabel.toLowerCase() !== businessFull.toLowerCase()) {
        headerCell.value = { richText: [ { text: String(shortLabel) + ' ', font: { bold: true } }, { text: String(businessFull), font: { bold: false } } ] }
      } else {
        const textVal = shortLabel || businessFull || ''
        headerCell.value = { richText: [ { text: String(textVal), font: { bold: Boolean(shortLabel) } } ] }
      }
      headerRow.alignment = { horizontal: 'left' }
      worksheet.mergeCells(`A${headerRow.number}:${getColumnLetter(totalColumns)}${headerRow.number}`)
      writtenRows++
      groupStartRow = headerRow.number + 1
    }
    // Prefer first/last name from the Employee table if available; otherwise fall back to entry-level fields or split employeeName
    let firstName = ''
    let surname = ''
    if ((entry as any).employee && ((entry as any).employee.firstName || (entry as any).employee.lastName)) {
      firstName = (entry as any).employee.firstName || ''
      surname = (entry as any).employee.lastName || ''
    } else if ((entry as any).employeeFirstName || (entry as any).employeeLastName) {
      firstName = (entry as any).employeeFirstName || ''
      surname = (entry as any).employeeLastName || ''
    } else {
      const name = (entry as any).employeeName || ''
      const nameParts = name ? String(name).trim().split(/\s+/) : []
      if (nameParts.length === 1) {
        firstName = nameParts[0]
        surname = ''
      } else {
        surname = nameParts.slice(-1)[0] || ''
        firstName = nameParts.slice(0, -1).join(' ')
      }
    }

    // use hoisted makeShortCompanyLabel above

    // Resolve benefits total like preview: prefer server-provided totalBenefitsAmount/benefitsTotal
    const serverBenefitsTotalRaw = (entry as any).totalBenefitsAmount ?? (entry as any).benefitsTotal
    const resolveBenefitsTotal = () => {
      if (serverBenefitsTotalRaw !== undefined && serverBenefitsTotalRaw !== null) return Number(serverBenefitsTotalRaw)
      const merged = (entry as any).mergedBenefits || []
      if (Array.isArray(merged) && merged.length > 0) return merged.filter((mb: any) => mb.isActive !== false).reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
      if (Array.isArray(entry.payrollEntryBenefits) && entry.payrollEntryBenefits.length > 0) return entry.payrollEntryBenefits.filter((b: any) => b.isActive).reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
      const contractBenefits = (entry as any).contract?.pdfGenerationData?.benefits || []
      if (Array.isArray(contractBenefits) && contractBenefits.length > 0) return contractBenefits.reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
      return 0
    }

    // Resolve absence deduction (prefer stored absenceDeduction/absenceAmount, otherwise pro-rate)
    const parseFraction = (v: any) => {
      if (v === undefined || v === null) return 0
      const s = String(v).trim()
      if (!s) return 0
      if (s.includes('/')) {
        const [num, den] = s.split('/').map(p => Number(p))
        if (!den || isNaN(num) || isNaN(den)) return 0
        return num / den
      }
      const n = Number(s)
      return isNaN(n) ? 0 : n
    }

    const resolveAbsenceDeduction = (periodParam: any) => {
      try {
        // stored explicit absence deduction (take precedence)
        const stored = Number((entry as any).absenceDeduction ?? (entry as any).absenceAmount ?? 0)
        if (stored && stored !== 0) return stored

        // compute total absence days including fractional component when provided
        const baseAbsence = Number((entry as any).cumulativeAbsenceDays ?? (entry as any).absenceDays ?? 0)
        const fraction = parseFraction((entry as any).absenceFraction ?? (entry as any).absenceFractionDays ?? 0)
        const totalAbsenceDays = (baseAbsence || 0) + (fraction || 0)
        if (!totalAbsenceDays || totalAbsenceDays <= 0) return 0

        const baseSalary = Number(entry.baseSalary || 0)
        const d = new Date(periodParam.periodStart)
        const month = Number((d.getMonth ? d.getMonth() : (new Date()).getMonth()) + 1)
        const year = Number(d.getFullYear ? d.getFullYear() : (new Date()).getFullYear())
        const daysInMonth = new Date(year, month, 0).getDate()
        let cnt = 0
        for (let dd = 1; dd <= daysInMonth; dd++) {
          const dt = new Date(year, month - 1, dd)
          const day = dt.getDay()
          // Count Monday-Saturday as working days (exclude Sundays only)
          if (day !== 0) cnt++
        }
        const workingDaysLocal = cnt || 22
        const perDay = workingDaysLocal > 0 ? (baseSalary / workingDaysLocal) : 0
        const deduction = perDay * totalAbsenceDays
        return Number(deduction || 0)
      } catch (e) { return 0 }
    }

    // Build row data array
    // Determine primary company name: prefer contract-level company name, then employee primary business
  const companyCandidate = (entry as any).contract?.pdfGenerationData?.businessName || (entry as any).contract?.companyName || (entry as any).employee?.primaryBusiness?.name || (entry as any).primaryBusiness?.name || (entry as any).employee?.primaryBusiness?.shortName || (entry as any).primaryBusiness?.shortName || businessName
    const rowData = [
      // company short label - prefer contract / employee primary business, fallback to provided business name
      makeShortCompanyLabel(companyCandidate || ''),
      // Employee ID (employeeNumber)
      (entry as any).employeeNumber || '',
      entry.nationalId,
      // Prefer employeeDateOfBirth if present (string/Date), otherwise entry.dateOfBirth
      (entry as any).employeeDateOfBirth ? formatDate((entry as any).employeeDateOfBirth) : (entry.dateOfBirth ? formatDate(entry.dateOfBirth) : ''),
  surname,
  firstName,
  // Job Title (prefer server-provided fields). Add common alternate keys as fallbacks.
  (() => {
    // Job title preference order:
    // 1. Most recent/active contract's pdfGenerationData.jobTitle or contract.jobTitle
    // 2. entry.jobTitle / entry.jobTitleName
    // 3. employee.jobTitles.title (employee table)
    // 4. other common alternate keys
    const contractTitle = (entry as any).contract?.pdfGenerationData?.jobTitle || (entry as any).contract?.jobTitle
    if (contractTitle) return contractTitle
    return (entry as any).jobTitle || (entry as any).jobTitleName || (entry as any).employeeJobTitle || (entry as any).employee?.jobTitles?.title || (entry as any)['job_title'] || (entry as any)['jobTitleName'] || ''
  })(),
  // Work Days and cumulative counts prefer server-provided values (including zero). Accept alternate field names and compute a default when missing.
  (() => {
    const candidates = [
      entry.workDays,
      (entry as any).workDays,
      (entry as any).days,
      (entry as any).daysWorked,
      (entry as any).work_days
    ]
    for (const c of candidates) {
      if (c !== undefined && c !== null) return Number(c)
    }
    try {
      const d = new Date(period.periodStart)
      const month = Number((d.getMonth ? d.getMonth() : (new Date()).getMonth()) + 1)
      const year = Number(d.getFullYear ? d.getFullYear() : (new Date()).getFullYear())
      const daysInMonth = new Date(year, month, 0).getDate()
      let cnt = 0
      for (let dd = 1; dd <= daysInMonth; dd++) {
        const dt = new Date(year, month - 1, dd)
        const day = dt.getDay()
        // Count Monday-Saturday as working days (exclude Sundays only)
        if (day !== 0) cnt++
      }
      return cnt
    } catch (e) { return 22 }
  })(),
  (entry as any).cumulativeSickDays ?? (entry as any).sickDays ?? 0,
  (entry as any).cumulativeLeaveDays ?? (entry as any).leaveDays ?? 0,
  // Show fractional absence days when an absenceFraction is provided. Store numeric decimal so it can be summed.
  (() => {
    const baseAbs = Number((entry as any).cumulativeAbsenceDays ?? (entry as any).absenceDays ?? 0)
    const frac = parseFraction((entry as any).absenceFraction ?? (entry as any).absenceFractionDays ?? 0)
    const total = (baseAbs || 0) + (frac || 0)
    // If the value is whole number, return integer, otherwise return decimal with up to 2 decimals
    return Number.isInteger(total) ? total : Math.round(total * 100) / 100
  })(),
      // Prefer employeeHireDate (contract start) when present
      (entry as any).employeeHireDate ? formatDate((entry as any).employeeHireDate) : formatDate(entry.hireDate),
      entry.terminationDate ? formatDate(entry.terminationDate) : '',
      Number(entry.baseSalary || 0),
      Number(entry.commission || 0),
      Number(entry.overtimePay || 0),
      Number((entry as any).adjustmentsTotal || 0)
    ]

    // Add benefit values from merged/contract with manual overrides
    let benefitsSum = 0
    uniqueBenefits.forEach(uniqueBenefit => {
      // Prefer mergedBenefits value when available
      const mb = (entry as any).mergedBenefits || []
      const normalizedKey = normalizeName(uniqueBenefit.benefitName)
      const mergedVal = mb.find((m: any) => normalizeName(m?.benefitType?.name || m?.benefitName || m?.key || m?.name || '') === normalizedKey && m?.isActive !== false)

      // Fallback to contract
      const contractBenefits = (entry as any).contract?.pdfGenerationData?.benefits || []
      const contractBenefit = contractBenefits.find((cb: any) => normalizeName(cb.name || '') === normalizedKey)

    // Manual entry override
      const manualOverride = entry.payrollEntryBenefits?.find((pb: any) => normalizeName(pb.benefitName || '') === normalizedKey && pb.isActive)

      const deactivated = entry.payrollEntryBenefits?.find((pb: any) => normalizeName(pb.benefitName || '') === normalizedKey && pb.isActive === false)

      const amount = deactivated ? null : (mergedVal?.amount ?? manualOverride?.amount ?? contractBenefit?.amount ?? 0)

      if (typeof amount === 'number') benefitsSum += Number(amount || 0)
      rowData.push(typeof amount === 'number' ? amount : '')
    })

    // Add end columns
  const advancesLoans = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0)
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
    const storedAbsenceDeduction = Number(((entry as any).absenceDeduction ?? (entry as any).absenceAmount) || 0)
    const adjAsDeductions = Math.max(0, storedAdjAs - storedAbsenceDeduction)
    // Compute gross/net/totalDeductions aligned with preview logic
    const absenceDeductionResolved = resolveAbsenceDeduction(period)
    const computedGross = Number(entry.baseSalary || 0) + Number(entry.commission || 0) + Number(entry.overtimePay || 0) + benefitsSum + additions - (absenceDeductionResolved || 0)
    const grossInclBenefits = Number.isFinite(storedGross as number) ? (storedGross as number) : computedGross

    // Derived total deductions excludes explicit 'absence' so it aligns with the preview
    const derivedTotalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0) + adjAsDeductions
    const serverTotalDeductionsVal = (entry.totalDeductions !== undefined && entry.totalDeductions !== null) ? Number(entry.totalDeductions) : null
    // Preview prefers the derived total when it differs from server-provided aggregated total
    const totalDeductions = (serverTotalDeductionsVal !== derivedTotalDeductions && derivedTotalDeductions !== 0) ? derivedTotalDeductions : (serverTotalDeductionsVal ?? derivedTotalDeductions)

    // For export/preview, Net (incl Benefits) should be the gross amount (third-party will apply deductions).
    // For export/preview, Net (incl Benefits) must exclude the Absence (unearned) amount.
    // Compute Net as Gross (incl Benefits) minus the resolved absence deduction so Absence is shown separately.
    // We deliberately ignore any stored net value here to ensure the exported Net matches the preview rule.
    const netInclBenefits = (grossInclBenefits - (absenceDeductionResolved || 0))

    // Compute absence/unearned value: prefer stored/persisted absenceDeduction, otherwise compute per-day using cumulativeAbsenceDays
  // Use resolved absence deduction (positive number). For display in Excel match preview which shows a negative value
  const absenceDeduction = resolveAbsenceDeduction(period)
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
          // Count Monday-Saturday as working days (exclude Sundays only)
          if (day !== 0) cnt++
        }
        return cnt
      } catch (e) { return 22 }
    })()
    const perDay = workingDays > 0 ? (Number(entry.baseSalary || 0) / workingDays) : 0
    const computedAbsence = absenceDeduction && absenceDeduction !== 0 ? absenceDeduction : (perDay * absenceDays)

    // Deductions: combine advances/loans/misc + adjustments-as-deductions (adjAsDeductions computed earlier)
    const misc = Number(entry.miscDeductions || 0)
    const deductions = advancesLoans + misc + adjAsDeductions

    // Prefer server-provided totalBenefitsAmount when present for the Benefits Total column
    const serverBenefitsTotal = serverBenefitsTotalRaw !== undefined && serverBenefitsTotalRaw !== null ? Number(serverBenefitsTotalRaw) : undefined
    const benefitsTotalForExport = serverBenefitsTotal !== undefined ? serverBenefitsTotal : benefitsSum

    rowData.push(
        // Absence as negative (match preview display)
        computedAbsence && computedAbsence !== 0 ? -Math.abs(Number(computedAbsence)) : 0,
        totalDeductions,
        benefitsTotalForExport,
        grossInclBenefits,
        netInclBenefits
      )

  const dataRow = worksheet.addRow(rowData)

      // Format Adjustments column as signed currency (find its index dynamically)
      const adjustmentsIndex = allHeaders.indexOf('Adjustments') + 1
      if (adjustmentsIndex > 0) {
        const adjCell = dataRow.getCell(adjustmentsIndex)
        if (adjCell.value !== '' && adjCell.value !== null && adjCell.value !== undefined) {
          adjCell.numFmt = '"+"#,##0.00;\"-\"#,##0.00' // show explicit +/ - sign
        }
        adjCell.alignment = { horizontal: 'right' }
      }

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
      // Color deduction columns red and Net column green
      const header = allHeaders[col - 1] || ''
      if (/deduct/i.test(header) || /absence/i.test(header)) {
        cell.font = { color: { argb: 'FFFF0000' } } // red
      }
      if (header === 'Net (incl Benefits)') {
        cell.font = { color: { argb: 'FF008000' } } // green
      }
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

  // Close final group with subtotal if present
  try {
    const lastDataRow = worksheet.lastRow ? worksheet.lastRow.number : null
    if (groupStartRow && lastDataRow && lastDataRow >= groupStartRow) {
      pushSubtotalForGroup(currentCompanyKey, groupStartRow, lastDataRow)
    }
  } catch (e) { /* ignore */ }

  // Add totals row (grand totals). Data rows start after title/period/blank/header rows.
  // We need to compute the dataStartRow accounting for inserted header and subtotal rows. Assume
  // title(1), period(1), blank(1), header(1) => data begins at row 5 as before.
  const dataStartRow = 5
  // dataEndRow should be last row before the final subtotals/grand total row
  const dataEndRow = worksheet.lastRow ? worksheet.lastRow.number : (4 + entries.length)
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
  // Helper to create SUM formula. If subtotal rows exist, sum only subtotal cells to avoid double-counting.
  const makeSumFormula = (colLetter: string) => {
    if (subtotalRowNumbers.length > 0) {
      return `SUM(${subtotalRowNumbers.map(r => `${colLetter}${r}`).join(',')})`
    }
    return `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`
  }

  totalRowData.push(
    { formula: makeSumFormula(baseSalaryCol) },
    { formula: makeSumFormula(commissionCol) },
    { formula: makeSumFormula(overtimeCol) }
  )

  // Add formulas for each benefit column
  // After pushing Basic Salary, Commission, Overtime, we're now at the benefit columns
  let excelCol = overtimeIndex + 1
  uniqueBenefits.forEach(() => {
    const colLetter = getColumnLetter(excelCol)
    totalRowData.push({ formula: makeSumFormula(colLetter) })
    excelCol++
  })

  // Add formulas for end columns (6 total: Misc Reimbursement, Advances/Loans, Misc Deductions, Benefits Total, Gross Pay, Net Pay)
  // excelCol now points to the first end column
  for (let i = 0; i < 6; i++) {
    const colLetter = getColumnLetter(excelCol + i)
    totalRowData.push({ formula: makeSumFormula(colLetter) })
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
      // Use signed format for Adjustments column specifically
      const header = allHeaders[col - 1]
      if (header === 'Adjustments') {
        cell.numFmt = '"+"#,##0.00;\"-\"#,##0.00'
      } else {
        cell.numFmt = '#,##0.00'
      }
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
      const nameParts = entry.employeeName ? entry.employeeName.split(' ') : []
      const firstName = nameParts.length > 0 ? nameParts.slice(0, -1).join(' ') : ''
      const surname = nameParts.length > 0 ? nameParts.slice(-1)[0] : ''

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
