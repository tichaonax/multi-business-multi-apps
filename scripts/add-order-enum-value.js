const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addEnumValue() {
  try {
    // Safe DO block: find OrderType (case-insensitive) and add KITCHEN_TICKET if missing
    const sql = `DO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderType' OR lower(typname) = lower('OrderType')) THEN\n    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderType' OR lower(typname) = lower('OrderType')) AND enumlabel = 'KITCHEN_TICKET') THEN\n      EXECUTE format('ALTER TYPE %I ADD VALUE %L', (SELECT typname FROM pg_type WHERE typname = 'OrderType' OR lower(typname) = lower('OrderType') LIMIT 1), 'KITCHEN_TICKET');\n    END IF;\n  ELSE\n    RAISE NOTICE 'OrderType enum not found';\n  END IF;\nEND$$;`

    const out = await prisma.$executeRawUnsafe(sql)
    console.log('Enum update executed:', out)
  } catch (err) {
    console.error('Failed to add enum value:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) addEnumValue()
