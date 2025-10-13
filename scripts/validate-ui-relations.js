#!/usr/bin/env node

/**
 * UI Relations Validation Script
 * 
 * This script validates that UI components can properly access Prisma relations
 * with the updated naming conventions. It's designed to be called from setup scripts
 * to catch relation access issues before deployment.
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
 * Test Prisma relation access patterns commonly used in UI components
 */
async function validatePrismaRelations() {
  log('🔍 Validating Prisma relation naming conventions...');
  
  const prisma = new PrismaClient();
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  try {
    await prisma.$connect();

    // Test 1: User -> businesses relation (used in user-edit-modal, user-detail-modal)
    try {
      const userWithBusinesses = await prisma.users.findFirst({
        include: { 
          businesses: {
            select: { id: true, name: true, businessType: true }
          }
        }
      });
      
      if (userWithBusinesses && userWithBusinesses.businesses) {
        // Test common UI operations
        const businessNames = userWithBusinesses.businesses.map(b => b.name);
        const businessCount = userWithBusinesses.businesses.length;
        
        results.passed++;
        results.details.push('✅ User.businesses relation: PASS (UI can access business names)');
        log(`  ✅ User.businesses: ${businessCount} businesses found`, 'SUCCESS');
      } else {
        results.warnings++;
        results.details.push('⚠️  User.businesses relation: NO_DATA (relation structure OK, no test data)');
        log('  ⚠️  User.businesses: No data to validate, but structure is correct', 'WARN');
      }
    } catch (error) {
      results.failed++;
      results.details.push(`❌ User.businesses relation: FAIL (${error.message})`);
      log(`  ❌ User.businesses: ${error.message}`, 'ERROR');
    }

    // Test 2: Project -> project_types relation
    try {
      const projectWithType = await prisma.projects.findFirst({
        include: { 
          project_types: {
            select: { id: true, name: true }
          }
        }
      });
      
      if (projectWithType && projectWithType.project_types) {
        results.passed++;
        results.details.push('✅ Project.project_types relation: PASS');
        log(`  ✅ Project.project_types: ${projectWithType.project_types.name}`, 'SUCCESS');
      } else {
        results.warnings++;
        results.details.push('⚠️  Project.project_types relation: NO_DATA');
        log('  ⚠️  Project.project_types: No data to validate', 'WARN');
      }
    } catch (error) {
      results.failed++;
      results.details.push(`❌ Project.project_types relation: FAIL (${error.message})`);
      log(`  ❌ Project.project_types: ${error.message}`, 'ERROR');
    }

    // Test 3: Vehicle -> vehicle_drivers relation
    try {
      const vehicleWithDrivers = await prisma.vehicles.findFirst({
        include: { 
          vehicle_drivers: {
            select: { id: true, licenseNumber: true }
          }
        }
      });
      
      if (vehicleWithDrivers && vehicleWithDrivers.vehicle_drivers) {
        const driverCount = vehicleWithDrivers.vehicle_drivers.length;
        results.passed++;
        results.details.push('✅ Vehicle.vehicle_drivers relation: PASS');
        log(`  ✅ Vehicle.vehicle_drivers: ${driverCount} drivers found`, 'SUCCESS');
      } else {
        results.warnings++;
        results.details.push('⚠️  Vehicle.vehicle_drivers relation: NO_DATA');
        log('  ⚠️  Vehicle.vehicle_drivers: No data to validate', 'WARN');
      }
    } catch (error) {
      results.failed++;
      results.details.push(`❌ Vehicle.vehicle_drivers relation: FAIL (${error.message})`);
      log(`  ❌ Vehicle.vehicle_drivers: ${error.message}`, 'ERROR');
    }

    // Test 4: Project -> project_contractors relation
    try {
      const projectWithContractors = await prisma.projects.findFirst({
        include: { 
          project_contractors: {
            select: { id: true, contractValue: true }
          }
        }
      });
      
      if (projectWithContractors && projectWithContractors.project_contractors) {
        const contractorCount = projectWithContractors.project_contractors.length;
        results.passed++;
        results.details.push('✅ Project.project_contractors relation: PASS');
        log(`  ✅ Project.project_contractors: ${contractorCount} contractors found`, 'SUCCESS');
      } else {
        results.warnings++;
        results.details.push('⚠️  Project.project_contractors relation: NO_DATA');
        log('  ⚠️  Project.project_contractors: No data to validate', 'WARN');
      }
    } catch (error) {
      results.failed++;
      results.details.push(`❌ Project.project_contractors relation: FAIL (${error.message})`);
      log(`  ❌ Project.project_contractors: ${error.message}`, 'ERROR');
    }

    // Test 5: Project -> project_transactions relation
    try {
      const projectWithTransactions = await prisma.projects.findFirst({
        include: { 
          project_transactions: {
            select: { id: true, amount: true, transactionType: true }
          }
        }
      });
      
      if (projectWithTransactions && projectWithTransactions.project_transactions) {
        const transactionCount = projectWithTransactions.project_transactions.length;
        const totalAmount = projectWithTransactions.project_transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        results.passed++;
        results.details.push('✅ Project.project_transactions relation: PASS');
        log(`  ✅ Project.project_transactions: ${transactionCount} transactions, total: $${totalAmount}`, 'SUCCESS');
      } else {
        results.warnings++;
        results.details.push('⚠️  Project.project_transactions relation: NO_DATA');
        log('  ⚠️  Project.project_transactions: No data to validate', 'WARN');
      }
    } catch (error) {
      results.failed++;
      results.details.push(`❌ Project.project_transactions relation: FAIL (${error.message})`);
      log(`  ❌ Project.project_transactions: ${error.message}`, 'ERROR');
    }

  } finally {
    await prisma.$disconnect();
  }

  return results;
}

/**
 * Validate that critical UI component files exist and don't contain old relation names
 */
async function validateUIComponentFiles() {
  log('📁 Validating UI component files...');
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  const criticalFiles = [
    'components/users/user-edit-modal.tsx',
    'components/users/user-detail-modal.tsx',
    'components/projects/project-management.tsx',
    'components/vehicles/vehicle-management.tsx'
  ];

  // Old relation names that should not appear in UI components
  const deprecatedRelations = [
    'membership.business.', // Should be businesses
    'project.projectType.', // Should be project_types
    'vehicle.vehicleDrivers.', // Should be vehicle_drivers (but this was already snake_case)
    'project.projectContracts.', // Should be project_contractors
    'project.projectTransactions.' // Should be project_transactions
  ];

  for (const filePath of criticalFiles) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    try {
      if (!fs.existsSync(fullPath)) {
        results.warnings++;
        results.details.push(`⚠️  File not found: ${filePath}`);
        log(`  ⚠️  File not found: ${filePath}`, 'WARN');
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      let foundDeprecated = false;

      for (const deprecatedRelation of deprecatedRelations) {
        if (content.includes(deprecatedRelation)) {
          results.failed++;
          results.details.push(`❌ ${filePath}: Contains deprecated relation "${deprecatedRelation}"`);
          log(`  ❌ ${filePath}: Contains deprecated relation "${deprecatedRelation}"`, 'ERROR');
          foundDeprecated = true;
        }
      }

      if (!foundDeprecated) {
        results.passed++;
        results.details.push(`✅ ${filePath}: No deprecated relations found`);
        log(`  ✅ ${filePath}: Clean`, 'SUCCESS');
      }

    } catch (error) {
      results.failed++;
      results.details.push(`❌ Error reading ${filePath}: ${error.message}`);
      log(`  ❌ Error reading ${filePath}: ${error.message}`, 'ERROR');
    }
  }

  return results;
}

/**
 * Main validation function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 UI RELATIONS VALIDATION');
  console.log('='.repeat(60));

  try {
    // Test 1: Prisma relation access
    const prismaResults = await validatePrismaRelations();
    
    console.log('\n' + '-'.repeat(40));
    log(`Prisma Relations: ${prismaResults.passed} passed, ${prismaResults.failed} failed, ${prismaResults.warnings} warnings`);
    
    // Test 2: UI component file validation
    const fileResults = await validateUIComponentFiles();
    
    console.log('\n' + '-'.repeat(40));
    log(`UI Components: ${fileResults.passed} passed, ${fileResults.failed} failed, ${fileResults.warnings} warnings`);

    // Overall results
    const totalPassed = prismaResults.passed + fileResults.passed;
    const totalFailed = prismaResults.failed + fileResults.failed;
    const totalWarnings = prismaResults.warnings + fileResults.warnings;

    console.log('\n' + '='.repeat(60));
    
    if (totalFailed > 0) {
      log(`❌ VALIDATION FAILED: ${totalFailed} critical issues found`, 'ERROR');
      console.log('\n📋 Issues Summary:');
      [...prismaResults.details, ...fileResults.details]
        .filter(detail => detail.includes('❌'))
        .forEach(detail => console.log(`  ${detail}`));
      
      console.log('\n🛠️  Remediation Steps:');
      console.log('  1. Update UI components to use correct relation names');
      console.log('  2. Replace .business. with .businesses.');  
      console.log('  3. Replace .projectType. with .project_types.');
      console.log('  4. Replace .projectContracts. with .project_contractors.');
      console.log('  5. Replace .projectTransactions. with .project_transactions.');
      console.log('  6. Re-run this validation script after fixes');
      
      process.exit(1);
    } else if (totalWarnings > 0) {
      log(`⚠️  VALIDATION PASSED WITH WARNINGS: ${totalWarnings} warnings`, 'WARN');
      log('Warnings indicate missing test data or files, but no critical issues found', 'WARN');
      process.exit(0);
    } else {
      log(`✅ VALIDATION PASSED: All ${totalPassed} tests successful!`, 'SUCCESS');
      process.exit(0);
    }

  } catch (error) {
    log(`❌ VALIDATION ERROR: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  validatePrismaRelations,
  validateUIComponentFiles,
  main
};

// Run directly if called from command line
if (require.main === module) {
  main();
}