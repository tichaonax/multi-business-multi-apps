/**
 * @jest-environment node
 *
 * Seed Script Safety Tests
 * ========================
 * Guards against data destruction bugs in demo seeding scripts.
 *
 * Background: seed-demo-expense-accounts.js used `contains: 'EXP-'` to find demo accounts.
 * Since ALL real accounts also use the EXP-YYYYMMDD-XXXX format, running the script on
 * production deleted real business expense accounts and their deposit history (HXI Eats, etc).
 *
 * These tests do static code analysis on seed/cleanup scripts to catch unsafe patterns
 * before they can destroy production data.
 */

const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.resolve(__dirname, '..');

// Known demo business IDs — any delete operation targeting a businessId must use only these
const KNOWN_DEMO_BUSINESS_IDS = new Set([
  'restaurant-demo-business',
  'grocery-demo-business',
  'grocery-demo-2',
  'hardware-demo-business',
  'clothing-demo-business',
  // env-var driven (OK because they fall back to demo IDs)
  'NEXT_PUBLIC_DEMO_BUSINESS_ID',
  'RESTAURANT_DEMO_BUSINESS_ID',
]);

// Known demo expense account numbers — only these should ever be targeted by name
const DEMO_ACCOUNT_NUMBERS = [
  'EXP-REST-001', 'EXP-REST-002', 'EXP-REST-003',
  'EXP-GROC1-001', 'EXP-GROC1-002',
  'EXP-GROC2-001', 'EXP-GROC2-002',
  'EXP-HARD-001', 'EXP-HARD-002', 'EXP-HARD-003',
  'EXP-CLOTH-001', 'EXP-CLOTH-002',
];

// Real account number format (must NEVER be used in any delete filter)
const REAL_ACCOUNT_NUMBER_PATTERN = /EXP-\d{8}-\d{4}/;

// ─── helpers ────────────────────────────────────────────────────────────────

function readScript(filename) {
  const filepath = path.join(SCRIPTS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, 'utf-8');
}

function getDemoAndSeedScripts() {
  return fs.readdirSync(SCRIPTS_DIR)
    .filter(f => f.endsWith('.js') || f.endsWith('.ts'))
    .filter(f => /seed|unseed|cleanup|reset|demo/i.test(f))
    .filter(f => !fs.statSync(path.join(SCRIPTS_DIR, f)).isDirectory());
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Seed script safety — no broad patterns that match real data', () => {

  // ── CRITICAL: No broad EXP- contains pattern in delete operations ──────────
  test('No script uses contains:"EXP-" in a deleteMany or delete operation', () => {
    const scripts = getDemoAndSeedScripts();
    const violations = [];

    for (const scriptName of scripts) {
      const content = readScript(scriptName);
      if (!content) continue;

      // Look for deleteMany blocks that contain a contains:'EXP-' filter
      // Pattern: deleteMany(...contains...'EXP-'...) anywhere within ~5 lines
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const chunk = lines.slice(i, i + 8).join(' ');
        if (
          (chunk.includes('deleteMany') || chunk.includes('delete(')) &&
          chunk.includes("contains") &&
          chunk.includes("'EXP-'")
        ) {
          violations.push(`${scriptName}:${i + 1} — deleteMany with contains:'EXP-' found`);
        }
      }
    }

    if (violations.length > 0) {
      fail(
        `DANGEROUS: The following scripts use contains:'EXP-' in a delete operation.\n` +
        `This matches ALL real expense accounts (format EXP-YYYYMMDD-XXXX) and will destroy production data.\n` +
        `Use { in: DEMO_ACCOUNT_NUMBERS } with exact hardcoded demo account numbers instead.\n\n` +
        violations.join('\n')
      );
    }
  });

  // ── CRITICAL: No deleteMany({}) without a where clause ───────────────────
  test('No seed/demo/cleanup script uses deleteMany({}) without a where clause', () => {
    const scripts = getDemoAndSeedScripts();
    const violations = [];

    for (const scriptName of scripts) {
      const content = readScript(scriptName);
      if (!content) continue;

      // Match deleteMany({}) or deleteMany({ }) — empty where means delete everything
      // Exception: expenseDomains is a pure system/seed table with no user-created records
      if (/deleteMany\s*\(\s*\{\s*\}\s*\)/.test(content)) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (
            /deleteMany\s*\(\s*\{\s*\}\s*\)/.test(line) &&
            !line.includes('expenseDomains') // system-only table, no user data
          ) {
            violations.push(`${scriptName}:${idx + 1} — deleteMany({}) with no where clause`);
          }
        });
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `DANGEROUS: The following scripts use deleteMany({}) with no where clause.\n` +
        `This deletes ALL rows from the table — including production data.\n` +
        `Add a where clause filtering to demo business IDs or specific demo records.\n\n` +
        violations.join('\n')
      );
    }
  });

  // ── The fixed expense account seeder uses exact account numbers ───────────
  test('seed-demo-expense-accounts.js uses exact account number list, not a contains pattern', () => {
    const content = readScript('seed-demo-expense-accounts.js');
    expect(content).not.toBeNull();

    // Extract only non-comment lines to test code behaviour (not comment text)
    const codeLines = content.split('\n')
      .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');

    // Must NOT have the old dangerous pattern in actual code
    expect(codeLines).not.toMatch(/contains\s*:\s*['"]EXP-['"]/);

    // Must have the safe pattern (in: DEMO_ACCOUNT_NUMBERS)
    expect(codeLines).toMatch(/DEMO_ACCOUNT_NUMBERS/);

    // Must use the in: operator for the cleanup deleteMany
    expect(codeLines).toMatch(/in\s*:\s*DEMO_ACCOUNT_NUMBERS/);
  });

  // ── Demo account numbers must never collide with real account format ───────
  test('DEMO_ACCOUNT_NUMBERS do not match the real account number format EXP-YYYYMMDD-XXXX', () => {
    for (const num of DEMO_ACCOUNT_NUMBERS) {
      expect(num).not.toMatch(REAL_ACCOUNT_NUMBER_PATTERN);
    }
  });

  // ── seed-demo-expense-accounts.js must create accounts with businessId ─────
  test('seed-demo-expense-accounts.js creates expense accounts with a businessId field', () => {
    const content = readScript('seed-demo-expense-accounts.js');
    expect(content).not.toBeNull();

    // The create data block must include businessId so future cleanups can filter by it
    expect(content).toMatch(/businessId\s*:/);
  });

  // ── unseed scripts must target demo businesses by ID ─────────────────────
  test.each(['unseed-grocery-demo.js', 'unseed-hardware-demo.js'])(
    '%s only deletes from known demo business IDs',
    (scriptName) => {
      const content = readScript(scriptName);
      if (!content) return; // Skip if file doesn't exist

      // The script must reference at least one known demo business ID constant/variable
      const hasKnownDemoId = [...KNOWN_DEMO_BUSINESS_IDS].some(id => content.includes(id));
      expect(hasKnownDemoId).toBe(true);

      // Must not use deleteMany({}) with no filter
      expect(content).not.toMatch(/deleteMany\s*\(\s*\{\s*\}\s*\)/);
    }
  );

  // ── No script deletes from expenseAccounts without a businessId or id filter
  test('No script deletes from expenseAccounts/expenseAccountDeposits using only a name pattern', () => {
    const scripts = getDemoAndSeedScripts();
    const violations = [];

    for (const scriptName of scripts) {
      const content = readScript(scriptName);
      if (!content) continue;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const chunk = lines.slice(i, i + 10).join(' ');

        // Look for deleteMany on expense tables using a "name" or "accountName" contains filter
        if (
          (chunk.includes('expenseAccounts') || chunk.includes('expenseAccountDeposits')) &&
          (chunk.includes('deleteMany') || chunk.includes('delete(')) &&
          chunk.includes('contains') &&
          !chunk.includes('businessId') &&
          !chunk.includes('expenseAccountId') &&
          !chunk.includes(' in:')
        ) {
          violations.push(`${scriptName}:${i + 1} — deletes from expense table using only a contains filter (no businessId/id scope)`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `DANGEROUS: The following scripts delete from expense account tables using only a\n` +
        `name/pattern filter — this can match real business accounts.\n` +
        `Use businessId or exact id/accountNumber filters instead.\n\n` +
        violations.join('\n')
      );
    }
  });

});

describe('Seed script safety — demo business IDs are never mistaken for real businesses', () => {

  test('Known demo business IDs follow a predictable slug format, not UUID format', () => {
    // Real businesses use UUIDs. Demo business IDs use human-readable slugs.
    // This ensures deletes scoped to demo IDs cannot accidentally target real UUID-based businesses.
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const id of KNOWN_DEMO_BUSINESS_IDS) {
      if (id.startsWith('NEXT_PUBLIC') || id.endsWith('_ID')) continue; // env var placeholders
      expect(id).not.toMatch(UUID_PATTERN);
    }
  });

  test('cleanup-demo-businesses.js only operates on IDs from a predefined demo list', () => {
    const content = readScript('cleanup-demo-businesses.js');
    if (!content) return;

    // Must not delete with a where clause that could match real business UUIDs
    // (i.e., must reference hard-coded demo ID list, not any user-provided businessId)
    const hasHardcodedDemoIds = [...KNOWN_DEMO_BUSINESS_IDS]
      .filter(id => !id.includes('NEXT_PUBLIC') && !id.endsWith('_ID'))
      .some(id => content.includes(id));

    expect(hasHardcodedDemoIds).toBe(true);
  });

});
