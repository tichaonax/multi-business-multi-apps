const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      process.env[key] = val
    }
  } catch (e) {
    // ignore
  }
}

// load config/service.env if present
loadEnvFile(path.join(__dirname, '..', 'config', 'service.env'))

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(payrollPeriodId) {
  if (!payrollPeriodId) {
    console.error('Usage: node scripts/regenerate-export-local.js <payrollPeriodId>')
    process.exit(1)
  }

  const period = await prisma.payrollPeriod.findUnique({
    where: { id: payrollPeriodId },
    include: {
      business: { select: { name: true } },
      payrollEntries: {
        include: {
          payrollEntryBenefits: { include: { benefitType: { select: { id: true, name: true } } } },
          employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, fullName: true, nationalId: true, jobTitles: { select: { title: true } } } }
        }
      }
    }
  })

  if (!period) {
    console.error('Payroll period not found')
    process.exit(1)
  }

  // attempt to load generator and helper
  // Simple inline generator using exceljs to avoid importing TypeScript modules
  const ExcelJS = require('exceljs')

  const enrichedEntries = []
  for (const entry of period.payrollEntries) {
    // simple merged benefits: group payrollEntryBenefits by benefitName and sum amounts
    const mergedMap = new Map()
    for (const b of (entry.payrollEntryBenefits || [])) {
      if (!b || b.isActive === false) continue
      const name = b.benefitName || (b.benefitType && b.benefitType.name) || 'Unknown'
      const prev = mergedMap.get(name) || 0
      mergedMap.set(name, prev + Number(b.amount || 0))
    }
    const merged = Array.from(mergedMap.entries()).map(([name, amount]) => ({ benefitName: name, amount }))
    const totalBenefits = merged.reduce((s, m) => s + Number(m.amount || 0), 0)

    enrichedEntries.push(Object.assign({}, entry, {
      payrollEntryBenefits: entry.payrollEntryBenefits || [],
      mergedBenefits: merged,
      totalBenefitsAmount: Number(totalBenefits || 0),
      grossPay: Number(entry.grossPay || 0),
      netPay: Number(entry.netPay || 0)
    }))
  }

  // Attach latest contracts for employees so we can set jobTitle from contract (last active)
  const employeeIds = Array.from(new Set(enrichedEntries.map(e => e.employeeId).filter(Boolean)))
  let latestContractByEmployee = {}
  if (employeeIds.length > 0) {
    // pdfGenerationData is a scalar JSON field on EmployeeContract, not a relation.
    // Use select to retrieve scalar fields instead of include.
    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: { startDate: 'desc' },
    select: { id: true, employeeId: true, pdfGenerationData: true, startDate: true, endDate: true, jobTitles: { select: { title: true } } }
    })
    for (const c of contracts) {
      if (!latestContractByEmployee[c.employeeId]) latestContractByEmployee[c.employeeId] = c
    }
  }

  for (const ee of enrichedEntries) {
    ee.contract = ee.employeeId ? latestContractByEmployee[ee.employeeId] || null : null
    // resolve jobTitle: prefer contract.pdfGenerationData.jobTitle, then contract.jobTitle, then first employee.jobTitles entry
    ee.jobTitle = (ee.contract && ee.contract.pdfGenerationData && ee.contract.pdfGenerationData.jobTitle) || (ee.contract && ee.contract.jobTitles && ee.contract.jobTitles.title) || (ee.employee && ee.employee.jobTitles && ee.employee.jobTitles.title) || ee.jobTitle || ''
  }

  // Build excelRows same shape used by generator
  const excelRows = enrichedEntries.map(entry => ({
    employeeNumber: entry.employeeNumber,
    employeeName: entry.employeeName,
    nationalId: entry.nationalId,
    cumulativeSickDays: entry.cumulativeSickDays ?? entry.sickDays ?? 0,
    cumulativeLeaveDays: entry.cumulativeLeaveDays ?? entry.leaveDays ?? 0,
    cumulativeAbsenceDays: entry.cumulativeAbsenceDays ?? entry.absenceDays ?? 0,
    adjustmentsTotal: Number(entry.adjustmentsTotal || 0),
    adjustmentsAsDeductions: Number(entry.adjustmentsAsDeductions || 0),
    absenceFraction: entry.absenceFraction ?? entry.absenceFractionDays ?? null,
    dateOfBirth: entry.dateOfBirth,
    hireDate: entry.hireDate,
    terminationDate: entry.terminationDate,
    workDays: entry.workDays,
    baseSalary: Number(entry.baseSalary || 0),
    commission: Number(entry.commission || 0),
    overtimePay: Number(entry.overtimePay || 0),
    advanceDeductions: Number(entry.advanceDeductions || 0),
    loanDeductions: Number(entry.loanDeductions || 0),
    miscDeductions: Number(entry.miscDeductions || 0),
    grossPay: Number(entry.grossPay || 0),
    totalDeductions: Number(entry.totalDeductions || 0),
    netPay: Number(entry.netPay || 0),
    mergedBenefits: entry.mergedBenefits || [],
    totalBenefitsAmount: Number(entry.totalBenefitsAmount || 0),
    payrollEntryBenefits: (entry.payrollEntryBenefits || []).map((b) => ({ id: b.id, benefitTypeId: b.benefitTypeId, benefitName: b.benefitName, amount: Number(b.amount || 0), isActive: b.isActive })),
    contract: entry.contract || null,
    employee: entry.employee || null,
    jobTitle: entry.jobTitle || ''
  }))

  // write debug JSON like the server regenerate route does
  try {
    const debugDir = path.join(process.cwd(), 'public', 'exports', 'payroll')
    fs.mkdirSync(debugDir, { recursive: true })
    const debugFileName = `debug_${payrollPeriodId}_${Date.now()}.json`
    const debugPath = path.join(debugDir, debugFileName)
    const debugObj = { payrollPeriodId, enrichedEntries, excelRows }
    fs.writeFileSync(debugPath, JSON.stringify(debugObj, null, 2), 'utf8')
    console.log('Wrote debug file:', debugPath)
  } catch (e) {
    console.warn('Failed to write debug file locally:', e)
  }

  // Build Excel file using exceljs with full headers (Adjustments and Absence handling)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Payroll')

  const headers = [
    'Company (Short)', 'Employee ID', 'ID Number', 'DOB', 'Surname', 'First Names', 'Job Title', 'Work Days',
    'Sick Total', 'Leave Total', 'Absence Total', 'Date Engaged', 'Date Dismissed', 'Basic Salary', 'Commission', 'Overtime', 'Adjustments',
    'Absence (unearned)', 'Deductions', 'Benefits Total', 'Gross (incl Benefits)', 'Net (incl Benefits)'
  ]

  sheet.addRow(headers)

  const parseFraction = (v) => {
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

  const makeShortCompanyLabel = (nameOrShort) => {
    if (!nameOrShort) return ''
    const s = String(nameOrShort).trim()
    if (!s) return ''
    if (s.length <= 4 && !/\s/.test(s)) return s.toUpperCase()
    const parts = s.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const acronym = parts.map(p => p[0]).join('').toUpperCase()
      return acronym.slice(0, 4)
    }
    return s.replace(/\s+/g, '').toUpperCase().slice(0, 4)
  }
  // New behavior: prefer contract or employee primary business name; if single-word name, return up to 10 chars
  const makeShortCompanyLabelBetter = (nameOrShort) => {
    if (!nameOrShort) return ''
    const s = String(nameOrShort).trim()
    if (!s) return ''
    if (s.length <= 4 && !/\s/.test(s)) return s.toUpperCase()
    const parts = s.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const acronym = parts.map(p => p[0]).join('').toUpperCase()
      return acronym.slice(0, 4)
    }
    return s.replace(/\s+/g, '').slice(0, 10)
  }

  const countWorkingDays = (periodStart) => {
    try {
      const d = new Date(periodStart)
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
      return cnt || 22
    } catch (e) { return 22 }
  }

  for (const e of enrichedEntries) {
    const surname = e.employee && (e.employee.lastName || '')
    const firstNames = e.employee && (e.employee.firstName || '')
    const jobTitle = (e.contract && e.contract.pdfGenerationData && e.contract.pdfGenerationData.jobTitle) || e.jobTitle || (e.employee && e.employee.jobTitles && e.employee.jobTitles.title) || ''

    const totalBenefits = Number(e.totalBenefitsAmount || 0)

    const baseSalary = Number(e.baseSalary || 0)
    const commission = Number(e.commission || 0)
    const overtime = Number(e.overtimePay || 0)

    // adjustments
    const adjustments = Number(e.adjustmentsTotal || 0)

    // absence fractional calculation
    const baseAbs = Number(e.cumulativeAbsenceDays ?? e.absenceDays ?? 0)
    const frac = parseFraction(e.absenceFraction ?? e.absenceFractionDays ?? 0)
    const totalAbsenceDays = (baseAbs || 0) + (frac || 0)
    const workingDays = countWorkingDays(period.periodStart || new Date())
    const perDay = workingDays > 0 ? (baseSalary / workingDays) : 0
    const absenceDeduction = perDay * totalAbsenceDays

    const advancesLoans = Number(e.advanceDeductions || 0) + Number(e.loanDeductions || 0)
    const misc = Number(e.miscDeductions || 0)
    // adjustmentsAsDeductions may include absence - align with preview and existing total logic
    const adjAsDeductions = Math.max(0, Number(e.adjustmentsAsDeductions || 0) - Number(e.absenceDeduction || 0))
    const deductions = advancesLoans + misc + adjAsDeductions

    // gross and net - prefer provided but fall back to computed
  const gross = Number(e.grossPay || (baseSalary + commission + overtime + totalBenefits + adjustments - absenceDeduction))
  // Compute Net as Gross minus the Absence (unearned) amount to match export preview rules
  const net = Number((gross - (absenceDeduction || 0)))

  const companyCandidate = (e.contract && e.contract.pdfGenerationData && e.contract.pdfGenerationData.businessName) || (e.contract && e.contract.companyName) || (e.employee && e.employee.primaryBusiness && (e.employee.primaryBusiness.name || e.employee.primaryBusiness.shortName)) || (period && period.business && (period.business.name || period.business.shortName)) || ''
  const companyShort = makeShortCompanyLabelBetter(companyCandidate)
    const row = [
      // company short - prefer umbrella/period-level short name
      companyShort,
      e.employeeNumber || '',
      e.nationalId || '',
      e.dateOfBirth ? new Date(e.dateOfBirth) : '',
      surname || '',
      firstNames || '',
      jobTitle || '',
      Number(e.workDays || 0),
      Number(e.cumulativeSickDays ?? e.sickDays ?? 0),
      Number(e.cumulativeLeaveDays ?? e.leaveDays ?? 0),
      totalAbsenceDays ? (Number.isInteger(totalAbsenceDays) ? totalAbsenceDays : Math.round(totalAbsenceDays*100)/100) : 0,
      e.hireDate ? new Date(e.hireDate) : '',
      e.terminationDate ? new Date(e.terminationDate) : '',
      baseSalary,
      commission,
      overtime,
      adjustments,
      // Absence (unearned) as negative
      absenceDeduction && absenceDeduction !== 0 ? -Math.abs(absenceDeduction) : 0,
      deductions,
      totalBenefits,
      gross,
      net
    ]

    const added = sheet.addRow(row)
    // Format numeric currency columns (Basic Salary at index 14 -> 1-based)
    const firstCurrency = 14
    for (let c = firstCurrency; c <= headers.length; c++) {
      const cell = added.getCell(c)
      if (cell.value !== '' && cell.value !== null && cell.value !== undefined) {
        cell.numFmt = '#,##0.00'
        cell.alignment = { horizontal: 'right' }
      }
    }
    // Format Adjustments column as signed currency (17th column)
    try {
      const adjCell = added.getCell(headers.indexOf('Adjustments') + 1)
      if (adjCell) adjCell.numFmt = '"+"#,##0.00;"-"#,##0.00'
    } catch (e) { }
  }

  const buffer = await workbook.xlsx.writeBuffer()

  const exportsDir = path.join(process.cwd(), 'public', 'exports', 'payroll')
  fs.mkdirSync(exportsDir, { recursive: true })
  const fileName = `local_Regenerated_${period.year}_${String(period.month).padStart(2,'0')}_${Date.now()}.xlsx`
  const filePath = path.join(exportsDir, fileName)
  fs.writeFileSync(filePath, buffer)
  console.log('Wrote file:', filePath)

  // Try to update the latest existing payrollExport for this period. If none exists, skip DB update.
  try {
    const existing = await prisma.payrollExport.findFirst({ where: { payrollPeriodId }, orderBy: { exportedAt: 'desc' } })
    if (existing) {
      const updated = await prisma.payrollExport.update({ where: { id: existing.id }, data: { fileName, fileUrl: `/exports/payroll/${fileName}`, fileSize: buffer.length, exportedAt: new Date() } })
      console.log('Updated payrollExport id:', updated.id)
    } else {
      console.warn('No existing payrollExport found for period; skipping DB update.')
    }
  } catch (e) {
    console.error('Failed to update payrollExport record:', e)
  } finally {
    await prisma.$disconnect()
  }
}

const id = process.argv[2]
run(id).catch(err => { console.error(err); process.exit(1) })
