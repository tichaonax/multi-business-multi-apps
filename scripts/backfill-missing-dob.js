const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

function randomDob(minAge = 18, maxAge = 65) {
  const today = new Date()
  const maxDate = new Date()
  maxDate.setFullYear(today.getFullYear() - minAge)
  const minDate = new Date()
  minDate.setFullYear(today.getFullYear() - maxAge)
  const rand = new Date(minDate.getTime() + Math.floor(Math.random() * (maxDate.getTime() - minDate.getTime())))
  return rand
}

async function backfill(options = {}) {
  try {
    const missing = await prisma.employee.findMany({
      where: { dateOfBirth: null },
      select: { id: true, employeeNumber: true, fullName: true, email: true }
    })

    console.log(`Found ${missing.length} employees with missing dateOfBirth`)
    if (missing.length === 0) return

    missing.slice(0, 50).forEach((e, i) => {
      console.log(`${i + 1}. ${e.employeeNumber} - ${e.fullName} <${e.email}> (id=${e.id})`)
    })

    if (!options.apply) {
      console.log('\nDry-run mode. To apply updates run with --yes')
      return
    }

    // If user provided BACKFILL_DOB env or passed --fixed flag, use a fixed DOB for all rows.
    const useFixed = options.fixed || Boolean(process.env.BACKFILL_DOB)
    let fixedParsed = null
    if (useFixed) {
      const dobValue = process.env.BACKFILL_DOB || options.fixed
      fixedParsed = new Date(dobValue)
      if (isNaN(fixedParsed.getTime())) {
        console.error('Invalid fixed DOB value provided:', dobValue)
        return
      }
    }

    console.log(`\nApplying dateOfBirth to ${missing.length} employees${useFixed ? ' (fixed value)' : ' (randomized per employee)'}:`)
    const updates = []
    for (const e of missing) {
      const dobToSet = useFixed ? fixedParsed : randomDob()
      await prisma.employee.update({ where: { id: e.id }, data: { dateOfBirth: dobToSet } })
      updates.push({ id: e.id, employeeNumber: e.employeeNumber, fullName: e.fullName, newDob: dobToSet.toISOString().slice(0,10) })
    }

    console.log('\nUpdated employees:')
    updates.forEach((u, i) => console.log(`${i+1}. ${u.employeeNumber} - ${u.fullName} -> ${u.newDob} (id=${u.id})`))
    console.log('\nDone: updated employees')
  } catch (err) {
    console.error('Error running backfill:', err && err.message ? err.message : err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const apply = args.includes('--yes') || args.includes('--apply')
  backfill({ apply }).catch((err) => {
    console.error('Script error:', err)
    prisma.$disconnect().finally(() => process.exit(1))
  })
}

module.exports = { backfill }
