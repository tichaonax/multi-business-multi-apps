require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const prisma = new PrismaClient()

async function run() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.join(__dirname, '..', 'backups')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  console.log('Fetching payroll entries...')
  const entries = await prisma.payrollEntry.findMany({})
  const periods = await prisma.payrollPeriod.findMany({})

  const entriesFile = path.join(outDir, `payroll-entries-before-netgross-${ts}.json`)
  const periodsFile = path.join(outDir, `payroll-periods-before-netgross-${ts}.json`)

  fs.writeFileSync(entriesFile, JSON.stringify(entries, null, 2))
  fs.writeFileSync(periodsFile, JSON.stringify(periods, null, 2))

  console.log('Wrote backups:', entriesFile, periodsFile)
  await prisma.$disconnect()
}

run().catch(err=>{ console.error(err); process.exit(1) })
