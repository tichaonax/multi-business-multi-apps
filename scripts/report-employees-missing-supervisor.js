#!/usr/bin/env node
try { require('dotenv').config() } catch (e) {
  const fs = require('fs'), path = require('path')
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const contents = fs.readFileSync(envPath, 'utf8')
    contents.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) { let val = m[2]; if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1); process.env[m[1]] = val }
    })
  }
}
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  try {
    const list = await prisma.employee.findMany({ where: { supervisorId: null }, select: { id: true, employeeNumber: true, fullName: true, jobTitleId: true } })
    console.log(`ℹ️ Found ${list.length} employees without supervisorId`)
    for (const e of list) console.log(`- ${e.employeeNumber} • ${e.fullName} (id: ${e.id}) jobTitleId: ${e.jobTitleId || 'null'}`)
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err)
  } finally { await prisma.$disconnect() }
}

if (require.main === module) run()
