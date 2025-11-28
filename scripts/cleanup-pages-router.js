/**
 * Cleanup Script: Remove Legacy Pages Router Files
 *
 * This script removes the legacy Pages Router files that were deleted from git
 * but may still exist on remote servers as untracked files, causing build errors.
 *
 * Usage: node scripts/cleanup-pages-router.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('============================================================');
console.log('🧹 Cleaning up legacy Pages Router files');
console.log('============================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const pagesDir = path.join(projectRoot, 'pages');
const nextDir = path.join(projectRoot, '.next');

// Files to remove
const filesToRemove = [
  path.join(pagesDir, '_error.tsx'),
  path.join(pagesDir, '404.tsx'),
];

let removedCount = 0;

// Remove specific files
console.log('📁 Checking for legacy Pages Router files...\n');
filesToRemove.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ❌ Found: ${path.relative(projectRoot, file)}`);
    try {
      fs.unlinkSync(file);
      console.log(`  ✅ Removed: ${path.relative(projectRoot, file)}\n`);
      removedCount++;
    } catch (error) {
      console.error(`  ⚠️  Failed to remove: ${path.relative(projectRoot, file)}`);
      console.error(`     Error: ${error.message}\n`);
    }
  } else {
    console.log(`  ✓ Not found (already removed): ${path.relative(projectRoot, file)}\n`);
  }
});

// Check if pages directory is empty and remove it
if (fs.existsSync(pagesDir)) {
  const remaining = fs.readdirSync(pagesDir);
  if (remaining.length === 0) {
    console.log('📂 Pages directory is empty, removing it...');
    try {
      fs.rmdirSync(pagesDir);
      console.log('  ✅ Removed empty pages directory\n');
    } catch (error) {
      console.error(`  ⚠️  Failed to remove pages directory: ${error.message}\n`);
    }
  } else {
    console.log('📂 Pages directory contains other files, keeping it:');
    remaining.forEach(file => console.log(`     - ${file}`));
    console.log();
  }
}

// Clean build cache
console.log('🗑️  Cleaning build cache (.next directory)...');
if (fs.existsSync(nextDir)) {
  try {
    if (process.platform === 'win32') {
      execSync(`rd /s /q "${nextDir}"`, { stdio: 'inherit' });
    } else {
      execSync(`rm -rf "${nextDir}"`, { stdio: 'inherit' });
    }
    console.log('  ✅ Build cache cleaned\n');
  } catch (error) {
    console.error(`  ⚠️  Failed to clean build cache: ${error.message}\n`);
  }
} else {
  console.log('  ✓ Build cache already clean\n');
}

// Summary
console.log('============================================================');
console.log('📊 Cleanup Summary');
console.log('============================================================');
console.log(`  Files removed: ${removedCount}`);
console.log(`  Build cache: Cleaned`);
console.log('============================================================\n');

if (removedCount > 0) {
  console.log('✅ Cleanup complete! You can now run the build.');
  console.log('   Run: npm run build\n');
} else {
  console.log('ℹ️  No legacy files found. System is clean.\n');
}

console.log('💡 This project uses App Router exclusively.');
console.log('   Error handling is in:');
console.log('   - src/app/error.tsx (error boundary)');
console.log('   - src/app/not-found.tsx (404 page)\n');
