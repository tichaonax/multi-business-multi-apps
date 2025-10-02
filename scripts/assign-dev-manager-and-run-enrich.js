#!/usr/bin/env node
// Create or find a dev manager and assign them as supervisor for employees
// missing a supervisorId. Then update contracts and optionally re-run the
// regeneration script to attempt API-based seeding.
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
const { execSync } = require('child_process')
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
    // Find or create a job title 'Dev Manager'
    let managerJob = await prisma.jobTitle.findFirst({ where: { title: { contains: 'Dev Manager' } } })
    if (!managerJob) {
      managerJob = await prisma.jobTitle.create({ data: { id: `job-dev-manager`, title: 'Dev Manager', description: 'Auto-created dev supervisor for seeding', level: 'Manager' } })
      console.log('Created job title:', managerJob.id)
    }

    // Pick a business to attach the manager to (use first existing business)
    const business = await prisma.business.findFirst()
    if (!business) {
      console.error('No business found in DB; cannot create manager')
      return
    }

    // Find or create the dev manager employee
    let devMgr = await prisma.employee.findFirst({ where: { employeeNumber: 'DEV-MGR-1' } })
    if (!devMgr) {
      devMgr = await prisma.employee.create({ data: {
        id: `dev-mgr-1`,
        employeeNumber: 'DEV-MGR-1',
        firstName: 'Dev',
        lastName: 'Manager',
        fullName: 'Dev Manager',
        email: 'dev.manager@local.dev',
        phone: '+0000000000',
        hireDate: new Date(),
        jobTitleId: managerJob.id,
        compensationTypeId: (await prisma.compensationType.findFirst())?.id || '',
        primaryBusinessId: business.id,
        nationalId: 'DEV-MGR-1',
        createdAt: new Date()
      } })
      console.log('Created dev manager employee:', devMgr.employeeNumber)
    } else {
      console.log('Found existing dev manager:', devMgr.employeeNumber)
    }

    // Assign dev manager as supervisor for employees missing supervisorId, excluding management roles
    const employees = await prisma.employee.findMany({ where: { supervisorId: null } })
    let assigned = 0
    for (const e of employees) {
      // skip manager itself
      if (e.id === devMgr.id) continue

      // fetch jobTitle to determine if management
      const jt = await prisma.jobTitle.findUnique({ where: { id: e.jobTitleId } }).catch(() => null)
      if (isManagementRoleFromTitle(jt)) continue

      await prisma.employee.update({ where: { id: e.id }, data: { supervisorId: devMgr.id, updatedAt: new Date() } })
      // update existing contracts for this employee to have supervisor fields
      const supTitle = jt ? jt.title : null
      const contracts = await prisma.employeeContract.findMany({ where: { employeeId: e.id } })
      for (const c of contracts) {
        await prisma.employeeContract.update({ where: { id: c.id }, data: { supervisorId: devMgr.id, supervisorName: devMgr.fullName, supervisorTitle: supTitle, updatedAt: new Date() } })
      }
      assigned++
      console.log(`Assigned supervisor Dev Manager to ${e.employeeNumber} (${e.fullName}) and updated ${contracts.length} contract(s)`)
    }

    console.log(`🎉 Assigned Dev Manager to ${assigned} employees`)

    // Re-run regeneration script to attempt API-first path now that supervisor fields exist
    try {
      console.log('🔁 Re-running regeneration script to attempt API for enriched contracts...')
      const out = execSync(`node "${process.cwd().replace(/\\/g,'/')}/scripts/regenerate-contracts-for-all-employees.js"`, { stdio: 'inherit' })
      // output is streamed
    } catch (err) {
      console.error('Error re-running regeneration:', err && err.message ? err.message : err)
    }

  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) run()
