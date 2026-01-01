/**
 * Script to add Suspense boundaries to pages using useSearchParams()
 * Required for Next.js 15 compatibility
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/universal/barcode-management/templates/[id]/page.tsx',
  'src/app/grocery/pos/page.tsx',
  'src/app/r710-portal/tokens/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/universal/receipts/page.tsx',
  'src/app/restaurant/inventory/page.tsx',
  'src/app/clothing/inventory/page.tsx',
  'src/app/hardware/inventory/page.tsx',
  'src/app/grocery/inventory/page.tsx',
  'src/app/restaurant/reports/view/page.tsx',
  'src/app/hardware/reports/view/page.tsx',
  'src/app/grocery/reports/view/page.tsx',
  'src/app/clothing/reports/view/page.tsx',
  'src/app/business/manage/loans/page.tsx',
  'src/app/clothing/products/page.tsx',
  'src/app/grocery/products/page.tsx',
  'src/app/hardware/products/page.tsx',
  'src/app/restaurant/products/page.tsx',
  'src/app/auth/error/page.tsx',
  'src/app/admin/clothing/products/page.tsx',
  'src/app/admin/products/page.tsx',
];

function addSuspenseBoundary(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has Suspense
  if (content.includes('import { useState, useEffect, Suspense }') ||
      content.includes('import { Suspense }') ||
      content.includes('from \'react\'') && content.includes('Suspense')) {
    console.log(`⏭️  Already has Suspense: ${filePath}`);
    return false;
  }

  // Extract the default export function name
  const defaultExportMatch = content.match(/export default function (\w+)\s*\(/);
  if (!defaultExportMatch) {
    console.log(`❌ Could not find default export in: ${filePath}`);
    return false;
  }

  const functionName = defaultExportMatch[1];
  const contentFunctionName = `${functionName}Content`;

  // Step 1: Add Suspense to imports
  // Handle different import patterns
  if (content.includes("import { useState, useEffect } from 'react'")) {
    content = content.replace(
      "import { useState, useEffect } from 'react'",
      "import { useState, useEffect, Suspense } from 'react'"
    );
  } else if (content.includes('import { useState } from \'react\'')) {
    content = content.replace(
      'import { useState } from \'react\'',
      'import { useState, Suspense } from \'react\''
    );
  } else if (content.includes('import { useEffect } from \'react\'')) {
    content = content.replace(
      'import { useEffect } from \'react\'',
      'import { useEffect, Suspense } from \'react\''
    );
  } else if (content.includes('import React from \'react\'')) {
    // If using React.*, we need to destructure Suspense
    content = content.replace(
      'import React from \'react\'',
      'import React, { Suspense } from \'react\''
    );
  } else {
    // Add new import if no React imports found
    const firstImport = content.indexOf('import');
    if (firstImport !== -1) {
      content = content.slice(0, firstImport) +
                "import { Suspense } from 'react'\n" +
                content.slice(firstImport);
    }
  }

  // Step 2: Rename default export function to *Content
  content = content.replace(
    `export default function ${functionName}(`,
    `function ${contentFunctionName}(`
  );

  // Step 3: Find the last closing brace of the function and add wrapper
  // Find the end of file (last meaningful content)
  const lines = content.split('\n');
  let lastMeaningfulLine = lines.length - 1;

  // Find last non-empty line
  while (lastMeaningfulLine >= 0 && lines[lastMeaningfulLine].trim() === '') {
    lastMeaningfulLine--;
  }

  // Add the wrapper function before the last line
  const wrapperCode = `
// Wrapper component with Suspense boundary
export default function ${functionName}() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 dark:text-gray-400">Loading...</div>
    </div>}>
      <${contentFunctionName} />
    </Suspense>
  )
}`;

  // Insert before the last line
  lines.splice(lastMeaningfulLine + 1, 0, wrapperCode);
  content = lines.join('\n');

  // Write back
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Added Suspense boundary: ${filePath}`);
  return true;
}

console.log('🔧 Adding Suspense boundaries to pages with useSearchParams()...\n');

let successCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const filePath of filesToFix) {
  const result = addSuspenseBoundary(filePath);
  if (result === true) {
    successCount++;
  } else if (result === false && fs.existsSync(path.join(process.cwd(), filePath))) {
    skippedCount++;
  } else {
    errorCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${successCount}`);
console.log(`   ⏭️  Skipped (already done): ${skippedCount}`);
console.log(`   ❌ Errors: ${errorCount}`);
console.log(`   📝 Total: ${filesToFix.length}`);
