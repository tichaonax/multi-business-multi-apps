#!/usr/bin/env node
// Scan all employee contracts and report missing required fields so we can
// decide what to enrich before attempting API-based seeding.
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

function isManagementRoleFromTitle(jobTitle) {
  if (!jobTitle) return false
  const t = (jobTitle.title || '').toLowerCase()
  if (t.includes('manager') || t.includes('director') || t.includes('ceo') || t.includes('chief') || t.includes('head')) return true
  if ((jobTitle.level || '').toLowerCase().includes('senior')) return true
  if ((jobTitle.department || '').toLowerCase() === 'executive') return true
  return false
}

async function run() {
  try {
    const contracts = await prisma.employeeContract.findMany({ select: { id: true, employeeId: true, jobTitleId: true, compensationTypeId: true, baseSalary: true, startDate: true, primaryBusinessId: true, supervisorId: true } })
    console.log(`ℹ️  Found ${contracts.length} contracts`) 

    const report = []

    for (const c of contracts) {
      const missing = []

      const employee = c.employeeId ? await prisma.employee.findUnique({ where: { id: c.employeeId } }).catch(() => null) : null

      const jobTitleId = c.jobTitleId || (employee && employee.jobTitleId) || null
      const compensationTypeId = c.compensationTypeId || (employee && employee.compensationTypeId) || null
      const baseSalary = c.baseSalary != null ? c.baseSalary : null
      const startDate = c.startDate || (employee && employee.hireDate) || null
      const primaryBusinessId = c.primaryBusinessId || (employee && employee.primaryBusinessId) || null

      if (!jobTitleId) missing.push('jobTitleId')
      if (!compensationTypeId) missing.push('compensationTypeId')
      if (baseSalary == null) missing.push('baseSalary')
      if (!startDate) missing.push('startDate')
      if (!primaryBusinessId) missing.push('primaryBusinessId')

      // Determine if supervisor is required
      let supervisorRequired = false
      let jobTitle = null
      if (jobTitleId) {
        jobTitle = await prisma.jobTitle.findUnique({ where: { id: jobTitleId } }).catch(() => null)
        supervisorRequired = !isManagementRoleFromTitle(jobTitle)
      } else if (employee && employee.jobTitleId) {
        jobTitle = await prisma.jobTitle.findUnique({ where: { id: employee.jobTitleId } }).catch(() => null)
        supervisorRequired = !isManagementRoleFromTitle(jobTitle)
      }

      if (supervisorRequired && !c.supervisorId) missing.push('supervisorId (required for non-management role)')

      if (missing.length > 0) {
        report.push({ contractId: c.id, employeeNumber: employee ? employee.employeeNumber : null, employeeName: employee ? employee.fullName : null, missing })
      }
    }

    // Print human-readable report
    if (report.length === 0) {
      console.log('✅ No missing required fields found for any contract')
    } else {
      console.log(`⚠️ Found ${report.length} contract(s) with missing required fields:`)
      for (const r of report) {
        console.log(`- ${r.employeeNumber || 'unknown'} (${r.employeeName || 'Unknown'}) - contract ${r.contractId} -> missing: ${r.missing.join(', ')}`)
      }
    }

    // Write JSON report to disk for later analysis
    const fs = require('fs')
    const path = require('path')
    const out = path.resolve(__dirname, '..', 'reports')
    if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true })
    const filePath = path.join(out, `missing-contract-fields-report-${Date.now()}.json`)
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8')
    console.log(`📄 Written JSON report to ${filePath}`)
  } catch (err) {
    console.error('Error generating report:', err && err.message ? err.message : err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) run()

module.exports = { run }
