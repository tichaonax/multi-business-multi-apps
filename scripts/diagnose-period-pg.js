// Diagnostic script using `pg` to avoid Prisma Client schema mismatch
// Usage: DATABASE_URL="..." node scripts/diagnose-period-pg.js PP-KhQ1m6QGECSU

const { Client } = require('pg')

async function main() {
  const periodId = process.argv[2]
  if (!periodId) { console.error('Usage: node scripts/diagnose-period-pg.js <periodId>'); process.exit(1) }
  const conn = process.env.DATABASE_URL
  if (!conn) { console.error('Please set DATABASE_URL env var'); process.exit(2) }

  const client = new Client({ connectionString: conn })
  await client.connect()

  try {
    // Fetch period
    const res = await client.query('SELECT id, year, month, period_start, period_end, business_id FROM payroll_periods WHERE id = $1', [periodId])
    if (res.rows.length === 0) { console.error('Period not found'); process.exit(3) }
    const period = res.rows[0]
    console.log('Period:', period)

    // Fetch entries for period
    const entriesRes = await client.query('SELECT * FROM payroll_entries WHERE payroll_period_id = $1 ORDER BY employee_name ASC', [periodId])
    console.log('Entries count:', entriesRes.rows.length)

    const target = entriesRes.rows.find(r => (r.employee_number || r.employee_number) === 'EMP1001')
    if (target) {
      console.log('\nEMP1001 entry row:')
      console.log(JSON.stringify(target, null, 2))
    } else {
      console.log('\nEMP1001 not found; first 5 rows:')
      console.log(JSON.stringify(entriesRes.rows.slice(0,5), null, 2))
    }
  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
