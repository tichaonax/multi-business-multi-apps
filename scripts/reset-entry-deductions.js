require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async ()=>{
  try {
    const entryId = process.argv[2]
    if (!entryId) {
      console.error('Usage: node reset-entry-deductions.js <ENTRY_ID>')
      process.exit(1)
    }

    const entry = await prisma.payrollEntry.findUnique({ where: { id: entryId }, include: { payrollAdjustments: true } })
    if (!entry) {
      console.error('Entry not found:', entryId)
      process.exit(1)
    }

    const advances = Number(entry.advanceDeductions || 0)
    const loans = Number(entry.loanDeductions || 0)
    const misc = Number(entry.miscDeductions || 0)
    let adjAsDeductions = 0
    for (const a of (entry.payrollAdjustments || [])) {
      const amt = Number(a.amount || 0)
      if (amt < 0) adjAsDeductions += Math.abs(amt)
    }

    const derived = advances + loans + misc + adjAsDeductions

    console.log('Entry', entryId)
    console.log('  advances:', advances, 'loans:', loans, 'misc:', misc)
    console.log('  adjAsDeductions:', adjAsDeductions)
    console.log('  derivedTotalDeductions:', derived)
    console.log('  stored totalDeductions:', Number(entry.totalDeductions || 0))

    // Update entry: set totalDeductions = derived, netPay = grossPay (do not subtract deductions)
    const updated = await prisma.payrollEntry.update({ where: { id: entryId }, data: { totalDeductions: derived, netPay: entry.grossPay, updatedAt: new Date() } })
    console.log('Updated entry:', { id: updated.id, totalDeductions: updated.totalDeductions, netPay: updated.netPay })

    // Recompute period totals
    if (updated.payrollPeriodId) {
      const entries = await prisma.payrollEntry.findMany({ where: { payrollPeriodId: updated.payrollPeriodId } })
      const totalGross = entries.reduce((s, e) => s + Number(e.grossPay || 0), 0)
      const totalDeductions = entries.reduce((s, e) => s + Number(e.totalDeductions || 0), 0)
      const totalNetPay = entries.reduce((s, e) => s + Number(e.netPay || 0), 0)
      const p = await prisma.payrollPeriod.update({ where: { id: updated.payrollPeriodId }, data: { totalGrossPay: totalGross, totalDeductions: totalDeductions, totalNetPay: totalNetPay, updatedAt: new Date() } })
      console.log('Updated payrollPeriod', p.id, { totalGrossPay: p.totalGrossPay, totalDeductions: p.totalDeductions, totalNetPay: p.totalNetPay })
    }

    await prisma.$disconnect()
  } catch (err) {
    console.error(err)
    try { await prisma.$disconnect() } catch (e) {}
    process.exit(1)
  }
})()
