const fs = require('fs');
const path = require('path');

async function createBackup() {
  try {
    console.log('🔄 Creating backup with includeDemoData=false...\n');

    // Call the backup API endpoint
    const response = await fetch('http://localhost:8080/api/admin/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        backupType: 'full',
        includeDemoData: false,
        includeBusinessData: true,
        includeAuditLogs: false
      })
    });

    if (!response.ok) {
      throw new Error(`Backup API returned ${response.status}: ${await response.text()}`);
    }

    const backupData = await response.json();

    // Save backup file
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `test-backup-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    console.log('✅ Backup created:', filename);
    console.log('\n📊 Backup Statistics:');
    console.log('   Metadata:', backupData.metadata);
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

      const byType = {};
      backupData.businessCategories.forEach(c => {
        byType[c.businessType] = (byType[c.businessType] || 0) + 1;
      });

      Object.entries(byType).sort().forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });

      const systemWide = backupData.businessCategories.filter(c => c.businessId === null).length;
      const businessSpecific = backupData.businessCategories.filter(c => c.businessId !== null).length;
      console.log(`   System-wide (businessId=null): ${systemWide}`);
      console.log(`   Business-specific: ${businessSpecific}`);
    }

    // Businesses
    if (backupData.businesses) {
      console.log('\n🏢 Businesses:');
      console.log('   Total:', backupData.businesses.length);
      backupData.businesses.forEach(b => {
        console.log(`      ${b.type}: ${b.name} (isDemo: ${b.isDemo})`);
      });
    }

    console.log('\n📁 Backup saved to:', filepath);
    return filepath;

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

createBackup().catch(console.error);
