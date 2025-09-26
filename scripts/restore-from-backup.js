const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')

async function restore(backupPath) {
  if (!backupPath) throw new Error('backupPath required')
  const abs = path.isAbsolute(backupPath) ? backupPath : path.join(process.cwd(), backupPath)
  if (!fs.existsSync(abs)) throw new Error('Backup file not found: ' + abs)
  const raw = fs.readFileSync(abs, 'utf8')
  const backup = JSON.parse(raw)

  // Basic validation of shape
  if (!backup || typeof backup !== 'object') throw new Error('Invalid backup format')

  // Ordering: users -> vehicles -> drivers -> licenses -> authorizations -> trips -> maintenance
  try {
    console.log('Restoring backup createdAt=', backup.createdAt)

    // Restore users
    for (const u of backup.users || []) {
      if (!u.id) throw new Error('User missing id')
      await prisma.user.upsert({ where: { id: u.id }, update: u, create: u })
    }

    // Restore vehicles
    for (const v of backup.vehicles || []) {
      if (!v.id) throw new Error('Vehicle missing id')
      await prisma.vehicle.upsert({ where: { id: v.id }, update: v, create: v })
    }

    // Restore drivers
    for (const d of backup.drivers || []) {
      if (!d.id) throw new Error('Driver missing id')
      await prisma.vehicleDriver.upsert({ where: { id: d.id }, update: d, create: d })
    }

    // Restore licenses
    for (const l of backup.licenses || []) {
      if (!l.id) throw new Error('License missing id')
      await prisma.vehicleLicense.upsert({ where: { id: l.id }, update: l, create: l })
    }

    // Restore authorizations
    for (const a of backup.driverAuthorizations || []) {
      if (!a.id) throw new Error('Authorization missing id')
      await prisma.driverAuthorization.upsert({ where: { id: a.id }, update: a, create: a })
    }

    // Restore trips
    for (const t of backup.trips || []) {
      if (!t.id) throw new Error('Trip missing id')
      await prisma.vehicleTrip.upsert({ where: { id: t.id }, update: t, create: t })
    }

    // Restore maintenance records
    for (const m of backup.maintenanceRecords || []) {
      if (!m.id) throw new Error('Maintenance record missing id')
      await prisma.vehicleMaintenanceRecord.upsert({ where: { id: m.id }, update: m, create: m })
    }

    console.log('Restore complete')
  } finally {
    await prisma.$disconnect()
  }
}

module.exports = { restore }

if (require.main === module) {
  const arg = process.argv[2]
  restore(arg).catch(err => {
    console.error('Restore failed', err)
    process.exit(1)
  })
}
