#!/usr/bin/env node
// Enrich employee contracts that are missing supervisorId by copying the
// employee.supervisorId (and supervisor name/title) when available.
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

async function enrich() {
  try {
    console.log('🔎 Scanning contracts for missing supervisorId...')

    // Find contracts with no supervisorId
    const contracts = await prisma.employeeContract.findMany({ where: { supervisorId: null } , select: { id: true, employeeId: true } })
    console.log(`ℹ️  Found ${contracts.length} contracts without supervisorId`)

    let updatedCount = 0

    for (const c of contracts) {
      const emp = await prisma.employee.findUnique({ where: { id: c.employeeId } })
      if (!emp) continue

      if (!emp.supervisorId) continue // nothing to copy

      const sup = await prisma.employee.findUnique({ where: { id: emp.supervisorId } })
      if (!sup) continue

      // try to get supervisor's job title
      let supTitle = null
      if (sup.jobTitleId) {
        const jt = await prisma.jobTitle.findUnique({ where: { id: sup.jobTitleId } }).catch(() => null)
        if (jt) supTitle = jt.title
      }

      await prisma.employeeContract.update({ where: { id: c.id }, data: { supervisorId: sup.id, supervisorName: sup.fullName, supervisorTitle: supTitle, updatedAt: new Date() } })
      updatedCount++
      console.log(`✅ Updated contract ${c.id} with supervisor ${sup.fullName} (${sup.id})`)
    }

    console.log(`🎉 Completed enrichment. Contracts updated: ${updatedCount}`)
  } catch (err) {
    console.error('❌ Enrichment error:', err && err.message ? err.message : err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) enrich()

module.exports = { enrich }
