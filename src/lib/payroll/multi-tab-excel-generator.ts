/**
 * Multi-Tab Excel Generator for Year-to-Date Payroll Exports
 *
 * This module generates Excel workbooks with multiple tabs (one per month),
 * allowing users to export cumulative year-to-date payroll data where each
 * new month's export includes all previous months as separate tabs.
 *
 * Features:
 * - January export: 1 tab
 * - February export: 2 tabs (Jan + Feb)
 * - March export: 3 tabs (Jan + Feb + Mar)
 * - ...up to 12 tabs for December
 *
 * Regenerated tabs use contract snapshots for historical accuracy
 */

import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'
import { restoreContractFromSnapshot, validateContractSnapshot } from '@/lib/payroll/contract-snapshot'

export interface TabPeriodData {
  period: {
    id: string
    year: number
    month: number
    periodStart: Date
    periodEnd: Date
    status: string
  }
  entries: any[]
  isRegenerated: boolean // true for past periods, false for current month
}

/**
 * Generates a multi-tab Excel workbook with one sheet per payroll period
 * Each tab contains the full payroll data for that month
 */
export async function generateMultiTabPayrollExcel(
  tabs: TabPeriodData[],
  businessName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // Set workbook properties
  workbook.creator = 'Multi-Business Payroll System'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.lastPrinted = new Date()

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  // Create one worksheet per period
  for (const tab of tabs) {
    const monthName = monthNames[tab.period.month - 1]
    const sheetName = `${monthName} ${tab.period.year}`

    const worksheet = workbook.addWorksheet(sheetName, {
      properties: { tabColor: { argb: tab.isRegenerated ? 'FF999999' : 'FF4472C4' } }
    })

    // Populate sheet with payroll data
    await populateWorksheet(worksheet, tab, businessName)
  }

  // Generate buffer
  return await workbook.xlsx.writeBuffer() as Buffer
}

/**
 * Populates a worksheet with payroll data for a single period
 * Handles both current month exports and regenerated historical data
 */
async function populateWorksheet(
  worksheet: ExcelJS.Worksheet,
  tabData: TabPeriodData,
  businessName: string
) {
  const { period, entries, isRegenerated } = tabData

  // Add header section
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = monthNames[period.month - 1]

  // Title rows
  worksheet.mergeCells('A1:P1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = businessName
  titleCell.font = { name: 'Calibri', size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  worksheet.getRow(1).height = 30

  worksheet.mergeCells('A2:P2')
  const subtitleCell = worksheet.getCell('A2')
  subtitleCell.value = `Payroll Report - ${monthName} ${period.year}${isRegenerated ? ' (Regenerated)' : ''}`
  subtitleCell.font = { name: 'Calibri', size: 12, bold: true }
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
  worksheet.getRow(2).height = 25

  // Period info
  worksheet.getCell('A3').value = 'Period:'
  worksheet.getCell('B3').value = `${period.periodStart.toISOString().split('T')[0]} to ${period.periodEnd.toISOString().split('T')[0]}`
  worksheet.getCell('A3').font = { bold: true }

  // Add regeneration notice if applicable
  if (isRegenerated) {
    worksheet.mergeCells('A4:P4')
    const noticeCell = worksheet.getCell('A4')
    noticeCell.value = 'NOTE: This is a regenerated historical payroll using contract snapshots from the original period creation date.'
    noticeCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF808080' } }
    noticeCell.alignment = { horizontal: 'center' }
  }

  // Column headers
  const headerRow = isRegenerated ? 6 : 5
  const headers = [
    { key: 'employeeNumber', header: 'Emp #', width: 10 },
    { key: 'employeeName', header: 'Employee Name', width: 25 },
    { key: 'nationalId', header: 'National ID', width: 15 },
    { key: 'jobTitle', header: 'Job Title', width: 20 },
    { key: 'workDays', header: 'Work Days', width: 10 },
    { key: 'baseSalary', header: 'Base Salary', width: 12 },
    { key: 'benefits', header: 'Benefits', width: 12 },
    { key: 'commission', header: 'Commission', width: 12 },
    { key: 'overtime', header: 'Overtime', width: 12 },
    { key: 'adjustments', header: 'Adjustments', width: 12 },
    { key: 'grossPay', header: 'Gross Pay', width: 12 },
    { key: 'advances', header: 'Advances', width: 12 },
    { key: 'loans', header: 'Loans', width: 12 },
    { key: 'deductions', header: 'Other Deductions', width: 12 },
    { key: 'totalDeductions', header: 'Total Deductions', width: 14 },
    { key: 'netPay', header: 'Net Pay', width: 14 }
  ]

  const headerRowObj = worksheet.getRow(headerRow)
  headers.forEach((col, index) => {
    const cell = headerRowObj.getCell(index + 1)
    cell.value = col.header
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
    worksheet.getColumn(index + 1).width = col.width
  })
  headerRowObj.height = 20

  // Data rows
  let rowIndex = headerRow + 1
  let totalGross = 0
  let totalNet = 0
  let totalDeductions = 0

  for (const entry of entries) {
    const row = worksheet.getRow(rowIndex)

    // Extract values
    const employeeNumber = entry.employeeNumber || ''
    const employeeName = entry.employeeFullName || entry.employeeName || ''
    const nationalId = entry.nationalId || ''
    const jobTitle = entry.jobTitle || ''
    const workDays = Number(entry.workDays || 0)
    const baseSalary = Number(entry.baseSalary || 0)
    const benefits = Number(entry.totalBenefitsAmount || 0)
    const commission = Number(entry.commission || 0)
    const overtime = Number(entry.overtimePay || 0)
    const adjustments = Number(entry.adjustmentsTotal || 0)
    const grossPay = Number(entry.grossPay || 0)
    const advances = Number(entry.advanceDeductions || 0)
    const loans = Number(entry.loanDeductions || 0)
    const misc = Number(entry.miscDeductions || 0)
    const deductions = Number(entry.totalDeductions || 0)
    const netPay = Number(entry.netPay || 0)

    totalGross += grossPay
    totalNet += netPay
    totalDeductions += deductions

    row.getCell(1).value = employeeNumber
    row.getCell(2).value = employeeName
    row.getCell(3).value = nationalId
    row.getCell(4).value = jobTitle
    row.getCell(5).value = workDays
    row.getCell(6).value = baseSalary
    row.getCell(6).numFmt = '#,##0.00'
    row.getCell(7).value = benefits
    row.getCell(7).numFmt = '#,##0.00'
    row.getCell(8).value = commission
    row.getCell(8).numFmt = '#,##0.00'
    row.getCell(9).value = overtime
    row.getCell(9).numFmt = '#,##0.00'
    row.getCell(10).value = adjustments
    row.getCell(10).numFmt = '#,##0.00'
    row.getCell(11).value = grossPay
    row.getCell(11).numFmt = '#,##0.00'
    row.getCell(12).value = advances
    row.getCell(12).numFmt = '#,##0.00'
    row.getCell(13).value = loans
    row.getCell(13).numFmt = '#,##0.00'
    row.getCell(14).value = misc
    row.getCell(14).numFmt = '#,##0.00'
    row.getCell(15).value = deductions
    row.getCell(15).numFmt = '#,##0.00'
    row.getCell(16).value = netPay
    row.getCell(16).numFmt = '#,##0.00'

    // Add borders
    for (let i = 1; i <= 16; i++) {
      row.getCell(i).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }

    rowIndex++
  }

  // Add totals row
  const totalsRow = worksheet.getRow(rowIndex)
  totalsRow.getCell(1).value = 'TOTALS'
  totalsRow.getCell(1).font = { bold: true }
  totalsRow.getCell(11).value = totalGross
  totalsRow.getCell(11).numFmt = '#,##0.00'
  totalsRow.getCell(11).font = { bold: true }
  totalsRow.getCell(15).value = totalDeductions
  totalsRow.getCell(15).numFmt = '#,##0.00'
  totalsRow.getCell(15).font = { bold: true }
  totalsRow.getCell(16).value = totalNet
  totalsRow.getCell(16).numFmt = '#,##0.00'
  totalsRow.getCell(16).font = { bold: true }

  // Add borders to totals row
  for (let i = 1; i <= 16; i++) {
    totalsRow.getCell(i).border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' }
    }
    totalsRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } }
  }
  totalsRow.height = 25

  // Add summary section
  rowIndex += 2
  worksheet.getCell(`A${rowIndex}`).value = 'Employee Count:'
  worksheet.getCell(`A${rowIndex}`).font = { bold: true }
  worksheet.getCell(`B${rowIndex}`).value = entries.length

  rowIndex++
  worksheet.getCell(`A${rowIndex}`).value = 'Generated:'
  worksheet.getCell(`A${rowIndex}`).font = { bold: true }
  worksheet.getCell(`B${rowIndex}`).value = new Date().toISOString().split('T')[0]
}

/**
 * Regenerates payroll entries for a past period using contract snapshots
 * This ensures historical accuracy even if contracts were modified after the period
 */
export async function regeneratePeriodEntries(periodId: string): Promise<any[]> {
  const period = await prisma.payrollPeriods.findUnique({
    where: { id: periodId },
    include: {
      payrollEntries: {
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
              nationalId: true,
              dateOfBirth: true,
              hireDate: true,
              terminationDate: true,
              jobTitles: { select: { title: true } }
            }
          },
          payrollEntryBenefits: {
            include: {
              benefitType: {
                select: { id: true, name: true }
              }
            }
          }
        }
      }
    }
  })

  if (!period) {
    throw new Error(`Period ${periodId} not found`)
  }

  const enrichedEntries: any[] = []

  for (const entry of period.payrollEntries) {
    // Try to restore contract from snapshot
    let contract = null
    if (entry.contractSnapshot) {
      try {
        if (validateContractSnapshot(entry.contractSnapshot)) {
          contract = restoreContractFromSnapshot(entry.contractSnapshot as any)
        } else {
          console.warn(`Invalid snapshot for entry ${entry.id}, falling back to live contract`)
        }
      } catch (error) {
        console.warn(`Failed to restore snapshot for entry ${entry.id}:`, error)
      }
    }

    // Fall back to latest contract if no snapshot or snapshot invalid
    if (!contract && entry.employeeId) {
      const liveContract = await prisma.employeeContracts.findFirst({
        where: { employeeId: entry.employeeId },
        orderBy: { startDate: 'desc' },
        include: {
          compensationTypes: { select: { id: true, name: true, type: true } },
          jobTitles: { select: { id: true, title: true } },
          contract_benefits: {
            include: {
              benefitType: { select: { id: true, name: true } }
            }
          }
        }
      })
      contract = liveContract
    }

    // Recompute totals using the snapshot or live contract
    const totals = await computeTotalsForEntry(entry.id)

    enrichedEntries.push({
      ...entry,
      contract,
      employee: entry.employee,
      mergedBenefits: totals.combined || [],
      totalBenefitsAmount: Number(totals.benefitsTotal || 0),
      employeeFullName: entry.employee?.fullName || entry.employeeName,
      jobTitle: entry.employee?.jobTitles?.title || contract?.jobTitles?.title || '',
      grossPay: Number(totals.grossPay || entry.grossPay || 0),
      netPay: Number(totals.netPay || entry.netPay || 0),
      totalDeductions: Number(totals.totalDeductions || entry.totalDeductions || 0),
      adjustmentsTotal: Number(totals.additionsTotal || 0)
    })
  }

  return enrichedEntries
}

/**
 * Fetches all approved periods for a business up to and including a target period
 * Returns periods sorted by month (oldest to newest)
 */
export async function getYearToDatePeriods(
  businessId: string,
  targetPeriodId: string
): Promise<any[]> {
  // Get the target period to determine year and month
  const targetPeriod = await prisma.payrollPeriods.findUnique({
    where: { id: targetPeriodId },
    select: { year: true, month: true }
  })

  if (!targetPeriod) {
    throw new Error(`Period ${targetPeriodId} not found`)
  }

  // Find all approved periods in the same year, up to the target month
  const periods = await prisma.payrollPeriods.findMany({
    where: {
      businessId,
      year: targetPeriod.year,
      month: { lte: targetPeriod.month },
      status: 'approved' // Only include approved periods in YTD exports
    },
    select: {
      id: true,
      year: true,
      month: true,
      periodStart: true,
      periodEnd: true,
      status: true
    },
    orderBy: { month: 'asc' }
  })

  return periods
}
