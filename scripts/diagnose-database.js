#!/usr/bin/env node

/**
 * Database Connectivity Diagnostic Tool
 * Helps identify DATABASE_URL issues on production servers
 */

const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('\n' + '='.repeat(60))
console.log('🔍 DATABASE CONNECTIVITY DIAGNOSTIC TOOL')
console.log('='.repeat(60) + '\n')

// Load environment variables from various sources
function loadEnvFiles() {
  const envFiles = [
    '.env',
    '.env.local',
    'config/service.env'
  ]

  const foundVars = {}

  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      console.log(`✓ Found: ${file}`)
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')

      lines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key === 'DATABASE_URL') {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '')
            foundVars[file] = value
          }
        }
      })
    } else {
      console.log(`✗ Missing: ${file}`)
    }
  })

  return foundVars
}

// Parse DATABASE_URL
function parseDatabaseUrl(url) {
  try {
    // postgresql://user:pass@host:port/database
    const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/)
    if (!match) {
      return { error: 'Invalid DATABASE_URL format' }
    }

    return {
      protocol: 'postgresql',
      user: match[1],
      password: match[2],
      host: match[3],
      port: match[4],
      database: match[5]
    }
  } catch (error) {
    return { error: error.message }
  }
}

// Test database connectivity
async function testDatabaseConnection(dbUrl) {
  console.log('\n🔌 Testing database connection...')

  return new Promise((resolve, reject) => {
    const testProcess = spawn('npx', ['prisma', 'migrate', 'status'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: dbUrl
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    })

    let output = ''
    let error = ''

    testProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    testProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    const timeout = setTimeout(() => {
      testProcess.kill('SIGKILL')
      reject(new Error('Connection test timed out after 15 seconds'))
    }, 15000)

    testProcess.on('close', (code) => {
      clearTimeout(timeout)

      console.log('\n--- Prisma Output ---')
      console.log(output)
      if (error) {
        console.log('\n--- Prisma Errors ---')
        console.log(error)
      }
      console.log('--- End Output ---\n')

      if (code === 0) {
        resolve({ success: true, output })
      } else if (output.includes('Could not connect') || error.includes('Could not connect')) {
        reject(new Error('Cannot connect to database - server may be down or unreachable'))
      } else if (output.includes('does not exist') || error.includes('does not exist')) {
        reject(new Error('Database does not exist - needs to be created'))
      } else if (output.includes('connection') || error.includes('connection')) {
        reject(new Error('Connection error - check credentials and network'))
      } else {
        // Non-zero exit but may have migrated - consider success
        resolve({ success: true, output, warning: 'Exit code non-zero but connection may be OK' })
      }
    })

    testProcess.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

// Main diagnostic
async function main() {
  // Step 1: Check environment files
  console.log('Step 1: Checking environment files...\n')
  const foundVars = loadEnvFiles()

  if (Object.keys(foundVars).length === 0) {
    console.log('\n❌ DATABASE_URL not found in any environment file!')
    console.log('\nRequired files:')
    console.log('  • .env')
    console.log('  • .env.local')
    console.log('  • config/service.env')
    process.exit(1)
  }

  console.log('\n✓ Found DATABASE_URL in:', Object.keys(foundVars).join(', '))

  // Step 2: Show DATABASE_URL from each file
  console.log('\n' + '='.repeat(60))
  console.log('Step 2: DATABASE_URL values found\n')

  Object.entries(foundVars).forEach(([file, url]) => {
    console.log(`📄 ${file}:`)
    const parsed = parseDatabaseUrl(url)

    if (parsed.error) {
      console.log(`   ❌ ${parsed.error}\n`)
    } else {
      console.log(`   Protocol: ${parsed.protocol}`)
      console.log(`   User:     ${parsed.user}`)
      console.log(`   Password: ${'*'.repeat(parsed.password.length)}`)
      console.log(`   Host:     ${parsed.host}`)
      console.log(`   Port:     ${parsed.port}`)
      console.log(`   Database: ${parsed.database}\n`)
    }
  })

  // Step 3: Test connection with each DATABASE_URL
  console.log('='.repeat(60))
  console.log('Step 3: Testing database connections\n')

  for (const [file, url] of Object.entries(foundVars)) {
    console.log(`\nTesting connection from ${file}...`)
    console.log('─'.repeat(60))

    try {
      const result = await testDatabaseConnection(url)
      console.log(`✅ Connection successful from ${file}`)
      if (result.warning) {
        console.log(`⚠️  ${result.warning}`)
      }
    } catch (error) {
      console.log(`❌ Connection failed from ${file}:`)
      console.log(`   ${error.message}`)
    }
  }

  // Step 4: Recommendations
  console.log('\n' + '='.repeat(60))
  console.log('Step 4: Recommendations\n')

  console.log('If connections failed, check:')
  console.log('  1. Is PostgreSQL service running?')
  console.log('     • Windows: Check Services or run `sc query postgresql-x64-14`')
  console.log('     • Linux: `sudo systemctl status postgresql`')
  console.log('')
  console.log('  2. Does the database exist?')
  console.log('     • Run: psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = \'multi_business_db\'"')
  console.log('')
  console.log('  3. Are credentials correct?')
  console.log('     • Test: psql -U postgres -d multi_business_db')
  console.log('')
  console.log('  4. Is PostgreSQL accepting connections on localhost:5432?')
  console.log('     • Check pg_hba.conf for localhost trust/md5')
  console.log('     • Check postgresql.conf for listen_addresses')
  console.log('')
  console.log('  5. Firewall blocking connections?')
  console.log('     • Ensure port 5432 is not blocked locally')
  console.log('')

  console.log('='.repeat(60) + '\n')
}

main().catch(error => {
  console.error('\n❌ Diagnostic failed:', error.message)
  process.exit(1)
})
