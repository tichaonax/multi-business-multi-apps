const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

jest.setTimeout(120000)

describe('dev data seed/cleanup/restore roundtrip', () => {
  test('seed -> cleanup -> restore (smoke)', async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping integration test: DATABASE_URL not set')
      return
    }

    // Run seed script
    execSync('node scripts/seed-dev-data.js', { stdio: 'inherit', env: process.env })

    // Run cleanup script with confirmation env
    execSync('node scripts/cleanup-dev-data.js', { stdio: 'inherit', env: { ...process.env, CLEANUP_CONFIRM: 'YES' } })

    // Find the latest backup file
    const base = path.join(process.cwd(), 'scripts')
    const files = fs.readdirSync(base).filter(f => f.startsWith('cleanup-backup-') && f.endsWith('.json'))
    expect(files.length).toBeGreaterThan(0)
    const latest = files.sort().reverse()[0]
    const backupPath = path.join(base, latest)
    expect(fs.existsSync(backupPath)).toBeTruthy()

    // Use the restore module to restore
    const { restore } = require('../restore-from-backup')
    await restore(backupPath)

    // If we get here, the restore didn't throw
    expect(true).toBe(true)
  })
})
