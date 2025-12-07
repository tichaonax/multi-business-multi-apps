import { PrismaClient } from '@prisma/client';
import { createCleanBackup } from '../src/lib/backup-clean';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function createBackup() {
  try {
    console.log('🔄 Creating backup with includeDemoData=false...\n');

    const backupData = await createCleanBackup(prisma, {
      backupType: 'full',
      includeDemoData: false,  // Exclude demo businesses
      includeBusinessData: true,
      includeAuditLogs: false
    });

    // Save backup file
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `test-backup-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    console.log('✅ Backup created:', filename);
    console.log('\n📊 Backup Statistics:');
    console.log('   Backup Type:', backupData.metadata.backupType);
    console.log('   Include Demo Data:', backupData.metadata.includeDemoData);
    console.log('   Note:', backupData.metadata.note);
    console.log('\n📦 Table Counts:');

    const tables = Object.keys(backupData).filter(k => k !== 'metadata').sort();
    tables.forEach(table => {
      const count = Array.isArray(backupData[table]) ? backupData[table].length : 'N/A';
      console.log(`   ${table}: ${count}`);
    });

    // Detailed category breakdown
    if (backupData.businessCategories) {
      console.log('\n🏷️  Category Breakdown:');
      console.log('   Total businessCategories:', backupData.businessCategories.length);

      const byType: Record<string, number> = {};
      backupData.businessCategories.forEach((c: any) => {
        byType[c.businessType] = (byType[c.businessType] || 0) + 1;
      });

      Object.entries(byType).sort().forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });

      const systemWide = backupData.businessCategories.filter((c: any) => c.businessId === null).length;
      const businessSpecific = backupData.businessCategories.filter((c: any) => c.businessId !== null).length;
      console.log(`   System-wide (businessId=null): ${systemWide}`);
      console.log(`   Business-specific: ${businessSpecific}`);
    }

    // Businesses
    if (backupData.businesses) {
      console.log('\n🏢 Businesses:');
      console.log('   Total:', backupData.businesses.length);
      backupData.businesses.forEach((b: any) => {
        console.log(`      ${b.type}: ${b.name} (isDemo: ${b.isDemo})`);
      });
    }

    console.log('\n📁 Backup saved to:', filepath);
    return filepath;

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createBackup().catch(console.error);
