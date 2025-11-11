/**
 * Test Backup Creation
 * Tests if pg_dump can create a backup successfully
 */

// Load environment variables
require('dotenv').config()

const { spawn } = require('child_process')
const { existsSync, mkdirSync, statSync, unlinkSync } = require('fs')
const { join } = require('path')

async function testBackupCreation() {
  console.log('\n🧪 Testing Backup Creation\n')

  // Check if pg_dump is available
  console.log('1. Checking if pg_dump is installed...')

  try {
    const checkPgDump = spawn('pg_dump', ['--version'])

    await new Promise((resolve, reject) => {
      let version = ''

      checkPgDump.stdout.on('data', (data) => {
        version += data.toString()
      })

      checkPgDump.on('close', (code) => {
        if (code === 0) {
          console.log(`   ✅ pg_dump found: ${version.trim()}`)
          resolve()
        } else {
          reject(new Error('pg_dump not found'))
        }
      })

      checkPgDump.on('error', () => {
        reject(new Error('pg_dump not installed'))
      })
    })
  } catch (error) {
    console.log('   ❌ pg_dump not found')
    console.log('   Please install PostgreSQL client tools')
    console.log('   Download: https://www.postgresql.org/download/windows/')
    return
  }

  // Check DATABASE_URL
  console.log('\n2. Checking DATABASE_URL...')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.log('   ❌ DATABASE_URL not configured')
    return
  }

  const url = new URL(databaseUrl)
  console.log(`   ✅ Database: ${url.pathname.slice(1)} on ${url.hostname}:${url.port || 5432}`)

  // Create backups directory
  console.log('\n3. Creating backups directory...')

  const backupsDir = join(process.cwd(), 'backups')
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true })
    console.log('   ✅ Created: backups/')
  } else {
    console.log('   ✅ Already exists: backups/')
  }

  // Create test backup
  console.log('\n4. Creating test backup...')

  const backupFile = join(backupsDir, `test-backup-${Date.now()}.sql`)

  const args = [
    '-h', url.hostname,
    '-p', url.port || '5432',
    '-U', url.username,
    '-d', url.pathname.slice(1),
    '-f', backupFile,
    '--data-only',
    '--column-inserts',
    '--no-owner',
    '--no-privileges'
  ]

  const env = {
    ...process.env,
    PGPASSWORD: url.password || ''
  }

  const startTime = Date.now()

  try {
    await new Promise((resolve, reject) => {
      const pgDump = spawn('pg_dump', args, { env })

      let stderr = ''

      pgDump.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`pg_dump failed: ${stderr}`))
        }
      })

      pgDump.on('error', (error) => {
        reject(error)
      })
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const stats = statSync(backupFile)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)

    console.log(`   ✅ Backup created successfully!`)
    console.log(`   📄 File: ${backupFile}`)
    console.log(`   📊 Size: ${sizeMB} MB`)
    console.log(`   ⏱️  Time: ${duration} seconds`)

    // Cleanup
    console.log('\n5. Cleaning up test file...')
    unlinkSync(backupFile)
    console.log('   ✅ Test file deleted')

    console.log('\n✅ Backup creation test PASSED!')
    console.log('\n📋 Summary:')
    console.log('   - pg_dump is working correctly')
    console.log('   - Database connection successful')
    console.log('   - Backup creation is fast and reliable')
    console.log(`   - Estimated full backup time: ${duration}s`)

  } catch (error) {
    console.log('   ❌ Backup creation failed')
    console.error(`   Error: ${error.message}`)

    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Tip: Check your DATABASE_URL password')
    } else if (error.message.includes('could not connect')) {
      console.log('\n💡 Tip: Make sure PostgreSQL is running')
    }
  }
}

// Run test
testBackupCreation().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
