const { prisma } = require('../src/lib/prisma')

async function main() {
  const rows = await prisma.payrollExport.findMany({
    orderBy: { exportedAt: 'desc' },
    take: 10,
    include: { payrollPeriod: true }
  })

  if (!rows.length) {
    console.log('No payrollExport rows found')
    return
  }

  for (const r of rows) {
    console.log({ id: r.id, payrollPeriodId: r.payrollPeriodId, fileUrl: r.fileUrl, exportedAt: r.exportedAt, payrollPeriodStatus: r.payrollPeriod?.status })
  }
}

main().catch(err => { console.error(err); process.exit(1) })
