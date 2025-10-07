require('dotenv').config({ path: 'config/service.env' })
// register ts-node so we can import TS directly
require('ts-node').register({ transpileOnly: true })

const id = process.argv[2] || 'PE-hIr6sTmqXFfA'
;(async () => {
  try {
    const helper = await import('../src/lib/payroll/helpers')
    if (!helper || !helper.computeTotalsForEntry) {
      console.error('computeTotalsForEntry not found')
      process.exit(2)
    }
    const totals = await helper.computeTotalsForEntry(id)
    console.log('Computed totals for', id)
    console.log(JSON.stringify(totals, null, 2))
    process.exit(0)
  } catch (err) {
    console.error('Error computing totals:', err)
    process.exit(1)
  }
})()
