/**
 * Read-only check for MBM-255: confirms no LoanWithdrawalRequest was marked PAID while the
 * "pay" action regression was live (it incremented ExpenseAccounts.balance instead of
 * decrementing it, and skipped creating the ExpenseAccountPayments audit record).
 *
 * Regression window: commit a417dacd, 2026-05-09 22:58:54 -0500 (2026-05-10T03:58:54.000Z)
 * onward, until the fix in this same change. This script does NOT write anything to the
 * database — it only reports.
 *
 * Usage:
 *   node scripts/check-loan-withdrawal-regression.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const REGRESSION_START = new Date('2026-05-10T03:58:54.000Z')

async function main() {
  console.log('================================================================')
  console.log(' LOAN WITHDRAWAL "PAY" REGRESSION CHECK (read-only) — MBM-255')
  console.log('================================================================')
  console.log('')
  console.log(`Checking for withdrawal requests marked PAID on or after ${REGRESSION_START.toISOString()}`)
  console.log('')

  const affected = await prisma.loanWithdrawalRequest.findMany({
    where: { status: 'PAID', paidAt: { gte: REGRESSION_START } },
    select: {
      id: true,
      requestNumber: true,
      approvedAmount: true,
      paidAt: true,
      paymentId: true,
      loan: {
        select: {
          loanNumber: true,
          lenderName: true,
          expenseAccountId: true,
          expenseAccount: { select: { accountName: true, balance: true } },
        },
      },
    },
    orderBy: { paidAt: 'asc' },
  })

  if (affected.length === 0) {
    console.log('No withdrawal requests were marked PAID during the regression window.')
    console.log('Nothing to correct.')
    return
  }

  console.log(`Found ${affected.length} withdrawal request(s) marked PAID during the regression window:`)
  console.log('')
  for (const r of affected) {
    const hasPaymentRecord = r.paymentId != null
    console.log(`- Request ${r.requestNumber} (loan ${r.loan.loanNumber}, lender ${r.loan.lenderName})`)
    console.log(`    approvedAmount: $${Number(r.approvedAmount).toFixed(2)}`)
    console.log(`    paidAt: ${r.paidAt?.toISOString()}`)
    console.log(`    has linked ExpenseAccountPayments record: ${hasPaymentRecord ? 'YES (likely paid after this fix, or manually corrected)' : 'NO  <-- corrupted by the regression'}`)
    console.log(`    expense account "${r.loan.expenseAccount?.accountName}" current balance: $${Number(r.loan.expenseAccount?.balance ?? 0).toFixed(2)}`)
    console.log('')
  }

  const corrupted = affected.filter(r => r.paymentId == null)
  console.log('================================================================')
  console.log(`Summary: ${corrupted.length} of ${affected.length} affected request(s) have no payment record (corrupted).`)
  if (corrupted.length > 0) {
    console.log('These need a manual correction: re-debit the expense account balance by the')
    console.log('approvedAmount and backfill the missing ExpenseAccountPayments record. Do not')
    console.log('apply any correction directly — report this output back so a reviewed SQL')
    console.log('migration can be written for it.')
  }
}

main()
  .catch(err => {
    console.error('Check failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
