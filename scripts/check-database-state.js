/**
 * Database State Detection Utility
 *
 * Checks if database exists and if it has schema/data
 * Used to determine fresh install vs upgrade workflow
 */

const { Client } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkDatabaseState() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('❌ DATABASE_URL not found in environment');
    return {
      exists: false,
      hasSchema: false,
      hasMigrations: false,
      isEmpty: true
    };
  }

  // Parse database URL
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1); // Remove leading '/'

  // Connect to postgres database to check if target database exists
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres'; // Connect to postgres database

  const adminClient = new Client({ connectionString: adminUrl.toString() });

  try {
    await adminClient.connect();

    // Check if database exists
    const dbCheckQuery = `
      SELECT EXISTS(
        SELECT 1 FROM pg_database WHERE datname = $1
      ) as exists;
    `;

    const dbResult = await adminClient.query(dbCheckQuery, [dbName]);
    const dbExists = dbResult.rows[0].exists;

    await adminClient.end();

    if (!dbExists) {
      console.log(`ℹ️  Database '${dbName}' does not exist`);
      return {
        exists: false,
        hasSchema: false,
        hasMigrations: false,
        isEmpty: true
      };
    }

    console.log(`✅ Database '${dbName}' exists`);

    // Connect to target database to check schema
    const dbClient = new Client({ connectionString: databaseUrl });
    await dbClient.connect();

    try {
      // Check if any tables exist (excluding Prisma migration table)
      const tableQuery = `
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations';
      `;

      const tableResult = await dbClient.query(tableQuery);
      const tableCount = parseInt(tableResult.rows[0].count);

      // Check if _prisma_migrations table exists
      const migrationTableQuery = `
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
        ) as exists;
      `;

      const migrationResult = await dbClient.query(migrationTableQuery);
      const hasMigrations = migrationResult.rows[0].exists;

      const hasSchema = tableCount > 0;
      const isEmpty = tableCount === 0 && !hasMigrations;

      console.log(`ℹ️  Tables in database: ${tableCount}`);
      console.log(`ℹ️  Has migration history: ${hasMigrations}`);
      console.log(`ℹ️  Database state: ${isEmpty ? 'EMPTY' : 'HAS DATA'}`);

      await dbClient.end();

      return {
        exists: true,
        hasSchema,
        hasMigrations,
        isEmpty,
        tableCount
      };

    } catch (error) {
      await dbClient.end();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error checking database state:', error.message);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { checkDatabaseState };

// Allow running directly
if (require.main === module) {
  checkDatabaseState()
    .then(state => {
      console.log('\n📊 Database State:');
      console.log(JSON.stringify(state, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to check database state:', error);
      process.exit(1);
    });
}
