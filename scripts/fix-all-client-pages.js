#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');

console.log('🔧 Adding dynamic export to all client component pages...\n');

// Find all page.tsx files with 'use client' but without dynamic export
const clientPages = execSync(
  `grep -rl "'use client'" src/app --include="page.tsx"`,
  { cwd: ROOT_DIR, encoding: 'utf-8' }
).trim().split('\n').filter(f => f.trim());

console.log(`Found ${clientPages.length} client component pages\n`);

let fixed = 0;
let skipped = 0;

for (const file of clientPages) {
  const filePath = path.join(ROOT_DIR, file);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Skip if already has dynamic export
    if (content.includes("dynamic = 'force-dynamic'") || content.includes('dynamic = "force-dynamic"')) {
      skipped++;
      continue;
    }

    // Add dynamic export after 'use client'
    const newContent = content.replace(
      /('use client'|"use client");?\s*\n/,
      "$&\n// Force dynamic rendering for session-based pages\nexport const dynamic = 'force-dynamic';\n"
    );

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
      fixed++;
    } else {
      console.log(`⚠️  Skipped: ${file} (couldn't match pattern)`);
      skipped++;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${fixed}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   Total: ${clientPages.length}`);

if (fixed > 0) {
  console.log('\n✨ Done! Run npm run build to verify.');
}
