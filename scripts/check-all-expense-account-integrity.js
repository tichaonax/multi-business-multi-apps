/**
 * Integrity check: compare all expense account deposits in DB vs backup.
 * Identifies any real business accounts that are missing deposits due to the demo seeder bug.
 *
 * Usage: node scripts/check-all-expense-account-integrity.js
 */
const { PrismaClient } = require('@prisma/client');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Hardcoded demo account numbers — these are intentionally deleted by the seeder
const DEMO_ACCOUNT_NUMBERS = new Set([
  'EXP-REST-001', 'EXP-REST-002', 'EXP-REST-003',
  'EXP-GROC1-001', 'EXP-GROC1-002',
  'EXP-GROC2-001', 'EXP-GROC2-002',
  'EXP-HARD-001', 'EXP-HARD-002', 'EXP-HARD-003',
  'EXP-CLOTH-001', 'EXP-CLOTH-002',
]);

async function run() {
  // Find backup file
  const downloadsDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');
  const backupFile = path.join(downloadsDir, 'AFB-MultiBusinessSyncService-backup_full_2026-02-28T15-03-29.json.gz');

  if (!fs.existsSync(backupFile)) {
    console.error('Backup file not found at:', backupFile);
    process.exit(1);
  }

  console.log('Loading backup...');
  const raw = zlib.gunzipSync(fs.readFileSync(backupFile));
  const backup = JSON.parse(raw.toString());

  // Get all expense accounts from backup (non-demo)
  const backupAccounts = Object.values(backup.businessData.expenseAccounts || {}).flat()
    .filter(a => !DEMO_ACCOUNT_NUMBERS.has(a.accountNumber));

  const backupDeposits = Object.values(backup.businessData.expenseAccountDeposits || {}).flat();

  // Build backup deposit map: accountId -> deposits[]
  const backupDepositMap = {};
  for (const dep of backupDeposits) {
    if (!backupDepositMap[dep.expenseAccountId]) backupDepositMap[dep.expenseAccountId] = [];
    backupDepositMap[dep.expenseAccountId].push(dep);
  }

  console.log(`\nBackup has ${backupAccounts.length} real expense accounts`);
  console.log(`Backup has ${backupDeposits.length} total deposits\n`);

  let problemsFound = 0;

  for (const backupAcct of backupAccounts) {
    // Check DB
    const dbAcct = await prisma.expenseAccounts.findUnique({ where: { id: backupAcct.id } });
    if (!dbAcct) {
      console.log(`❌ MISSING ACCOUNT: ${backupAcct.accountName} (${backupAcct.accountNumber}) id=${backupAcct.id}`);
      problemsFound++;
      continue;
    }

    const dbDepCount = await prisma.expenseAccountDeposits.count({ where: { expenseAccountId: backupAcct.id } });
    const backupDepCount = (backupDepositMap[backupAcct.id] || []).length;

    if (dbDepCount < backupDepCount) {
      const missing = backupDepCount - dbDepCount;
      const backupTotal = (backupDepositMap[backupAcct.id] || []).reduce((s, d) => s + parseFloat(d.amount), 0);
      const dbAgg = await prisma.expenseAccountDeposits.aggregate({ where: { expenseAccountId: backupAcct.id }, _sum: { amount: true } });
      const dbTotal = Number(dbAgg._sum.amount || 0);
      console.log(`❌ MISSING DEPOSITS: ${backupAcct.accountName} (${backupAcct.accountNumber})`);
      console.log(`   Backup: ${backupDepCount} deposits ($${backupTotal.toFixed(2)}) | DB: ${dbDepCount} deposits ($${dbTotal.toFixed(2)}) | Missing: ${missing}`);
      problemsFound++;
    } else {
      console.log(`✅ OK: ${backupAcct.accountName} (${backupAcct.accountNumber}) — ${dbDepCount} deposits in DB, ${backupDepCount} in backup`);
    }
  }

  console.log(`\n${problemsFound === 0 ? '✅ All accounts OK' : `❌ ${problemsFound} problem(s) found`}`);
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
