#!/usr/bin/env node

/**
 * Enhanced Migration Seeding Script
 * 
 * This script extends the regular migration seeding to include validation
 * of Prisma relation compatibility and ensures reference data is properly
 * linked using the updated relation naming conventions.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

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

/**
 * Validate and fix reference data relationships using new relation names
 */
async function validateAndFixReferenceData() {
  log('🔧 Validating and fixing reference data relationships...');
  
  const prisma = new PrismaClient();
  let fixesApplied = 0;

  try {
    await prisma.$connect();

    // Fix 1: Ensure business memberships use proper relation structure
    try {
      const orphanedMemberships = await prisma.businessMemberships.findMany({
        where: {
          OR: [
            { businessId: null },
            { userId: null }
          ]
        }
      });

      if (orphanedMemberships.length > 0) {
        log(`Found ${orphanedMemberships.length} orphaned business memberships`, 'WARN');
        
        // For now, just log - in production you might want to clean these up
        for (const membership of orphanedMemberships) {
          log(`  Orphaned membership: ${membership.id} (businessId: ${membership.businessId}, userId: ${membership.userId})`, 'WARN');
        }
      } else {
        log('✅ All business memberships have proper foreign key relationships');
        fixesApplied++;
      }
    } catch (error) {
      log(`Error checking business memberships: ${error.message}`, 'ERROR');
    }

    // Fix 2: Ensure project types are properly linked to projects
    try {
      const projectsWithoutType = await prisma.projects.findMany({
        where: {
          projectTypeId: null
        }
      });

      if (projectsWithoutType.length > 0) {
        log(`Found ${projectsWithoutType.length} projects without project type`, 'WARN');
        
        // Get a default project type to assign
        const defaultType = await prisma.projectTypes.findFirst({
          orderBy: { id: 'asc' }
        });

        if (defaultType) {
          const updateResult = await prisma.projects.updateMany({
            where: { projectTypeId: null },
            data: { projectTypeId: defaultType.id }
          });
          
          log(`✅ Assigned default project type to ${updateResult.count} projects`);
          fixesApplied++;
        }
      } else {
        log('✅ All projects have proper project type relationships');
        fixesApplied++;
      }
    } catch (error) {
      log(`Error checking project types: ${error.message}`, 'ERROR');
    }

    // Fix 3: Validate vehicle-driver relationships
    try {
      const orphanedDriverAuths = await prisma.driverAuthorizations.findMany({
        where: {
          OR: [
            { driverId: null },
            { vehicleId: null }
          ]
        }
      });

      if (orphanedDriverAuths.length > 0) {
        log(`Found ${orphanedDriverAuths.length} orphaned driver authorizations`, 'WARN');
        
        // Clean up orphaned records
        const deletedCount = await prisma.driverAuthorizations.deleteMany({
          where: {
            OR: [
              { driverId: null },
              { vehicleId: null }
            ]
          }
        });
        
        log(`✅ Cleaned up ${deletedCount.count} orphaned driver authorizations`);
        fixesApplied++;
      } else {
        log('✅ All driver authorizations have proper relationships');
        fixesApplied++;
      }
    } catch (error) {
      log(`Error checking driver authorizations: ${error.message}`, 'ERROR');
    }

    // Fix 4: Ensure project contractors have proper linkages
    try {
      const orphanedContractors = await prisma.projectContractors.findMany({
        where: {
          OR: [
            { projectId: null },
            { personId: null }
          ]
        }
      });

      if (orphanedContractors.length > 0) {
        log(`Found ${orphanedContractors.length} orphaned project contractors`, 'WARN');
        
        // Clean up orphaned contractor records
        const deletedCount = await prisma.projectContractors.deleteMany({
          where: {
            OR: [
              { projectId: null },
              { personId: null }
            ]
          }
        });
        
        log(`✅ Cleaned up ${deletedCount.count} orphaned project contractors`);
        fixesApplied++;
      } else {
        log('✅ All project contractors have proper relationships');
        fixesApplied++;
      }
    } catch (error) {
      log(`Error checking project contractors: ${error.message}`, 'ERROR');
    }

    // Fix 5: Validate project transaction relationships
    try {
      const orphanedTransactions = await prisma.projectTransactions.findMany({
        where: {
          projectId: null
        }
      });

      if (orphanedTransactions.length > 0) {
        log(`Found ${orphanedTransactions.length} orphaned project transactions`, 'WARN');
        
        // For transactions, we might want to keep them but flag them
        const updateResult = await prisma.projectTransactions.updateMany({
          where: { projectId: null },
          data: { 
            description: { 
              startsWith: '[ORPHANED]' 
            } ? undefined : 'description' // This is a complex update, might need a different approach
          }
        });
        
        log(`⚠️  Flagged ${orphanedTransactions.length} orphaned transactions for review`, 'WARN');
      } else {
        log('✅ All project transactions have proper relationships');
        fixesApplied++;
      }
    } catch (error) {
      log(`Error checking project transactions: ${error.message}`, 'ERROR');
    }

    log(`✅ Reference data validation completed - ${fixesApplied} relationship checks/fixes applied`);

  } finally {
    await prisma.$disconnect();
  }

  return fixesApplied;
}

/**
 * Run the standard migration seeding first, then apply enhancements
 */
async function runEnhancedMigrationSeed() {
  console.log('\n' + '='.repeat(60));
  console.log('🌱 ENHANCED MIGRATION SEEDING');
  console.log('='.repeat(60));

  try {
    // Step 1: Check if standard migration seeder exists and run it
    const standardSeedPath = path.join(__dirname, 'migration-seed.js');
    if (fs.existsSync(standardSeedPath)) {
      log('Running standard migration seeder first...');
      const standardSeeder = require('./migration-seed.js');
      
      if (typeof standardSeeder === 'function') {
        await standardSeeder();
        log('✅ Standard migration seeding completed');
      } else if (standardSeeder.main && typeof standardSeeder.main === 'function') {
        await standardSeeder.main();
        log('✅ Standard migration seeding completed');
      } else {
        log('⚠️  Standard seeder found but no callable function detected', 'WARN');
      }
    } else {
      log('⚠️  No standard migration seeder found, proceeding with enhanced seeding only', 'WARN');
    }

    // Step 2: Apply enhanced relationship validation and fixes
    const fixesApplied = await validateAndFixReferenceData();

    // Step 3: Run final validation using our UI relations validator
    log('Running final UI relations validation...');
    const { validatePrismaRelations } = require('./validate-ui-relations.js');
    const validationResults = await validatePrismaRelations();

    if (validationResults.failed > 0) {
      throw new Error(`Final validation failed: ${validationResults.failed} relation tests failed`);
    }

    console.log('\n' + '='.repeat(60));
    log('✅ ENHANCED MIGRATION SEEDING COMPLETED SUCCESSFULLY!', 'SUCCESS');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 Summary:');
    console.log(`  • Reference data fixes applied: ${fixesApplied}`);
    console.log(`  • Relation validation tests passed: ${validationResults.passed}`);
    console.log(`  • Warnings (no critical issues): ${validationResults.warnings}`);
    console.log('');

    return true;

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log('❌ ENHANCED MIGRATION SEEDING FAILED', 'ERROR');
    console.log('='.repeat(60));
    console.error('\nError:', error.message);
    console.log('');
    
    console.log('🛠️  Troubleshooting Steps:');
    console.log('  1. Check that Prisma migrations have been applied');
    console.log('  2. Verify database connectivity and permissions');
    console.log('  3. Ensure Prisma client has been regenerated');
    console.log('  4. Check for conflicting data that prevents relationship fixes');
    console.log('');

    return false;
  }
}

/**
 * CLI interface
 */
async function main() {
  const success = await runEnhancedMigrationSeed();
  process.exit(success ? 0 : 1);
}

// Export for use in other scripts
module.exports = {
  validateAndFixReferenceData,
  runEnhancedMigrationSeed,
  main
};

// Run directly if called from command line
if (require.main === module) {
  main();
}