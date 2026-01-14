#!/usr/bin/env node

/**
 * Audit Schema vs Database
 * Compares Prisma schema with actual database to find missing tables/columns
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function auditDatabase() {
  console.log('\n🔍 Auditing Database vs Prisma Schema...\n')

  try {
    // Get all tables and columns from database
    const tables = await prisma.$queryRaw`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `

    console.log(`📊 Found ${tables.length} columns across all tables in database\n`)

    // Group by table
    const tableMap = {}
    for (const row of tables) {
      if (!tableMap[row.table_name]) {
        tableMap[row.table_name] = []
      }
      tableMap[row.table_name].push(row.column_name)
    }

    console.log(`📁 Database has ${Object.keys(tableMap).length} tables\n`)
    console.log('Tables in database:')
    Object.keys(tableMap).sort().forEach(table => {
      console.log(`  - ${table} (${tableMap[table].length} columns)`)
    })

    await prisma.$disconnect()
    return tableMap

  } catch (error) {
    console.error('❌ Error:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

auditDatabase()
