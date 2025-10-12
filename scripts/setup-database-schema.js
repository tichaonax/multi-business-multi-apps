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
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

/**
 * Stop Windows service if running (critical for releasing Prisma DLL locks)
 */
function stopWindowsService() {
  try {
    const SERVICE_NAME = 'multibusinesssyncservice';
    const SC = process.env.SC_COMMAND || 'sc.exe';

    log('Checking Windows service status...', 'INFO');

    // Check if service exists and is running
    try {
      const queryResult = spawnSync(SC, ['query', SERVICE_NAME], {
        encoding: 'utf-8',
        windowsHide: true
      });

      const output = queryResult.stdout || '';

      if (output.includes('does not exist') || output.includes('1060')) {
        log('Windows service is not installed - skipping service stop', 'INFO');
        return true;
      }

      if (output.includes('STOPPED')) {
        log('Windows service is already stopped', 'INFO');
        return true;
      }

      if (output.includes('RUNNING') || output.includes('START_PENDING')) {
        log('Windows service is running - stopping it to release file locks...', 'WARN');

        // Stop the service
        const stopResult = spawnSync(SC, ['stop', SERVICE_NAME], {
          encoding: 'utf-8',
          windowsHide: true
        });

        if (stopResult.stderr && stopResult.stderr.includes('Access is denied')) {
          log('⚠️  Cannot stop service - requires Administrator privileges', 'WARN');
          log('Please run this command as Administrator, or manually stop the service', 'WARN');
          return false;
        }

        // Wait for service to fully stop (up to 30 seconds)
        log('Waiting for service to stop completely...', 'INFO');
        const maxWaitTime = 30000; // 30 seconds
        const checkInterval = 1000; // 1 second
        const startTime = Date.now();

        while ((Date.now() - startTime) < maxWaitTime) {
          const statusResult = spawnSync(SC, ['query', SERVICE_NAME], {
            encoding: 'utf-8',
            windowsHide: true
          });

          const statusOutput = statusResult.stdout || '';

          if (statusOutput.includes('STOPPED')) {
            log('✅ Service stopped successfully', 'SUCCESS');

            // Extra wait for file handles to release
            log('Waiting 5 seconds for file handles to release...', 'INFO');
            const waitStart = Date.now();
            while (Date.now() - waitStart < 5000) {
              // Busy wait
            }

            return true;
          }

          if (statusOutput.includes('STOP_PENDING')) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            log(`Service is stopping... (${elapsed}s)`, 'INFO');
          }

          // Wait before next check
          const checkStart = Date.now();
          while (Date.now() - checkStart < checkInterval) {
            // Busy wait
          }
        }

        log('⚠️  Service did not stop within 30 seconds', 'WARN');
        return false;
      }

    } catch (err) {
      log(`Could not check service status: ${err.message}`, 'WARN');
      return false;
    }

    return true;

  } catch (error) {
    log(`Warning: Could not stop Windows service: ${error.message}`, 'WARN');
    return false;
  }
}

/**
 * Kill all Node.js processes that might have Prisma client loaded
 * This helps release file locks on query_engine-windows.dll.node
 */
function killStaleNodeProcesses() {
  try {
    log('Killing stale Node.js processes to release file locks...', 'INFO');

    // Get current process ID to avoid killing ourselves
    const currentPid = process.pid;

    // Kill other node processes (Windows)
    try {
      const result = spawnSync('taskkill', ['/F', '/IM', 'node.exe', '/FI', `PID ne ${currentPid}`], {
        encoding: 'utf-8',
        windowsHide: true
      });

      if (result.stdout && result.stdout.includes('SUCCESS')) {
        log('Killed stale Node.js processes', 'SUCCESS');
      } else if (result.stderr && result.stderr.includes('not found')) {
        log('No stale Node.js processes found', 'INFO');
      }
    } catch (err) {
      // Ignore errors - processes might not exist
      log('No stale processes to kill', 'INFO');
    }

    // Wait for OS to release file handles
    const waitMs = 3000;
    log(`Waiting ${waitMs}ms for file handles to release...`, 'INFO');
    const start = Date.now();
    while (Date.now() - start < waitMs) {
      // Busy wait
    }

    return true;
  } catch (error) {
    log(`Warning: Could not kill stale processes: ${error.message}`, 'WARN');
    return false;
  }
}

/**
 * Clean up Prisma temporary files that might be causing locks
 */
function cleanupPrismaTemporaryFiles() {
  try {
    log('Cleaning up Prisma temporary files...', 'INFO');

    const prismaClientDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');

    if (!fs.existsSync(prismaClientDir)) {
      log('Prisma client directory does not exist - nothing to clean', 'INFO');
      return true;
    }

    // Find and remove .tmp files
    const files = fs.readdirSync(prismaClientDir);
    let cleaned = 0;

    for (const file of files) {
      if (file.includes('.tmp')) {
        const filePath = path.join(prismaClientDir, file);
        try {
          fs.unlinkSync(filePath);
          cleaned++;
          log(`Removed temporary file: ${file}`, 'INFO');
        } catch (err) {
          log(`Could not remove ${file}: ${err.message}`, 'WARN');
        }
      }
    }

    if (cleaned > 0) {
      log(`Cleaned up ${cleaned} temporary file(s)`, 'SUCCESS');
    } else {
      log('No temporary files to clean', 'INFO');
    }

    return true;
  } catch (error) {
    log(`Warning: Could not clean temporary files: ${error.message}`, 'WARN');
    return false;
  }
}

/**
 * Generate Prisma client with retry logic for Windows EPERM errors
 */
function generatePrismaClientWithRetries(maxAttempts = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log(`Generating Prisma client (attempt ${attempt}/${maxAttempts})`, 'INFO');

      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      log('✅ Prisma client generated successfully', 'SUCCESS');
      return true;

    } catch (error) {
      const errorMsg = error.message || String(error);

      if (errorMsg.includes('EPERM') || errorMsg.includes('operation not permitted')) {
        log(`EPERM error on attempt ${attempt} - file is locked`, 'WARN');

        if (attempt < maxAttempts) {
          log(`Attempting to resolve file locks...`, 'INFO');

          // Try to clean up processes and temporary files
          killStaleNodeProcesses();
          cleanupPrismaTemporaryFiles();

          log(`Waiting ${delayMs}ms before retry...`, 'INFO');
          const start = Date.now();
          while (Date.now() - start < delayMs) {
            // Busy wait
          }

        } else {
          log('❌ All retry attempts exhausted', 'ERROR');
          console.log('\n============================================================');
          console.log('🔧 MANUAL REMEDIATION REQUIRED');
          console.log('============================================================');
          console.log('\nThe Prisma client generation is failing due to file locks.');
          console.log('This typically happens when:');
          console.log('  1. Another Node.js process has the Prisma client loaded');
          console.log('  2. Antivirus software is scanning the files');
          console.log('  3. File handles were not released properly\n');
          console.log('📖 Steps to resolve:');
          console.log('  1. Close all Node.js processes:');
          console.log('     taskkill /F /IM node.exe');
          console.log('  2. Wait 10 seconds for file handles to release');
          console.log('  3. Manually delete temporary files:');
          console.log('     del /F /Q node_modules\\.prisma\\client\\*.tmp*');
          console.log('  4. Try running this script again');
          console.log('  5. If still failing, restart your computer\n');

          return false;
        }
      } else {
        // Non-EPERM error - don't retry
        log(`❌ Prisma generation failed: ${errorMsg}`, 'ERROR');
        return false;
      }
    }
  }

  return false;
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

async function checkHasUsers() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const count = await prisma.users.count();
    await prisma.$disconnect();
    return count > 0;
  } catch (error) {
    // Table doesn't exist or other error - assume no users
    return false;
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('🔧 Database Schema Setup');
  console.log('============================================================\n');

  try {
    // Pre-check: Stop Windows service and clean up stale processes/files
    log('Pre-check: Stopping Windows service and cleaning up...', 'INFO');
    console.log('');

    // CRITICAL: Stop Windows service first (it holds Prisma DLL locks)
    const serviceStopped = stopWindowsService();

    // Then kill any remaining Node processes
    killStaleNodeProcesses();

    // Finally clean up temporary files
    cleanupPrismaTemporaryFiles();

    console.log('');
    if (!serviceStopped) {
      log('⚠️  WARNING: Could not stop Windows service', 'WARN');
      log('If Prisma generation fails with EPERM errors, manually stop the service:', 'WARN');
      log('  1. Run as Administrator: sc stop multibusinesssyncservice', 'WARN');
      log('  2. Or use: npm run service:stop', 'WARN');
      console.log('');
    }

    log('Pre-check completed\n', 'SUCCESS');

    // Step 1: Create database if needed
    log('Step 1: Creating database if needed...', 'INFO');
    await createDatabase();

    // Step 2: Generate Prisma client (with retry + cleanup for Windows EPERM locks)
    log('\nStep 2: Generating Prisma client...', 'INFO');
    const prismaGenOk = generatePrismaClientWithRetries(5, 2000);
    if (!prismaGenOk) {
      throw new Error('Prisma client generation failed after retries. See logs above for remediation steps.');
    }

    // Step 3: Deploy migrations (simple and clean)
    log('\nStep 3: Deploying database migrations...', 'INFO');
    execCommand('npx prisma migrate deploy', 'Deploying migrations');

    // Step 4: Regenerate Prisma client AFTER migrations (critical!)
    // This ensures the seeding script has access to all models
    log('\nStep 4: Regenerating Prisma client with new schema...', 'INFO');
    log('This ensures production-setup.js can access all models', 'INFO');
    const prismaRegenerateOk = generatePrismaClientWithRetries(3, 2000);
    if (!prismaRegenerateOk) {
      throw new Error('Prisma client regeneration failed after migrations. See logs above for remediation steps.');
    }

    console.log('\n============================================================');
    console.log('✅ Database Schema Setup Completed!');
    console.log('============================================================');

    // Only show "Next Step" message if database has no users (fresh install needs seeding)
    const hasUsers = await checkHasUsers();
    if (!hasUsers) {
      console.log('\n📋 Next Step:');
      console.log('   Run: node scripts/production-setup.js');
      console.log('   This will seed reference data and create admin user\n');
    }

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
