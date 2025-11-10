// Load environment variables
const path = require('path')
const fs = require('fs')
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=')
      process.env[key.trim()] = valueParts.join('=').replace(/^"(.*)"$/, '$1').trim()
    }
  })
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixIdPatterns() {
  try {
    console.log('\n=== Fixing ID Format Template Patterns ===\n')

    const templates = [
      {
        id: 'zw-national-id',
        format: '##-######?##',
        pattern: '^\\d{2}-\\d{6}[A-Z]\\d{2}$',
        example: '63-123456A78'
      },
      {
        id: 'za-id-number',
        format: '#############',
        pattern: '^\\d{13}$',
        example: '8001015009087'
      },
      {
        id: 'bw-omang',
        format: '#########',
        pattern: '^\\d{9}$',
        example: '123456789'
      },
      {
        id: 'ke-national-id',
        format: '########',
        pattern: '^\\d{8}$',
        example: '12345678'
      },
      {
        id: 'zm-nrc',
        format: '######/##/#',
        pattern: '^\\d{6}/\\d{2}/\\d$',
        example: '123456/78/1'
      }
    ]

    for (const template of templates) {
      console.log(`Updating ${template.id}...`)

      const updated = await prisma.idFormatTemplates.update({
        where: { id: template.id },
        data: {
          format: template.format,
          pattern: template.pattern
        }
      })

      // Test the pattern
      const regex = new RegExp(updated.pattern)
      const testResult = regex.test(template.example)

      console.log(`  Format: ${updated.format}`)
      console.log(`  Pattern: ${updated.pattern}`)
      console.log(`  Example: ${template.example}`)
      console.log(`  Test: ${testResult ? '✅ PASS' : '❌ FAIL'}`)
      console.log('')
    }

    console.log('✅ All ID format patterns updated successfully!\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixIdPatterns()
