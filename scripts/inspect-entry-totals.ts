import dotenv from 'dotenv'
dotenv.config({ path: 'config/service.env' })

async function main() {
  try {
    const id = process.argv[2] || 'PE-hIr6sTmqXFfA'
    // import helper dynamically so dotenv loads first
    const helper = await import('../src/lib/payroll/helpers')
    if (!helper || !helper.computeTotalsForEntry) {
      console.error('computeTotalsForEntry not found in helper')
      process.exit(2)
    }
    const totals = await helper.computeTotalsForEntry(id)
    console.log('Computed totals for', id)
    console.log(JSON.stringify(totals, null, 2))
    process.exit(0)
  } catch (err) {
    console.error('Error running inspect script:', err)
    process.exit(1)
  }
}

main()
