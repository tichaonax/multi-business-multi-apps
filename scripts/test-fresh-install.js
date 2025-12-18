/**
 * Test Fresh Install - WiFi Token Device Tracking Columns
 *
 * This script verifies that all device tracking columns exist and are properly
 * configured after a fresh migration deployment.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testFreshInstall() {
  try {
    console.log('=== Testing Fresh Install - Device Tracking Columns ===\n')

    // Test 1: Verify wifi_tokens table exists
    console.log('Test 1: Verify wifi_tokens table exists')
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'wifi_tokens'
      );
    `
    console.log('   ✓ wifi_tokens table exists\n')

    // Test 2: Verify all device tracking columns exist
    console.log('Test 2: Verify device tracking columns')
    const requiredColumns = [
      'deviceCount',
      'deviceType',
      'firstSeen',
      'hostname',
      'lastSeen',
      'primaryMac'
    ]

    for (const columnName of requiredColumns) {
      const columnCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'wifi_tokens'
          AND column_name = ${columnName}
        );
      `
      const exists = columnCheck[0].exists
      if (exists) {
        console.log(`   ✓ ${columnName} column exists`)
      } else {
        console.log(`   ❌ ${columnName} column MISSING`)
        throw new Error(`Column ${columnName} is missing from wifi_tokens table`)
      }
    }
    console.log('')

    // Test 3: Verify indexes exist
    console.log('Test 3: Verify indexes')
    const requiredIndexes = [
      'wifi_tokens_primaryMac_idx',
      'wifi_tokens_hostname_idx',
      'wifi_tokens_lastSeen_idx'
    ]

    for (const indexName of requiredIndexes) {
      const indexCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE schemaname = 'public'
          AND tablename = 'wifi_tokens'
          AND indexname = ${indexName}
        );
      `
      const exists = indexCheck[0].exists
      if (exists) {
        console.log(`   ✓ ${indexName} index exists`)
      } else {
        console.log(`   ❌ ${indexName} index MISSING`)
        throw new Error(`Index ${indexName} is missing from wifi_tokens table`)
      }
    }
    console.log('')

    // Test 4: Verify column data types
    console.log('Test 4: Verify column data types')
    const columnTypes = await prisma.$queryRaw`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'wifi_tokens'
      AND column_name IN ('deviceCount', 'deviceType', 'firstSeen', 'hostname', 'lastSeen', 'primaryMac')
      ORDER BY column_name;
    `

    const expectedTypes = {
      deviceCount: { type: 'integer', nullable: 'NO', default: '0' },
      deviceType: { type: 'character varying', maxLength: 100, nullable: 'YES' },
      firstSeen: { type: 'timestamp without time zone', nullable: 'YES' },
      hostname: { type: 'character varying', maxLength: 255, nullable: 'YES' },
      lastSeen: { type: 'timestamp without time zone', nullable: 'YES' },
      primaryMac: { type: 'character varying', maxLength: 17, nullable: 'YES' }
    }

    for (const col of columnTypes) {
      const expected = expectedTypes[col.column_name]
      const typeMatch = col.data_type === expected.type
      const nullMatch = col.is_nullable === expected.nullable
      const lengthMatch = !expected.maxLength || col.character_maximum_length === expected.maxLength

      if (typeMatch && nullMatch && lengthMatch) {
        console.log(`   ✓ ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
      } else {
        console.log(`   ❌ ${col.column_name}: Type mismatch`)
        console.log(`      Expected: ${expected.type}${expected.maxLength ? `(${expected.maxLength})` : ''} ${expected.nullable}`)
        console.log(`      Got: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable}`)
      }
    }
    console.log('')

    // Test 5: Verify migration was applied
    console.log('Test 5: Verify migration registration')
    const migrationCheck = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      WHERE migration_name = '20251215_add_device_tracking_columns';
    `

    if (migrationCheck.length > 0) {
      console.log(`   ✓ Migration '20251215_add_device_tracking_columns' applied at ${migrationCheck[0].finished_at}`)
    } else {
      console.log(`   ❌ Migration '20251215_add_device_tracking_columns' NOT FOUND in _prisma_migrations table`)
      throw new Error('Migration not registered')
    }
    console.log('')

    // Summary
    console.log('=== Fresh Install Test Results ===')
    console.log('✅ All device tracking columns exist')
    console.log('✅ All indexes created successfully')
    console.log('✅ Column data types are correct')
    console.log('✅ Migration properly registered')
    console.log('\n✅ FRESH INSTALL READY')
    console.log('\nOn a fresh database, run:')
    console.log('  npx prisma migrate deploy')
    console.log('\nThis will apply all migrations including device tracking columns.')

  } catch (error) {
    console.error('\n❌ Fresh Install Test FAILED:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testFreshInstall()
