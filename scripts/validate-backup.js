const fs = require('fs');

const backupFile = process.argv[2] || 'complete-backup-2025-12-06T17-36-29.json';

console.log('Validating backup file:', backupFile);
console.log('');

const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

console.log('Backup Metadata:');
console.log('- Timestamp:', backup.metadata.timestamp);
console.log('- Total records:', backup.metadata.recordCount);
console.log('- Tables in backup:', backup.metadata.tables);
console.log('');

const tableKeys = Object.keys(backup).filter(k => k !== 'metadata');

console.log('Tables with data:');
const tablesWithData = tableKeys
  .map(table => ({ table, count: Array.isArray(backup[table]) ? backup[table].length : 0 }))
  .filter(t => t.count > 0)
  .sort((a, b) => b.count - a.count);

tablesWithData.forEach(({ table, count }) => {
  console.log(`  ${table}: ${count} records`);
});

console.log('');
const totalTablesInBackup = tableKeys.length;
console.log(`Total tables with data: ${tablesWithData.length}/${totalTablesInBackup}`);
const criticalTables = ['users', 'businesses', 'expenseAccounts', 'expenseAccountPayments', 'businessOrders',
  'stockTakeDrafts', 'stockTakeReports', 'pettyCashRequests', 'cashAllocationReport', 'eODPaymentBatch'];
const missingCritical = criticalTables.filter(t => !backup[t] || !Array.isArray(backup[t]) || backup[t].length === 0);
if (missingCritical.length === 0) {
  console.log('Validation: PASSED - All critical tables present and have data.');
} else {
  console.log('Validation: FAILED - Missing critical tables: ' + missingCritical.join(', '));
}
