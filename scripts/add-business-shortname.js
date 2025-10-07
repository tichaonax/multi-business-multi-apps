// Script to add businesses.shortName column if missing and populate it from existing name
// Usage: set DATABASE_URL and run: node scripts/add-business-shortname.js

const { Client } = require('pg')

async function main() {
  const conn = process.env.DATABASE_URL
  if (!conn) {
    console.error('Please set DATABASE_URL environment variable')
    process.exit(1)
  }

  const client = new Client({ connectionString: conn })
  await client.connect()

  try {
    console.log('Adding column "shortName" if it does not exist')
    await client.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "shortName" text;`)

    console.log('Populating shortName for rows that are null')
    // Populate shortName by removing spaces from name and taking first 4 chars (uppercased)
    await client.query(`UPDATE businesses SET "shortName" = UPPER(SUBSTRING(REGEXP_REPLACE(name, '\\s+', '', 'g') FROM 1 FOR 4)) WHERE "shortName" IS NULL OR "shortName" = '';`)

    console.log('Done. You may want to run: npx prisma db pull && npx prisma generate')
  } catch (err) {
    console.error('Failed:', err)
    process.exit(2)
  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
