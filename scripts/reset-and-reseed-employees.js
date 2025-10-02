#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const { spawn } = require('child_process')

const prisma = new PrismaClient()

async function resetSeededEmployees() {
  console.log('🔁 Resetting seeded employees and contracts...')

  // Define deterministic employeeNumbers we consider 'seeded' for removal
  const seededNumbers = [
    'EMP1009', // targeted contract
    'EMP001', 'EMP002', 'EMP003', 'EMP004'
  ]

  try {
    // Find employees matching these numbers
    const employees = await prisma.employee.findMany({ where: { employeeNumber: { in: seededNumbers } } })
    if (employees.length === 0) {
      console.log('ℹ️  No matching seeded employees found')
      return
    }

    // Delete contracts tied to these employees
    const empIds = employees.map(e => e.id)
    const contracts = await prisma.employeeContract.findMany({ where: { employeeId: { in: empIds } } })
    for (const c of contracts) {
      try {
        await prisma.employeeContract.delete({ where: { id: c.id } })
        console.log(`🗑️  Deleted contract ${c.contractNumber}`)
      } catch (err) {
        console.warn(`⚠️  Failed to delete contract ${c.contractNumber}: ${err.message}`)
      }
    }

    // Delete the employees
    for (const e of employees) {
      try {
        await prisma.employee.delete({ where: { id: e.id } })
        console.log(`🗑️  Deleted employee ${e.fullName} (${e.employeeNumber})`)
      } catch (err) {
        console.warn(`⚠️  Failed to delete employee ${e.employeeNumber}: ${err.message}`)
      }
    }

  } catch (err) {
    console.error('❌ Error resetting seeded employees:', err)
  }
}

async function runReseed() {
  try {
    await resetSeededEmployees()
    console.log('🔄 Re-running comprehensive employee seeder...')
    // Spawn node to run the seeder script in a child process so we get logs
    const child = spawn('node', [require('path').resolve(__dirname, 'seed-all-employee-data.js')], { stdio: 'inherit' })
    child.on('exit', (code) => {
      console.log(`📌 Reseed process exited with code ${code}`)
      process.exit(code)
    })
  } catch (err) {
    console.error('❌ Reseed failed:', err)
    process.exit(1)
  } finally {
    // Note: the child process handles Prisma disconnection; ensure main disconnects if no child
    // await prisma.$disconnect()
  }
}

if (require.main === module) {
  ;(async () => {
    // Simple CLI safety: require --yes to proceed
    const argv = process.argv.slice(2)
    if (!argv.includes('--yes')) {
      console.log('\nThis will DELETE seeded employee records (EMP1009, EMP001-EMP004) and their contracts, then re-run the comprehensive seeder.')
      console.log('If you are sure, re-run with: node scripts/reset-and-reseed-employees.js --yes')
      process.exit(0)
    }
    await runReseed()
  })()
}
