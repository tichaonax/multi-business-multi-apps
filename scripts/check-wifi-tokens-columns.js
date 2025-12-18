const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkColumns() {
  try {
    // Try to query with all columns
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'wifi_tokens'
      ORDER BY ordinal_position
    `

    console.log('=== wifi_tokens Table Columns ===\n')
    result.forEach(col => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable}`)
    })

    // Check for missing device tracking columns
    const columnNames = result.map(c => c.column_name)
    const requiredColumns = [
      'deviceCount',
      'deviceType',
      'firstSeen',
      'hostname',
      'lastSeen',
      'primaryMac'
    ]

    console.log('\n=== Device Tracking Columns ===')
    requiredColumns.forEach(col => {
      const exists = columnNames.includes(col)
      console.log(`${col.padEnd(20)} ${exists ? '✓ EXISTS' : '❌ MISSING'}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkColumns()
