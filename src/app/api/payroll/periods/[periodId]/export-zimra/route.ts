import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import * as XLSX from 'xlsx'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Categorise a benefit name into a ZIMRA column bucket
function benefitBucket(name: string, entryType: string): 'housing' | 'vehicle' | 'education' | 'medical' | 'bonus' | 'other' {
  if (entryType === 'bonus') return 'bonus'
  const n = name.toLowerCase()
  if (n.includes('housing')) return 'housing'
  if (n.includes('vehicle')) return 'vehicle'
  if (n.includes('education') || n.includes('school')) return 'education'
  if (n.includes('medical')) return 'medical'
  return 'other'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { periodId } = await params

    // Load period
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, year: true, month: true, status: true },
    })

    if (!period) return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })

    if (!['exported', 'closed'].includes(period.status)) {
      return NextResponse.json(
        { error: 'ZIMRA export is only available after the payroll has been exported and payslips generated.' },
        { status: 400 }
      )
    }

    // Fetch all payroll entries for the period with everything we need
    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: periodId },
      include: {
        employees: {
          select: { id: true, tin: true, nationalId: true },
        },
        payroll_adjustments: {
          select: { amount: true, adjustmentType: true, isClockInAdjustment: true },
        },
        payroll_entry_benefits: {
          where: { isActive: true },
          select: { benefitName: true, amount: true, entryType: true },
        },
        payroll_slip: {
          select: { necEmployee: true },
        },
      },
      orderBy: { employeeName: 'asc' },
    })

    // Block if any employee is missing TIN
    const missingTin = entries
      .filter((e) => !e.employees?.tin)
      .map((e) => ({ name: e.employeeName || 'Unknown', number: e.employeeNumber || '' }))

    if (missingTin.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot export ZIMRA file — the following employees are missing their TIN. Update their profile and try again.',
          employees: missingTin,
        },
        { status: 400 }
      )
    }

    // Fetch per diem totals for the period month/year
    const perDiemRows = await prisma.perDiemEntries.groupBy({
      by: ['employeeId'],
      _sum: { amount: true },
      where: {
        payrollYear: period.year,
        payrollMonth: period.month,
        approvalStatus: { in: ['approved', 'pending'] },
      },
    })
    const perDiemMap: Record<string, number> = {}
    for (const row of perDiemRows) {
      perDiemMap[row.employeeId] = Number(row._sum.amount ?? 0)
    }

    // --- Build spreadsheet rows ---

    // Headers (52 columns A–AZ)
    const headers = [
      'TIN',
      'ID/Passport Number',
      'Employee Name',
      'Currency',
      'Current Salary, wages, fees, Commissions etc (regular earnings) USD',
      'Current Salary, wages, fees, Commissions etc (regular earnings) ZWG',
      'Other Exemptions on Current Salary, Wages, Fees, Commissions Etc (Regular Earnings) USD',
      'Other Exemptions on Current Salary, Wages, Fees, Commissions Etc (Regular Earnings) ZWG',
      'Current Overtime USD',
      'Current Overtime ZWG',
      'Current Bonus USD',
      'Current Bonus ZWG',
      'Current Irregular Commission USD',
      'Current Irregular Commission\t ZWG\r\n ',
      'Current Other Irregular earnings USD',
      'Current Other Irregular earnings ZWG\r\n',
      'Current Severance pay, gratuity or similar benefit,  on  retrenchment (with exemption) USD',
      'Current Severance pay, gratuity or similar benefit,  on  retrenchment (with exemption)  ZWG',
      'Current Gratuity without exemption  USD',
      'Current Gratuity without exemption ZWG',
      'Current Housing Benefit USD',
      'Current Housing Benefit ZWG',
      'Current Vehicle Benefit USD',
      'Current Vehicle Benefit ZWG',
      'Current Education Benefit USD',
      'Current Education Benefit ZWG\r\n',
      'Current Other Benefits USD',
      'Current Other Benefits ZWG',
      'Current Non-Taxable Earnings USD',
      'Current Non-taxable earnings ZWG',
      'Current Pension Contributions USD',
      'Current Pension Contributions ZWG',
      'Current NSSA Contributions USD',
      'Current NSSA Contributions ZWG',
      'Current Retirement Annuity Fund Contributions USD',
      'Current Retirement Annuity Fund Contributions ZWG',
      'Current NEC/Subscriptions USD',
      'Current NEC/Subscriptions ZWG',
      'Current Other Deductions USD\r\n',
      'Current Other Deductions ZWG',
      'Current Medical Aid Contributions  USD',
      'Current Medical Aid Contributions  ZWG',
      'Current Medical Expenses USD',
      'Current Medical Expenses  ZWG',
      'Current Blind persons credit\tUSD\r\n',
      'Current Blind persons credit\tZWG',
      'Current Disabled persons credit USD',
      'Current Disabled persons credit  ZWG',
      'Current Elderly person credit\tUSD',
      'Current Elderly person credit\tZWG\r\n',
      'Cumulative Bonus (from last tax period) USD\r\n',
      'Cumulative Bonus (from last tax period) ZWG',
    ]

    const dataRows = entries.map((entry) => {
      const baseSalary = Number(entry.baseSalary ?? 0)

      // Earned salary = baseSalary - absenceDeduction - clockInDeductionAmount
      let absenceDeduction = 0
      let clockInDeduction = 0
      for (const adj of entry.payroll_adjustments) {
        const amt = Math.abs(Number(adj.amount ?? 0))
        if (adj.adjustmentType === 'absence') {
          absenceDeduction += amt
        } else if (adj.isClockInAdjustment) {
          clockInDeduction += amt
        }
      }
      const earnedSalary = Math.max(0, baseSalary - absenceDeduction - clockInDeduction)

      // Categorise benefits
      let housingBenefit = Number(entry.livingAllowance ?? 0) // living allowance always goes to housing
      let vehicleBenefit = Number(entry.vehicleAllowance ?? 0)
      let educationBenefit = 0
      let medicalAid = 0
      let bonusTotal = 0
      let otherBenefits = 0

      for (const benefit of entry.payroll_entry_benefits) {
        if (benefit.entryType === 'deduction') continue
        const amt = Number(benefit.amount ?? 0)
        const bucket = benefitBucket(benefit.benefitName, benefit.entryType ?? '')
        if (bucket === 'housing') housingBenefit += amt
        else if (bucket === 'vehicle') vehicleBenefit += amt
        else if (bucket === 'education') educationBenefit += amt
        else if (bucket === 'medical') medicalAid += amt
        else if (bucket === 'bonus') bonusTotal += amt
        else otherBenefits += amt
      }

      const commission = Number(entry.commission ?? 0)
      const overtimePay = Number(entry.overtimePay ?? 0)
      const cashInLieu = Number(entry.cashInLieu ?? 0)
      const nssaEmployee = Number(entry.zimraNssa ?? entry.nssaEmployee ?? 0)
      const necEmployee = Number(entry.payroll_slip?.necEmployee ?? 0)
      const perDiem = entry.employees?.id ? (perDiemMap[entry.employees.id] ?? 0) : 0

      // Build the 52-column row (A=col0 … AZ=col51)
      const row: (string | number)[] = new Array(52).fill(0)

      row[0]  = entry.employees!.tin!          // A — TIN
      row[1]  = entry.nationalId ?? ''         // B — ID/Passport
      row[2]  = (entry.employeeName ?? '').toUpperCase() // C — Name
      row[3]  = 'USD & ZWG'                    // D — Currency
      row[4]  = earnedSalary                   // E — Regular earnings USD
      row[5]  = 0                              // F — ZWG
      row[6]  = 0                              // G — Exemptions USD
      row[7]  = 0                              // H — ZWG
      row[8]  = overtimePay                    // I — Overtime USD
      row[9]  = 0                              // J — ZWG
      row[10] = bonusTotal                     // K — Bonus USD
      row[11] = 0                              // L — ZWG
      row[12] = commission                     // M — Commission USD
      row[13] = 0                              // N — ZWG
      row[14] = cashInLieu                     // O — Other Irregular USD
      row[15] = 0                              // P — ZWG
      row[16] = 0                              // Q — Severance USD
      row[17] = 0                              // R — ZWG
      row[18] = 0                              // S — Gratuity USD
      row[19] = 0                              // T — ZWG
      row[20] = housingBenefit                 // U — Housing Benefit USD
      row[21] = 0                              // V — ZWG
      row[22] = vehicleBenefit                 // W — Vehicle Benefit USD
      row[23] = 0                              // X — ZWG
      row[24] = educationBenefit               // Y — Education Benefit USD
      row[25] = 0                              // Z — ZWG
      row[26] = otherBenefits                  // AA — Other Benefits USD
      row[27] = 0                              // AB — ZWG
      row[28] = perDiem                        // AC — Non-Taxable Earnings USD
      row[29] = 0                              // AD — ZWG
      row[30] = 0                              // AE — Pension USD
      row[31] = 0                              // AF — ZWG
      row[32] = nssaEmployee                   // AG — NSSA USD
      row[33] = 0                              // AH — ZWG
      row[34] = 0                              // AI — RAF USD
      row[35] = 0                              // AJ — ZWG
      row[36] = necEmployee                    // AK — NEC USD
      row[37] = 0                              // AL — ZWG
      row[38] = 0                              // AM — Other Deductions USD (left blank)
      row[39] = 0                              // AN — ZWG
      row[40] = medicalAid                     // AO — Medical Aid USD
      row[41] = 0                              // AP — ZWG
      row[42] = 0                              // AQ — Medical Expenses USD
      // AQ–AZ (cols 42–51) remain 0

      return row
    })

    // Build workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet0')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const monthStr = String(period.month).padStart(2, '0')
    const filename = `ZIMRA-Earnings-${period.year}-${monthStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating ZIMRA export:', error)
    return NextResponse.json({ error: 'Failed to generate ZIMRA export' }, { status: 500 })
  }
}
