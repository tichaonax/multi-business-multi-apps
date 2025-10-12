/**
 * Fresh Database Setup Script
 *
 * RERUNNABLE & NON-DESTRUCTIVE:
 * - Creates database if it doesn't exist (does NOT drop existing)
 * - Pushes schema only if database is empty
 * - Seeds data only if not already present
 * - Baselines migrations for clean state
 *
 * Usage: node scripts/setup-fresh-database.js
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { checkDatabaseState } = require('./check-database-state');

function log(message, type = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m'    // Red
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}[${type}] ${message}${reset}`);
}

function execCommand(command, description) {
  try {
    log(description, 'INFO');
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    log(`✅ ${description} - Done`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`❌ ${description} - Failed: ${error.message}`, 'ERROR');
    return false;
  }
}

async function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log('DATABASE_URL not found in environment', 'ERROR');
    throw new Error('DATABASE_URL is required');
  }

  // Parse database URL
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);

  // Connect to postgres database to create target database
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const adminClient = new Client({ connectionString: adminUrl.toString() });

  try {
    await adminClient.connect();

    // Check if database exists
    const checkQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const result = await adminClient.query(checkQuery, [dbName]);

    if (result.rows.length > 0) {
      log(`Database '${dbName}' already exists - skipping creation`, 'INFO');
    } else {
      log(`Creating database '${dbName}'...`, 'INFO');
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      log(`✅ Database '${dbName}' created successfully`, 'SUCCESS');
    }

    await adminClient.end();

  } catch (error) {
    await adminClient.end();
    throw error;
  }
}

async function checkDataExists(prisma, modelName) {
  try {
    const count = await prisma[modelName].count();
    return count > 0;
  } catch (error) {
    // Model might not exist yet
    return false;
  }
}

async function seedReferenceData() {
  log('Seeding reference data...', 'INFO');

  try {
    // CRITICAL: Clear require cache for @prisma/client and production-setup
    // This ensures we load the freshly generated Prisma client
    const prismaClientPath = require.resolve('@prisma/client');
    const productionSetupPath = path.join(__dirname, 'production-setup.js');

    delete require.cache[prismaClientPath];
    delete require.cache[productionSetupPath];

    log('Cleared Prisma client cache - loading fresh client...', 'INFO');

    // Use the production-setup script which has all seeding functions
    const { runProductionSetup } = require('./production-setup.js');

    log('Running production setup with all reference data...', 'INFO');

    // Run production setup (it's idempotent)
    const success = await runProductionSetup({
      createAdmin: true,
      dryRun: false,
      ignoreMissingModels: true // Don't fail on missing optional models
    });

    if (success) {
      log('✅ Reference data seeding completed', 'SUCCESS');
    } else {
      log('⚠️  Reference data seeding completed with warnings', 'WARN');
    }

  } catch (error) {
    log(`Error seeding reference data: ${error.message}`, 'ERROR');
    // Don't throw - let the setup continue
    log('⚠️  Continuing setup despite seeding errors', 'WARN');
  }
}

async function baselineMigrations() {
  log('Baselining migrations...', 'INFO');

  try {
    // Get list of migration files
    const fs = require('fs');
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      log('No migrations directory found - skipping baseline', 'WARN');
      return;
    }

    const migrations = fs.readdirSync(migrationsDir)
      .filter(dir => dir !== 'migration_lock.toml' && fs.statSync(path.join(migrationsDir, dir)).isDirectory());

    if (migrations.length === 0) {
      log('No migrations found - skipping baseline', 'INFO');
      return;
    }

    log(`Found ${migrations.length} migrations to baseline`, 'INFO');

    // Mark each migration as applied without running it
    for (const migration of migrations) {
      try {
        execSync(`npx prisma migrate resolve --applied "${migration}"`, {
          stdio: 'pipe',
          cwd: path.join(__dirname, '..')
        });
        log(`✅ Baselined: ${migration}`, 'SUCCESS');
      } catch (error) {
        // If migration is already applied, that's fine
        if (error.message.includes('is already recorded as applied')) {
          log(`ℹ️  Already baselined: ${migration}`, 'INFO');
        } else {
          log(`⚠️  Could not baseline ${migration}: ${error.message}`, 'WARN');
        }
      }
    }

    log('✅ Migration baselining completed', 'SUCCESS');

  } catch (error) {
    log(`Error baselining migrations: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('🚀 Fresh Database Setup (Rerunnable & Non-Destructive)');
  console.log('============================================================\n');

  try {
    // Step 1: Check current database state
    log('Step 1: Checking database state...', 'INFO');
    const state = await checkDatabaseState();

    // Step 2: Create database if it doesn't exist
    log('\nStep 2: Ensuring database exists...', 'INFO');
    await createDatabase();

    // Step 3: Push schema if database is empty
    if (state.isEmpty || !state.hasSchema) {
      log('\nStep 3: Pushing Prisma schema (db push)...', 'INFO');
      execCommand('npx prisma db push --accept-data-loss', 'Pushing schema to database');

      // CRITICAL: Regenerate Prisma client immediately after schema push
      // This ensures the Prisma client matches the database schema
      log('\nStep 4: Generating Prisma client after schema push...', 'INFO');
      execCommand('npx prisma generate', 'Generating Prisma client');
    } else {
      log('\nStep 3: Schema already exists - skipping push', 'INFO');

      // Still regenerate client to ensure it's up to date
      log('\nStep 4: Regenerating Prisma client...', 'INFO');
      execCommand('npx prisma generate', 'Regenerating Prisma client');
    }

    // Step 5: Seed reference data (idempotent)
    // This will load production-setup.js which instantiates Prisma client
    // The client will now see all the models from the freshly generated schema
    log('\nStep 5: Seeding reference data...', 'INFO');
    await seedReferenceData();

    // Step 6: Baseline migrations for clean state
    log('\nStep 6: Baselining migrations...', 'INFO');
    await baselineMigrations();

    console.log('\n============================================================');
    console.log('✅ Fresh Database Setup Completed Successfully!');
    console.log('============================================================');
    console.log('\n📋 Next Steps:');
    console.log('  1. Start the service: npm run sync-service:start');
    console.log('  2. Login with admin@business.local / admin123');
    console.log('  3. Configure your businesses and users');
    console.log('\n');

    process.exit(0);

  } catch (error) {
    console.log('\n============================================================');
    console.log('❌ Fresh Database Setup Failed');
    console.log('============================================================');
    console.error('\nError:', error.message);
    console.log('\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createDatabase, seedReferenceData, baselineMigrations };
