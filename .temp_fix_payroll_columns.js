const { PrismaClient } = require('@prisma/client')

;(async () => {
  const p = new PrismaClient()
  try {
    console.log('Checking and renaming payroll_exports columns as needed...')
    const renames = [
      { from: 'payrollperiodid', to: '"payrollPeriodId"' },
      { from: 'businessid', to: '"businessId"' },
      { from: 'filename', to: '"fileName"' },
      { from: 'fileurl', to: '"fileUrl"' },
      { from: 'filesize', to: '"fileSize"' },
      { from: 'includesmonths', to: '"includesMonths"' },
      { from: 'employeecount', to: '"employeeCount"' },
      { from: 'totalgrosspay', to: '"totalGrossPay"' },
      { from: 'totalnetpay', to: '"totalNetPay"' },
      { from: 'exportedat', to: '"exportedAt"' },
      { from: 'exportedby', to: '"exportedBy"' },
      { from: 'generationtype', to: '"generationType"' }
    ]

    for (const r of renames) {
      const existsLower = await p.$queryRawUnsafe("select 1 from information_schema.columns where table_name='payroll_exports' and column_name='" + r.from + "'")
      const existsTarget = await p.$queryRawUnsafe("select 1 from information_schema.columns where table_name='payroll_exports' and column_name='" + r.to.replace(/\"/g, '') + "'")
      if (existsLower.length > 0 && existsTarget.length === 0) {
        const sql = `alter table public.payroll_exports rename column ${r.from} to ${r.to}`
        console.log('Executing:', sql)
        try {
          await p.$executeRawUnsafe(sql)
          console.log(`Renamed ${r.from} -> ${r.to}`)
        } catch (e) {
          console.error('Failed to rename', r.from, e.message || e)
        }
      } else {
        console.log(`Skipping ${r.from} (existsLower=${existsLower.length > 0}, existsTarget=${existsTarget.length > 0})`)
      }
    }

    console.log('Done renaming columns')
  } catch (e) {
    console.error(e)
  } finally {
    await p.$disconnect()
  }
})()
