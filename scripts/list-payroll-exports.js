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

// try loading config/service.env
loadEnvFile(path.join(__dirname, '..', 'config', 'service.env'))

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.payrollExport.findMany({
    orderBy: { exportedAt: 'desc' },
    take: 10,
    include: { payrollPeriod: true }
  })

  if (!rows.length) {
    console.log('No payrollExport rows found')
    await prisma.$disconnect()
    return
  }

  for (const r of rows) {
    console.log({ id: r.id, payrollPeriodId: r.payrollPeriodId, fileUrl: r.fileUrl, exportedAt: r.exportedAt, payrollPeriodStatus: r.payrollPeriod?.status })
  }

  await prisma.$disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
