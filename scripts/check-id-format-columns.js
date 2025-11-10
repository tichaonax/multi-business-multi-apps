#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkColumns() {
  try {
    console.log('🔍 Checking id_format_templates table structure...\n')

    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'id_format_templates'
      ORDER BY ordinal_position
    `

    console.log('📊 Current columns:')
    console.table(columns)

    const hasFormat = columns.some(col => col.column_name === 'format')
    const hasPattern = columns.some(col => col.column_name === 'pattern')

    console.log('\n✅ Column Status:')
    console.log(`   format:  ${hasFormat ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`   pattern: ${hasPattern ? '✅ EXISTS' : '❌ MISSING'}`)

    // Try to count existing templates
    const count = await prisma.idFormatTemplates.count()
    console.log(`\n📝 Existing templates: ${count}`)

    if (count > 0) {
      console.log('\n🔍 Sample template:')
      const sample = await prisma.idFormatTemplates.findFirst()
      console.log(JSON.stringify(sample, null, 2))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkColumns()
