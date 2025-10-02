#!/usr/bin/env node
// Load local environment for seed scripts so SEED_API_KEY is available
const path = require('path')
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })
} catch (e) {
  // ignore if dotenv is not installed or file missing; fallback to process.env
}

const { PrismaClient } = require('@prisma/client')
const { spawn } = require('child_process')
const prisma = new PrismaClient()

async function deleteContracts({ all = false, seededOnly = true }) {
  console.log('🧹 Deleting contracts...')

  if (all) {
    const contracts = await prisma.employeeContract.findMany({ select: { id: true, contractNumber: true, employeeId: true } })
    for (const c of contracts) {
      try {
        await prisma.employeeContract.delete({ where: { id: c.id } })
        console.log(`🗑️  Deleted contract ${c.contractNumber || c.id}`)
      } catch (err) {
        console.warn(`⚠️  Failed to delete contract ${c.contractNumber || c.id}: ${err.message}`)
      }
    }
    return
  }

  // default: delete contracts for known seeded employee numbers
  const seededNumbers = ['EMP001','EMP002','EMP003','EMP004','EMP1009']
  const employees = await prisma.employee.findMany({ where: { employeeNumber: { in: seededNumbers } }, select: { id: true, employeeNumber: true, fullName: true } })
  if (employees.length === 0) {
    console.log('ℹ️  No seeded employees found to delete contracts for')
    return
  }

  const empIds = employees.map(e => e.id)
  const contracts = await prisma.employeeContract.findMany({ where: { employeeId: { in: empIds } }, select: { id: true, contractNumber: true, employeeId: true } })
  for (const c of contracts) {
    try {
      await prisma.employeeContract.delete({ where: { id: c.id } })
      console.log(`🗑️  Deleted contract ${c.contractNumber || c.id}`)
    } catch (err) {
      console.warn(`⚠️  Failed to delete contract ${c.contractNumber || c.id}: ${err.message}`)
    }
  }
}

async function recreateContractsForSamples() {
  console.log('🔁 Recreating contracts via API helper (will prefer API when SEED_API_KEY is set)...')
  const { createContractViaApiOrDb } = require('../src/lib/services/contract-service')
  const seededNumbers = ['EMP001','EMP002','EMP003','EMP004','EMP1009']
  const employees = await prisma.employee.findMany({ where: { employeeNumber: { in: seededNumbers } } })
  if (employees.length === 0) {
    console.log('ℹ️  No seeded employees found to recreate contracts for')
    return
  }

  // Simple contract templates per sample employeeNumber
  const templates = {
    EMP001: { baseSalary: 85000, startDate: new Date(2022,0,15) },
    EMP002: { baseSalary: 45000, startDate: new Date(2022,2,10), isCommissionBased: true },
    EMP003: { baseSalary: 38000, startDate: new Date(2023,5,1) },
    EMP004: { baseSalary: 42000, startDate: new Date(2023,8,15), isCommissionBased: true },
    EMP1009: { baseSalary: 60000, startDate: new Date(2024,0,1) }
  }

  for (const employee of employees) {
    // Skip if contract already exists (safety)
    const existing = await prisma.employeeContract.findFirst({ where: { employeeId: employee.id } })
    if (existing) {
      console.log(`⏭️  Contract for ${employee.fullName || employee.employeeNumber} already exists, skipping...`)
      continue
    }

    const t = templates[employee.employeeNumber] || { baseSalary: 30000, startDate: new Date() }
    const payload = {
      contractNumber: `CON-${employee.employeeNumber}-${Date.now()}`,
      version: 1,
      jobTitleId: employee.jobTitleId,
      compensationTypeId: employee.compensationTypeId,
      baseSalary: t.baseSalary,
      startDate: t.startDate,
      primaryBusinessId: employee.primaryBusinessId,
      supervisorId: employee.supervisorId || null,
      supervisorName: null,
      supervisorTitle: null,
      isCommissionBased: !!t.isCommissionBased,
      isSalaryBased: !t.isCommissionBased,
      status: 'active',
      createdBy: employee.supervisorId || employee.id
    }

    try {
      const created = await createContractViaApiOrDb(employee.id, payload)
      console.log(`✅ Recreated contract for ${employee.fullName || employee.employeeNumber}: ${created.contractNumber || created.id}`)
    } catch (err) {
      console.error(`❌ Failed to recreate contract for ${employee.employeeNumber}:`, err && err.message ? err.message : err)
    }
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (!argv.includes('--yes')) {
    console.log('\nThis will DELETE contracts (scoped to seeded sample employees by default) and recreate them via the API helper.')
    console.log('To proceed run: node scripts/delete-and-recreate-contracts.js --yes')
    console.log('To delete ALL contracts: node scripts/delete-and-recreate-contracts.js --yes --all')
    process.exit(0)
  }

  const all = argv.includes('--all')
  try {
    await deleteContracts({ all })
    await recreateContractsForSamples()
    console.log('🎉 Done: contracts deleted and recreated (where applicable).')
  } catch (err) {
    console.error('❌ Error during delete/recreate:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
