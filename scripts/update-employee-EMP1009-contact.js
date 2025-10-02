#!/usr/bin/env node
// Update contact fields for employee EMP1009
try {
  require('dotenv').config()
} catch (e) {
  const fs = require('fs')
  const path = require('path')
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const contents = fs.readFileSync(envPath, 'utf8')
    contents.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) {
        let val = m[2]
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[m[1]] = val
      }
    })
  }
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function update() {
  try {
    const emp = await prisma.employee.findFirst({ where: { employeeNumber: 'EMP1009' } })
    if (!emp) {
      console.error('Employee EMP1009 not found')
      process.exit(1)
    }

    const updated = await prisma.employee.update({
      where: { id: emp.id },
      data: {
        nationalId: 'SEED-1009-3434',
        address: '789 Pine St, City, State 12345',
        phone: '+263 78 545 3103',
        email: 'michael.davis@techcorp.com',
        updatedAt: new Date()
      }
    })

    console.log('Updated EMP1009:', { id: updated.id, employeeNumber: updated.employeeNumber, nationalId: updated.nationalId, address: updated.address, phone: updated.phone, email: updated.email })
  } catch (err) {
    console.error('Error updating employee:', err && err.message ? err.message : err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) update()

module.exports = { update }
