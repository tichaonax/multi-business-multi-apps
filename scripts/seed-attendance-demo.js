/**
 * Seed realistic employee attendance data for demo employees.
 * Generates 90 days of clock-in/clock-out records with natural variation.
 * Idempotent — safe to run multiple times (upsert by employeeId_date).
 *
 * Run: node scripts/seed-attendance-demo.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Deterministic "random" — same input always gives same output
// ---------------------------------------------------------------------------
function hash(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return Math.abs(h)
}
function rnd(seed) { return (hash(seed) % 100000) / 100000 }

// ---------------------------------------------------------------------------
// Zimbabwe timezone = UTC+2
// makeDateTime: given UTC-midnight date + Zimbabwe local hour/minute → UTC DateTime
// ---------------------------------------------------------------------------
function makeDateTime(dayUtcMidnight, zimHour, zimMinute) {
  const totalMinutes = (zimHour - 2) * 60 + zimMinute
  return new Date(dayUtcMidnight.getTime() + totalMinutes * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Businesses whose employees may work Saturdays
// ---------------------------------------------------------------------------
const RETAIL_BUSINESSES = new Set([
  'restaurant-demo-business',
  'clothing-demo-business',
  'grocery-demo-1',
  'grocery-demo-2',
])

// ---------------------------------------------------------------------------
// Generate a single day's attendance record
// ---------------------------------------------------------------------------
function generateDayRecord(employeeId, day, isSaturday) {
  const dateStr = day.toISOString().split('T')[0]
  const s = `${employeeId}-${dateStr}`

  const statusRoll = rnd(`${s}-status`)

  // Saturday: shorter 8am–1pm shift
  if (isSaturday) {
    if (statusRoll < 0.10) return null // 10% chance don't work Saturday after all
    const inMin = Math.floor(rnd(`${s}-in`) * 20)       // 8:00–8:19 AM
    const outMin = Math.floor(rnd(`${s}-out`) * 15)      // 13:00–13:14
    const checkIn = makeDateTime(day, 8, inMin)
    const checkOut = makeDateTime(day, 13, outMin)
    const hoursWorked = parseFloat(((checkOut - checkIn) / 3600000).toFixed(2))
    return { status: 'present', checkIn, checkOut, hoursWorked, notes: 'Saturday half-day' }
  }

  // Weekday probabilities
  if (statusRoll < 0.025) {
    // 2.5% — absent
    return { status: 'absent', checkIn: null, checkOut: null, hoursWorked: null, notes: null }
  }
  if (statusRoll < 0.04) {
    // 1.5% — leave
    return { status: 'leave', checkIn: null, checkOut: null, hoursWorked: null, notes: 'Approved leave' }
  }
  if (statusRoll < 0.06) {
    // 2% — half-day (morning only, 8am–12pm)
    const inMin = Math.floor(rnd(`${s}-in`) * 10)
    const checkIn = makeDateTime(day, 8, inMin)
    const checkOut = makeDateTime(day, 12, Math.floor(rnd(`${s}-out`) * 10))
    const hoursWorked = parseFloat(((checkOut - checkIn) / 3600000).toFixed(2))
    return { status: 'half-day', checkIn, checkOut, hoursWorked, notes: null }
  }
  if (statusRoll < 0.14) {
    // 8% — late arrival (8:30–9:15 AM)
    const lateMin = 30 + Math.floor(rnd(`${s}-lmin`) * 45)
    const checkIn = makeDateTime(day, 8, lateMin)
    const outMin = Math.floor(rnd(`${s}-out`) * 30)
    const checkOut = makeDateTime(day, 17, outMin)
    const hoursWorked = parseFloat(((checkOut - checkIn) / 3600000).toFixed(2))
    return { status: 'present', checkIn, checkOut, hoursWorked, notes: 'Late arrival' }
  }

  // Regular day: 7:50 AM – 8:10 AM clock-in, 5:00–5:25 PM clock-out
  const inOffset = -10 + Math.floor(rnd(`${s}-in`) * 20)  // -10 to +9 min
  const checkIn = makeDateTime(day, 8, inOffset)
  const outMin = Math.floor(rnd(`${s}-out`) * 25)
  const checkOut = makeDateTime(day, 17, outMin)
  const hoursWorked = parseFloat(((checkOut - checkIn) / 3600000).toFixed(2))
  return { status: 'present', checkIn, checkOut, hoursWorked, notes: null }
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function seedAttendance() {
  console.log('\n⏱️  Seeding demo employee attendance (90 days)...')

  // Include ALL active employees, not just demo ones — real employees also need attendance history
  const employees = await prisma.employees.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, primaryBusinessId: true },
  })

  if (employees.length === 0) {
    console.log('⚠️  No active employees found.')
    return
  }

  console.log(`Found ${employees.length} active employees\n`)

  // Build 90-day window (UTC midnight dates)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const days = []
  for (let i = 90; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * 86400000))
  }

  let upserted = 0

  for (const emp of employees) {
    const isRetail = RETAIL_BUSINESSES.has(emp.primaryBusinessId)
    let empCount = 0

    for (const day of days) {
      const dow = day.getUTCDay() // 0=Sun, 6=Sat

      if (dow === 0) continue                      // No Sundays
      if (dow === 6 && !isRetail) continue         // Non-retail skip Saturdays

      const rec = generateDayRecord(emp.id, day, dow === 6)
      if (!rec) continue                           // Saturday no-show rolled

      await prisma.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: day } },
        update: {
          status: rec.status,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          hoursWorked: rec.hoursWorked,
          notes: rec.notes,
          isApproved: true,
        },
        create: {
          employeeId: emp.id,
          date: day,
          status: rec.status,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          hoursWorked: rec.hoursWorked,
          notes: rec.notes,
          isApproved: true,
        },
      })
      empCount++
      upserted++
    }

    console.log(`  ✅ ${emp.fullName} — ${empCount} records`)
  }

  console.log(`\n✅ Attendance seed complete — ${upserted} total records across ${employees.length} employees`)
}

async function main() {
  try {
    await seedAttendance()
  } catch (err) {
    console.error('Attendance seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

module.exports = { seedAttendance }

if (require.main === module) main()
