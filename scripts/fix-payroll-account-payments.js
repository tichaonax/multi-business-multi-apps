/**
 * fix-payroll-account-payments.js
 *
 * Recovery script for production payroll account payment records.
 * Run: node scripts/fix-payroll-account-payments.js [--apply]
 *
 * Without --apply: dry-run (shows what would change, makes no writes)
 * With --apply:    actually writes corrections to the database
 *
 * Uses the SAME computeTotalsForEntry helper + the SAME NET PAY formula
 * as the payroll period page — guaranteed to produce matching values.
 *
 * NET PAY formula (matches payroll page line 1744):
 *   grossInclBenefits = totals.grossPay - totals.clockInDeductionAmount + perDiem
 *   netTakeHome = max(0, grossInclBenefits - nssa - paye - aidsLevy - totalDeductions)
 */

require('dotenv').config({ path: '.env.local' })

// Register ts-node so TypeScript helpers can be imported directly
require('ts-node').register({
  transpileOnly: true,
  project: 'tsconfig.server.json',
})

// Register tsconfig-paths so @/ resolves to ./src/
const { register: registerPaths } = require('tsconfig-paths')
registerPaths({ baseUrl: '.', paths: { '@/*': ['./src/*'] } })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// Use require() (not import()) — ts-node hooks into CommonJS require() for .ts files
const { computeTotalsForEntry } = require('../src/lib/payroll/helpers')

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

  const payrollAccount = await prisma.payrollAccounts.findFirst({
    where: { isActive: true, businessId: null },
    select: { id: true, balance: true },
  })
  if (!payrollAccount) {
    console.error('❌ No global payroll account found.')
    return
  }
  console.log(`Payroll account: ${payrollAccount.id}, current balance: $${Number(payrollAccount.balance).toFixed(2)}`)

  const adminUser = await prisma.users.findFirst({
    where: { role: 'admin' },
    select: { id: true, name: true, email: true },
  })
  if (!adminUser) {
    console.error('❌ No admin user found.')
    return
  }
  console.log(`Recording as: ${adminUser.name || adminUser.email} (${adminUser.id})\n`)

  let totalAmountChanged = 0
  let totalAmountCreated = 0

  for (const period of periods) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthLabel = `${MONTHS[period.month - 1]} ${period.year}`
    console.log(`\n──────── ${monthLabel} (${period.id}) ────────`)

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

    // Per diem — same filter as the payroll page (approved + pending)
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

    const existingSalaryPayments = await prisma.payrollAccountPayments.findMany({
      where: { payrollPeriodId: period.id, paymentType: 'SALARY' },
      select: { id: true, payrollEntryId: true, amount: true, employeeId: true },
    })
    const existingTaxPayments = await prisma.payrollAccountPayments.findMany({
      where: { payrollPeriodId: period.id, paymentType: { in: ['ZIMRA_PAYE', 'NSSA', 'AIDS_LEVY'] } },
      select: { id: true, paymentType: true, amount: true },
    })

    const salaryPaymentByEntryId = {}
    for (const p of existingSalaryPayments) {
      if (p.payrollEntryId) salaryPaymentByEntryId[p.payrollEntryId] = p
    }

    let totalPAYE = 0
    let totalNSSA = 0
    let totalAIDS = 0

    for (const e of entries) {
      if (!e.employeeId) continue

      // Use the same computeTotalsForEntry helper as the payroll page
      const totals = await computeTotalsForEntry(e.id, period.month)

      const perDiem = perDiemMap[e.employeeId] || 0
      const nssa  = Number(e.zimraNssa   ?? e.nssaEmployee ?? 0)
      const paye  = Number(e.zimraPaye   ?? e.payeAmount   ?? 0)
      const aids  = Number(e.zimraAidsLevy ?? e.aidsLevy   ?? 0)

      // Matches payroll page NET PAY formula exactly (page.tsx line 1744):
      //   grossInclBenefits = totals.grossPay - clockInDeductionAmount + perDiem
      //   netTakeHome = max(0, grossInclBenefits - nssa - paye - aidsLevy - totalDeductions)
      const grossInclBenefits = totals.grossPay - (totals.clockInDeductionAmount || 0) + perDiem
      const netTakeHome = Math.max(0, grossInclBenefits - nssa - paye - aids - totals.totalDeductions)
      const correctAmount = Math.round(netTakeHome * 100) / 100

      totalPAYE += paye
      totalNSSA += nssa
      totalAIDS += aids

      const empName = e.employees?.fullName || e.employeeName || e.employeeId
      const existingPayment = salaryPaymentByEntryId[e.id]

      if (existingPayment) {
        const storedAmount = Number(existingPayment.amount)
        const diff = Math.abs(storedAmount - correctAmount)
        if (diff > 0.01) {
          console.log(`  ⚠️  ${empName}: stored $${storedAmount.toFixed(2)} → correct $${correctAmount.toFixed(2)} (diff $${(correctAmount - storedAmount).toFixed(2)})`)
          console.log(`       gross=$${totals.grossPay.toFixed(2)} clockIn=$${(totals.clockInDeductionAmount||0).toFixed(2)} perDiem=$${perDiem.toFixed(2)} nssa=$${nssa.toFixed(2)} paye=$${paye.toFixed(2)} aids=$${aids.toFixed(2)} deductions=$${totals.totalDeductions.toFixed(2)}`)
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
        console.log(`  ➕ ${empName}: create $${correctAmount.toFixed(2)} (gross=$${totals.grossPay.toFixed(2)} clockIn=$${(totals.clockInDeductionAmount||0).toFixed(2)} perDiem=$${perDiem.toFixed(2)} nssa=$${nssa.toFixed(2)} paye=$${paye.toFixed(2)} deductions=$${totals.totalDeductions.toFixed(2)})`)
        totalAmountCreated += correctAmount
        if (APPLY) {
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
              notes: `Salary — ${empName} (${monthLabel})`,
              createdBy: adminUser.id,
            },
          })
          console.log(`     ✅ Created salary payment for ${empName}`)
        }
      }
    }

    // Tax summary payments
    const taxSummary = [
      { type: 'ZIMRA_PAYE', total: Math.round(totalPAYE * 100) / 100, label: 'ZIMRA PAYE' },
      { type: 'NSSA',       total: Math.round(totalNSSA * 100) / 100, label: 'NSSA' },
      { type: 'AIDS_LEVY',  total: Math.round(totalAIDS * 100) / 100, label: 'AIDS Levy' },
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
        console.log(`  ➕ Create ${tax.label}: $${tax.total.toFixed(2)}`)
        if (APPLY) {
          await prisma.payrollAccountPayments.create({
            data: {
              payrollAccountId: payrollAccount.id,
              payrollPeriodId: period.id,
              amount: tax.total,
              paymentType: tax.type,
              status: 'COMPLETED',
              isLocked: true,
              notes: `${tax.label} — ${monthLabel}`,
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
    if (Math.abs(totalAmountChanged) <= 0.01 && totalAmountCreated <= 0.01) {
      console.log(`✅ All payment amounts are correct — no changes needed.`)
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
