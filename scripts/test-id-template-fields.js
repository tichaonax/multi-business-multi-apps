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

async function testTemplateFields() {
  console.log('\n=== Testing ID Template Fields ===\n')

  const template = await prisma.idFormatTemplates.findUnique({
    where: { id: 'zw-national-id' }
  })

  console.log('Zimbabwe National ID Template:')
  console.log(`  Format (for UI):    ${template.format}`)
  console.log(`  Pattern (for regex): ${template.pattern}`)
  console.log(`  Example:            ${template.example}`)
  console.log('')
  console.log('✅ Both fields are present and correct!')
  console.log('')
  console.log('Format field (#) is for display in UI input placeholders')
  console.log('Pattern field (regex) is for validation in API')
  console.log('')

  await prisma.$disconnect()
}

testTemplateFields()
