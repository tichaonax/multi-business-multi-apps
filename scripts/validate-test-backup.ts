import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Find the most recent test backup file
function findLatestBackup(): string {
  const files = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('test-backup-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(process.cwd(), f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    throw new Error('No test backup files found');
  }

  return files[0].name;
}

async function validateBackup() {
  try {
    const backupFile = findLatestBackup();
    console.log('📂 Validating backup:', backupFile);
    console.log('');

    // Read backup file
    const backupPath = path.join(process.cwd(), backupFile);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log('📊 Backup Metadata:');
    console.log('   Timestamp:', backupData.metadata.timestamp);
    console.log('   Backup Type:', backupData.metadata.backupType);
    console.log('   Include Demo Data:', backupData.metadata.includeDemoData);
    console.log('   Note:', backupData.metadata.note);
    console.log('');

    // Validate key tables
    const criticalTables = [
      'businesses',
      'businessCategories',
      'businessSuppliers',
      'users',
      'businessMemberships'
    ];

    console.log('🔍 Validating Critical Tables:');
    console.log('');

    let allMatched = true;

    for (const tableName of criticalTables) {
      // Get database count
      const dbCount = await (prisma as any)[tableName].count();

      // Get backup count
      const backupRecords = backupData[tableName] || [];
      const backupCount = Array.isArray(backupRecords) ? backupRecords.length : 0;

      const matched = dbCount === backupCount;
      const status = matched ? '✅' : '❌';
      const diff = dbCount - backupCount;

      console.log(`${status} ${tableName}`);
      console.log(`   Database: ${dbCount}`);
      console.log(`   Backup:   ${backupCount}`);
      if (!matched) {
        console.log(`   Diff:     ${diff > 0 ? '+' : ''}${diff} (${diff > 0 ? 'missing from backup' : 'extra in backup'})`);
        allMatched = false;
      }
      console.log('');
    }

    // Detailed category validation
    console.log('🏷️  Detailed Category Validation:');
    console.log('');

    const dbCategories = await prisma.businessCategories.findMany();
    const backupCategories = backupData.businessCategories || [];

    console.log(`   Database total: ${dbCategories.length}`);
    console.log(`   Backup total:   ${backupCategories.length}`);
    console.log('');

    // Count by type in database
    const dbByType: Record<string, number> = {};
    dbCategories.forEach((c: any) => {
      dbByType[c.businessType] = (dbByType[c.businessType] || 0) + 1;
    });

    // Count by type in backup
    const backupByType: Record<string, number> = {};
    backupCategories.forEach((c: any) => {
      backupByType[c.businessType] = (backupByType[c.businessType] || 0) + 1;
    });

    console.log('   By Business Type:');
    const allTypes = [...new Set([...Object.keys(dbByType), ...Object.keys(backupByType)])].sort();

    for (const type of allTypes) {
      const dbTypeCount = dbByType[type] || 0;
      const backupTypeCount = backupByType[type] || 0;
      const typeMatched = dbTypeCount === backupTypeCount;
      const typeStatus = typeMatched ? '✅' : '❌';

      console.log(`   ${typeStatus} ${type}:`);
      console.log(`      Database: ${dbTypeCount}`);
      console.log(`      Backup:   ${backupTypeCount}`);
      if (!typeMatched) {
        const typeDiff = dbTypeCount - backupTypeCount;
        console.log(`      Diff:     ${typeDiff > 0 ? '+' : ''}${typeDiff}`);
        allMatched = false;
      }
    }
    console.log('');

    // Check system-wide vs business-specific
    const dbSystemWide = dbCategories.filter((c: any) => c.businessId === null).length;
    const dbBusinessSpecific = dbCategories.filter((c: any) => c.businessId !== null).length;
    const backupSystemWide = backupCategories.filter((c: any) => c.businessId === null).length;
    const backupBusinessSpecific = backupCategories.filter((c: any) => c.businessId !== null).length;

    console.log('   System-wide (businessId=null):');
    console.log(`      Database: ${dbSystemWide}`);
    console.log(`      Backup:   ${backupSystemWide}`);
    if (dbSystemWide !== backupSystemWide) {
      console.log(`      ❌ Mismatch: ${dbSystemWide - backupSystemWide}`);
      allMatched = false;
    } else {
      console.log(`      ✅ Match`);
    }
    console.log('');

    console.log('   Business-specific:');
    console.log(`      Database: ${dbBusinessSpecific}`);
    console.log(`      Backup:   ${backupBusinessSpecific}`);
    if (dbBusinessSpecific !== backupBusinessSpecific) {
      console.log(`      ❌ Mismatch: ${dbBusinessSpecific - backupBusinessSpecific}`);
      allMatched = false;
    } else {
      console.log(`      ✅ Match`);
    }
    console.log('');

    // Final result
    console.log('═══════════════════════════════════════════');
    if (allMatched) {
      console.log('✅ VALIDATION PASSED!');
      console.log('   All data matches between database and backup');
    } else {
      console.log('❌ VALIDATION FAILED!');
      console.log('   Some data is missing or mismatched');
    }
    console.log('═══════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

validateBackup().catch(console.error);
