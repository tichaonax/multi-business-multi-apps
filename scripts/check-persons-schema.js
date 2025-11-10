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

async function checkSchema() {
  console.log('\n=== Checking Persons Table Schema ===\n')

  // Query the database directly to see what columns exist
  const result = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'persons'
    ORDER BY ordinal_position
  `

  console.log('Columns in persons table:')
  result.forEach(col => {
    console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
  })

  console.log('\n')

  // Check specifically for ID template fields
  const idFields = result.filter(col =>
    col.column_name.toLowerCase().includes('idformat') ||
    col.column_name.toLowerCase().includes('id_format')
  )

  if (idFields.length > 0) {
    console.log('ID Format Template Fields Found:')
    idFields.forEach(col => {
      console.log(`  ✅ ${col.column_name}`)
    })
  } else {
    console.log('❌ No ID format template field found!')
  }

  console.log('\n')

  await prisma.$disconnect()
}

checkSchema()
