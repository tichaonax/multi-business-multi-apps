/**
 * Cleanup Payroll Entries Without Valid Contracts
 *
 * This script identifies and removes payroll entries for employees who don't have
 * valid contracts overlapping the payroll period. This ensures payroll calculations
 * are accurate and company classifications are consistent.
 *
 * Usage:
 *   node scripts/cleanup-payroll-no-contracts.js <periodId> [--apply]
 *
 * Without --apply: Dry-run mode (shows what would be deleted)
 * With --apply: Actually deletes the invalid entries
 */

const fetch = require('node-fetch')

const PERIOD_ID = process.argv[2]
const APPLY = process.argv.includes('--apply')

if (!PERIOD_ID) {
  console.error('❌ Error: Period ID is required')
  console.error('Usage: node scripts/cleanup-payroll-no-contracts.js <periodId> [--apply]')
  process.exit(1)
}

const API_URL = `http://localhost:8080/api/payroll/periods/${PERIOD_ID}/cleanup-no-contract`

async function cleanup() {
  try {
    console.log(`\n🔍 Checking payroll period: ${PERIOD_ID}`)
    console.log(`Mode: ${APPLY ? '⚠️  APPLY (will delete)' : '🧪 DRY-RUN (no changes)'}`)
    console.log(`\nCalling: ${API_URL}\n`)

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This script assumes you're running locally with dev auth
        // In production, you'd need to pass a valid session token
      },
      body: JSON.stringify({ apply: APPLY })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ API Error:', data.error || data.details || 'Unknown error')
      process.exit(1)
    }

    if (data.offenders && data.offenders.length > 0) {
      console.log(`\n📋 Found ${data.offenders.length} payroll entries WITHOUT valid contracts:\n`)

      data.offenders.forEach((offender, idx) => {
        console.log(`${idx + 1}. Entry ID: ${offender.entryId}`)
        console.log(`   Employee: ${offender.employeeName || 'Unknown'} (${offender.employeeNumber || 'No number'})`)
        console.log(`   Employee ID: ${offender.employeeId || 'None'}`)
        console.log('')
      })

      if (APPLY) {
        console.log(`✅ ${data.message}`)
        console.log(`Deleted ${data.deleted} entries`)
      } else {
        console.log('ℹ️  Dry-run complete. No changes made.')
        console.log('   Run with --apply to actually delete these entries.')
      }
    } else {
      console.log('✅ No issues found! All payroll entries have valid contracts.')
    }

    console.log('\n✓ Done\n')
  } catch (error) {
    console.error('❌ Script error:', error.message)
    process.exit(1)
  }
}

cleanup()
