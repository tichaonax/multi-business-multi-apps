#!/usr/bin/env node

/**
 * Post-install script that handles Prisma client generation with retries
 * to work around Windows file locking issues
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.join(__dirname, '..')

function generatePrismaClient(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Generating Prisma client (attempt ${attempt}/${maxRetries})...`)
      execSync('npx prisma generate', {
        cwd: ROOT_DIR,
        stdio: 'inherit'
      })
      console.log('✅ Prisma client generated successfully')
      return true
    } catch (error) {
      console.warn(`⚠️  Prisma generation attempt ${attempt} failed: ${error.message}`)

      if (attempt < maxRetries) {
        console.log('⏳ Waiting 3 seconds before retry...')
        // Wait 3 seconds
        execSync('ping -n 4 127.0.0.1 > nul', { stdio: 'pipe' })

        // Try to clean the problematic file
        try {
          const prismaClientPath = path.join(ROOT_DIR, 'node_modules', '.prisma', 'client')
          if (fs.existsSync(prismaClientPath)) {
            const files = fs.readdirSync(prismaClientPath)
            const tmpFiles = files.filter(file => file.endsWith('.tmp'))
            tmpFiles.forEach(file => {
              const tmpPath = path.join(prismaClientPath, file)
              try {
                fs.unlinkSync(tmpPath)
                console.log(`🧹 Cleaned temporary file: ${file}`)
              } catch (e) {
                // Ignore cleanup errors
              }
            })
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  console.error('❌ Failed to generate Prisma client after all retries')
  process.exit(1)
}

console.log('🔄 Running post-install tasks...')
generatePrismaClient()
console.log('✅ Post-install completed successfully')