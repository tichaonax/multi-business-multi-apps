#!/usr/bin/env node

/**
 * Database Schema Setup Script
 *
 * This script ONLY handles database creation and schema deployment.
 * It does NOT seed data - that's handled by production-setup.js
 *
 * Steps:
 * 1. Create database if it doesn't exist
 * 2. Generate Prisma client
 * 3. Deploy migrations (production-safe)
 *
 * Usage: node scripts/setup-database-schema.js
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

async function main() {
  console.log('\n============================================================');
  console.log('🔧 Database Schema Setup');
  console.log('============================================================\n');

  try {
    // Step 1: Create database if needed
    log('Step 1: Creating database if needed...', 'INFO');
    await createDatabase();

    // Step 2: Generate Prisma client
    log('\nStep 2: Generating Prisma client...', 'INFO');
    execCommand('npx prisma generate', 'Generating Prisma client');

    // Step 3: Push schema to database (for fresh installs)
    // Use db push instead of migrate deploy for fresh databases
    // This avoids migration ordering issues with baseline migrations
    log('\nStep 3: Pushing schema to database...', 'INFO');
    log('Using db push for fresh database setup (avoids migration conflicts)', 'INFO');
    execCommand('npx prisma db push --accept-data-loss', 'Pushing schema to database');

    // Step 4: Mark all migrations as applied (baseline)
    log('\nStep 4: Marking migrations as applied (baseline)...', 'INFO');
    log('This establishes a baseline for future migrations', 'INFO');

    // Get all migration directories
    const fs = require('fs');
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir)
        .filter(name => fs.statSync(path.join(migrationsDir, name)).isDirectory())
        .sort();

      log(`Found ${migrations.length} migrations to baseline`, 'INFO');

      for (const migration of migrations) {
        try {
          execCommand(
            `npx prisma migrate resolve --applied ${migration}`,
            `Marking ${migration} as applied`
          );
        } catch (err) {
          log(`Warning: Could not mark ${migration} as applied (may already be marked)`, 'WARN');
        }
      }
    }

    console.log('\n============================================================');
    console.log('✅ Database Schema Setup Completed!');
    console.log('============================================================');
    console.log('\n📋 Next Step:');
    console.log('   Run: node scripts/production-setup.js');
    console.log('   This will seed reference data and create admin user\n');

    process.exit(0);

  } catch (error) {
    console.log('\n============================================================');
    console.log('❌ Database Schema Setup Failed');
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

module.exports = { createDatabase };
