#!/usr/bin/env node

/**
 * Fix Dynamic Pages Script
 *
 * Adds `export const dynamic = 'force-dynamic'` to all page.tsx files
 * that use useSession or SessionProvider but don't already have the export.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');

console.log('🔧 Fixing dynamic page exports...\n');

// Find all page.tsx files that use session but don't have dynamic export
const result = execSync(
  `grep -r "useSession\\|SessionProvider" src/app --include="page.tsx" | grep -v "dynamic = 'force-dynamic'" | cut -d: -f1`,
  { cwd: ROOT_DIR, encoding: 'utf-8' }
).trim();

if (!result) {
  console.log('✅ No pages need fixing!');
  process.exit(0);
}

const filesToFix = result.split('\n').filter(f => f.trim());

console.log(`Found ${filesToFix.length} pages to fix:\n`);

let fixed = 0;
let skipped = 0;
let errors = 0;

for (const file of filesToFix) {
  const filePath = path.join(ROOT_DIR, file);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipped: ${file} (not found)`);
      skipped++;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if already has dynamic export (double check)
    if (content.includes("dynamic = 'force-dynamic'") || content.includes('dynamic = "force-dynamic"')) {
      console.log(`⏭️  Skipped: ${file} (already has dynamic export)`);
      skipped++;
      continue;
    }

    // Check if it's a client component
    const isClientComponent = content.includes("'use client'") || content.includes('"use client"');

    if (isClientComponent) {
      // Add after 'use client'
      const newContent = content.replace(
        /('use client'|"use client");?\n/,
        `$&\n// Force dynamic rendering for session-based pages\nexport const dynamic = 'force-dynamic';\n`
      );

      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
      fixed++;
    } else {
      // Add at the top, before imports
      const lines = content.split('\n');
      const firstImportIndex = lines.findIndex(line => line.trim().startsWith('import '));

      if (firstImportIndex >= 0) {
        lines.splice(firstImportIndex, 0, `// Force dynamic rendering for session-based pages\nexport const dynamic = 'force-dynamic';\n`);
        const newContent = lines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`✅ Fixed: ${file}`);
        fixed++;
      } else {
        console.log(`⚠️  Skipped: ${file} (couldn't find insertion point)`);
        skipped++;
      }
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
    errors++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${fixed}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ❌ Errors: ${errors}`);

if (fixed > 0) {
  console.log('\n✨ All pages fixed! You can now rebuild the application.');
  process.exit(0);
} else {
  console.log('\n⚠️  No pages were fixed.');
  process.exit(1);
}
