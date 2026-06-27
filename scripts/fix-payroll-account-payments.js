/**
 * fix-payroll-account-payments.js
 *
 * Recovery script for production payroll account payment records.
 * Run: node scripts/fix-payroll-account-payments.js [--apply]
 *
 * Without --apply: dry-run (shows what would change, makes no writes)
 * With --apply:    actually writes corrections to the database
 *
 * What it does:
 * 1. For each approved/exported period that has SALARY payment records:
 *    → Recomputes the correct net take-home (same formula as the payroll table)
 *    → If the stored amount differs, reports it (and updates when --apply)
 * 2. For each approved/exported period that has NO payment records:
 *    → Creates SALARY + ZIMRA_PAYE + NSSA + AIDS_LEVY records
 *    → Recalculates payroll account balance at the end
 */

const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: '.env.local' })

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// ── helpers copied from lib/payroll/helpers.ts ────────────────────────────────

function getWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d)
    if (dt.getDay() !== 0) count++
  }
  return count
}

async function computeNetForEntry(entryId, periodMonth) {
  // Load entry
  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: { employees: true, payroll_periods: { select: { month: true } } },
  })
  if (!entry) return { grossPay: 0, totalDeductions: 0, nssa: 0, paye: 0, aids: 0 }

  const resolvedMonth = periodMonth ?? entry.payroll_periods?.month ?? null

  // Benefits from payrollEntryBenefits
  const persistedBenefits = await prisma.payrollEntryBenefits.findMany({
    where: { payrollEntryId: entryId },
    include: { benefit_types: true },
  })

  // Benefit total (additive) and manual deductions
  let benefitsTotal = 0
  let manualDeductionsTotal = 0
  for (const b of persistedBenefits) {
    if (b.isActive === false) continue
    const amt = Number(b.amount || 0)
    const isDeduction = b.entryType === 'deduction' || b.benefit_types?.type === 'deduction'
    if (isDeduction) manualDeductionsTotal += amt
    else benefitsTotal += amt
  }

  // Adjustments
  const adjustments = await prisma.payrollAdjustments.findMany({ where: { payrollEntryId: entryId } })
  let additionsTotal = 0
  let adjustmentsAsDeductions = 0
  let absenceDeduction = 0
  let clockInDeduction = 0
  for (const a of adjustments) {
    const amt = Number(a.amount || 0)
    if (amt >= 0) {
      const isPendingClockIn = a.isClockInAdjustment && a.status === 'pending'
      if (!isPendingClockIn) additionsTotal += amt
    } else {
      const absAmt = Math.abs(amt)
      const rawType = String(a.adjustmentType || '').toLowerCase()
      if (rawType === 'absence') absenceDeduction += absAmt
      else if (a.isClockInAdjustment) clockInDeduction += absAmt
      else adjustmentsAsDeductions += absAmt
    }
  }

  const baseSalary = Number(entry.baseSalary || 0)
  const commission = Number(entry.commission || 0)

  // Overtime (simplified — use stored overtimePay if available)
  const overtimePay = Number(entry.overtimePay || 0)

  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal - absenceDeduction - clockInDeduction

  const advances = Number(entry.advanceDeductions || 0)
  const loans = Number(entry.loanDeductions || 0)
  const misc = Number(entry.miscDeductions || 0)
  const totalDeductions = advances + loans + misc + adjustmentsAsDeductions + manualDeductionsTotal

  const nssa = Number(entry.zimraNssa ?? entry.nssaEmployee ?? 0)
  const paye = Number(entry.zimraPaye ?? entry.payeAmount ?? 0)
  const aids = Number(entry.zimraAidsLevy ?? entry.aidsLevy ?? 0)

  const netTakeHome = Math.max(0, grossPay - nssa - paye - aids - totalDeductions)

  return { grossPay, totalDeductions, nssa, paye, aids, netTakeHome }
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 Payroll Account Payment Recovery Script`)
  console.log(`   Mode: ${APPLY ? '⚠️  APPLY (writing to DB)' : '🟡 DRY-RUN (no writes)'}`)
  console.log(`   Add --apply flag to actually write changes.\n`)

  // 1. Find all approved/exported/closed periods
  const periods = await prisma.payrollPeriods.findMany({
    where: { status: { in: ['approved', 'exported', 'closed'] }, approvedAt: { not: null } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
    select: { id: true, year: true, month: true, status: true, businessId: true },
  })

  console.log(`Found ${periods.length} approved/exported/closed periods.\n`)

  // Get payroll account
  const payrollAccount = await prisma.payrollAccounts.findFirst({
    where: { isActive: true, businessId: null },
    select: { id: true, balance: true },
  })
  if (!payrollAccount) {
    console.error('❌ No global payroll account found.')
    return
  }
  console.log(`Payroll account: ${payrollAccount.id}, current balance: $${Number(payrollAccount.balance).toFixed(2)}`)

  // Find an admin user to attribute the recovery records to
  const adminUser = await prisma.users.findFirst({
    where: { role: 'admin' },
    select: { id: true, name: true, email: true },
  })
  if (!adminUser) {
    console.error('❌ No admin user found — cannot attribute created records.')
    return
  }
  console.log(`Recording as: ${adminUser.name || adminUser.email} (${adminUser.id})\n`)

  let totalAmountChanged = 0
  let totalAmountCreated = 0

  for (const period of periods) {
    const monthLabel = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][period.month-1]} ${period.year}`
    console.log(`\n──────── ${monthLabel} (${period.id}) ────────`)

    // Get all entries for this period
    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: period.id },
      select: {
        id: true,
        employeeId: true,
        employeeName: true,
        zimraPaye: true,
        payeAmount: true,
        zimraNssa: true,
        nssaEmployee: true,
        zimraAidsLevy: true,
        aidsLevy: true,
        employees: { select: { fullName: true } },
      },
      orderBy: { employeeName: 'asc' },
    })

    // Per diem for this period
    const periodEmployeeIds = entries.map(e => e.employeeId).filter(Boolean)
    const perDiemRows = periodEmployeeIds.length > 0
      ? await prisma.perDiemEntries.groupBy({
          by: ['employeeId'],
          where: {
            payrollYear: period.year,
            payrollMonth: period.month,
            approvalStatus: { in: ['approved', 'pending'] },
            employeeId: { in: periodEmployeeIds },
          },
          _sum: { amount: true },
        })
      : []
    const perDiemMap = {}
    for (const r of perDiemRows) {
      perDiemMap[r.employeeId] = Number(r._sum.amount ?? 0)
    }

    // Existing SALARY payments for this period
    const existingSalaryPayments = await prisma.payrollAccountPayments.findMany({
      where: { payrollPeriodId: period.id, paymentType: 'SALARY' },
      select: { id: true, payrollEntryId: true, amount: true, employeeId: true, notes: true },
    })

    // Existing tax payments
    const existingTaxPayments = await prisma.payrollAccountPayments.findMany({
      where: { payrollPeriodId: period.id, paymentType: { in: ['ZIMRA_PAYE', 'NSSA', 'AIDS_LEVY'] } },
      select: { id: true, paymentType: true, amount: true },
    })

    const salaryPaymentByEntryId = {}
    for (const p of existingSalaryPayments) {
      if (p.payrollEntryId) salaryPaymentByEntryId[p.payrollEntryId] = p
    }

    const hasSalaryPayments = existingSalaryPayments.length > 0
    const hasTaxPayments = existingTaxPayments.length > 0

    // Compute correct amounts for each entry
    let totalPAYE = 0
    let totalNSSA = 0
    let totalAIDS = 0

    for (const e of entries) {
      if (!e.employeeId) continue

      const computed = await computeNetForEntry(e.id, period.month)
      const perDiem = perDiemMap[e.employeeId] || 0
      const correctAmount = Math.round((computed.netTakeHome + perDiem) * 100) / 100

      totalPAYE += computed.paye
      totalNSSA += computed.nssa
      totalAIDS += computed.aids

      const empName = e.employees?.fullName || e.employeeName || e.employeeId
      const existingPayment = salaryPaymentByEntryId[e.id]

      if (existingPayment) {
        const storedAmount = Number(existingPayment.amount)
        const diff = Math.abs(storedAmount - correctAmount)
        if (diff > 0.01) {
          console.log(`  ⚠️  ${empName}: stored $${storedAmount.toFixed(2)} → correct $${correctAmount.toFixed(2)} (diff $${(correctAmount - storedAmount).toFixed(2)})`)
          totalAmountChanged += correctAmount - storedAmount
          if (APPLY) {
            await prisma.payrollAccountPayments.update({
              where: { id: existingPayment.id },
              data: { amount: correctAmount },
            })
            console.log(`     ✅ Updated payment ${existingPayment.id}`)
          }
        } else {
          console.log(`  ✅ ${empName}: $${storedAmount.toFixed(2)} is correct`)
        }
      } else {
        // No payment exists — need to create
        console.log(`  ➕ ${empName}: create payment $${correctAmount.toFixed(2)} (gross $${computed.grossPay.toFixed(2)}, nssa $${computed.nssa.toFixed(2)}, paye $${computed.paye.toFixed(2)}, deductions $${computed.totalDeductions.toFixed(2)}, perdiem $${perDiem.toFixed(2)})`)
        totalAmountCreated += correctAmount
        if (APPLY) {
          const periodLabel = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][period.month-1]} ${period.year}`
          await prisma.payrollAccountPayments.create({
            data: {
              payrollAccountId: payrollAccount.id,
              employeeId: e.employeeId,
              payrollEntryId: e.id,
              payrollPeriodId: period.id,
              amount: correctAmount,
              paymentType: 'SALARY',
              status: 'COMPLETED',
              isLocked: true,
              notes: `Salary — ${empName} (${periodLabel})`,
              createdBy: adminUser.id,
            },
          })
          console.log(`     ✅ Created salary payment for ${empName}`)
        }
      }
    }

    // Handle tax payments
    const taxSummary = [
      { type: 'ZIMRA_PAYE', total: Math.round(totalPAYE * 100) / 100, label: 'ZIMRA PAYE' },
      { type: 'NSSA', total: Math.round(totalNSSA * 100) / 100, label: 'NSSA' },
      { type: 'AIDS_LEVY', total: Math.round(totalAIDS * 100) / 100, label: 'AIDS Levy' },
    ]

    for (const tax of taxSummary) {
      if (tax.total <= 0) continue
      const existing = existingTaxPayments.find(p => p.paymentType === tax.type)
      if (existing) {
        const storedAmount = Number(existing.amount)
        const diff = Math.abs(storedAmount - tax.total)
        if (diff > 0.01) {
          console.log(`  ⚠️  ${tax.label}: stored $${storedAmount.toFixed(2)} → correct $${tax.total.toFixed(2)}`)
          if (APPLY) {
            await prisma.payrollAccountPayments.update({ where: { id: existing.id }, data: { amount: tax.total } })
            console.log(`     ✅ Updated ${tax.label} payment`)
          }
        } else {
          console.log(`  ✅ ${tax.label}: $${storedAmount.toFixed(2)} is correct`)
        }
      } else {
        console.log(`  ➕ Create ${tax.label} payment: $${tax.total.toFixed(2)}`)
        if (APPLY) {
          const periodLabel = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][period.month-1]} ${period.year}`
          await prisma.payrollAccountPayments.create({
            data: {
              payrollAccountId: payrollAccount.id,
              payrollPeriodId: period.id,
              amount: tax.total,
              paymentType: tax.type,
              status: 'COMPLETED',
              isLocked: true,
              notes: `${tax.label} — ${periodLabel}`,
              createdBy: adminUser.id,
            },
          })
          console.log(`     ✅ Created ${tax.label} payment`)
        }
      }
    }
  }

  console.log('\n──────────────────────────────────────────────')
  if (!APPLY) {
    if (Math.abs(totalAmountChanged) > 0.01) {
      console.log(`⚠️  Would adjust existing payment amounts by: $${totalAmountChanged.toFixed(2)}`)
    }
    if (totalAmountCreated > 0.01) {
      console.log(`➕ Would create new payment records totalling: $${totalAmountCreated.toFixed(2)}`)
    }
    console.log('\n👉 Run with --apply to write these changes to the database.')
  } else {
    // Recalculate payroll account balance
    const depositsAgg = await prisma.payrollAccountDeposits.aggregate({
      where: { payrollAccountId: payrollAccount.id },
      _sum: { amount: true },
    })
    const paymentsAgg = await prisma.payrollAccountPayments.aggregate({
      where: { payrollAccountId: payrollAccount.id },
      _sum: { amount: true },
    })
    const newBalance = Number(depositsAgg._sum.amount ?? 0) - Number(paymentsAgg._sum.amount ?? 0)
    await prisma.payrollAccounts.update({
      where: { id: payrollAccount.id },
      data: { balance: newBalance, updatedAt: new Date() },
    })
    console.log(`\n✅ Done. Payroll account balance updated to: $${newBalance.toFixed(2)}`)
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
