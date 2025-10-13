#!/usr/bin/env node

/**
 * Verify Service Wrapper Version and Configuration
 * Checks if the service wrapper has the latest fixes applied
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '='.repeat(70));
console.log('🔍 SERVICE WRAPPER VERIFICATION TOOL');
console.log('='.repeat(70) + '\n');

const projectRoot = path.join(__dirname, '..');
const wrapperPath = path.join(projectRoot, 'windows-service', 'service-wrapper-hybrid.js');

// Check 1: Verify wrapper file exists
console.log('📝 Step 1: Checking service wrapper file...\n');
if (!fs.existsSync(wrapperPath)) {
  console.error('❌ ERROR: service-wrapper-hybrid.js not found at:', wrapperPath);
  process.exit(1);
}
console.log('✅ Service wrapper file found:', wrapperPath);

// Check 2: Read wrapper file content
console.log('\n📝 Step 2: Reading service wrapper content...\n');
const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');
const lines = wrapperContent.split('\n');
console.log(`✅ Service wrapper loaded (${lines.length} lines, ${wrapperContent.length} bytes)`);

// Check 3: Verify fix is applied - look for key methods
console.log('\n📝 Step 3: Checking for fix signatures...\n');

const signatures = [
  {
    name: 'startApplication() method',
    pattern: /async startApplication\(\)/,
    line: null
  },
  {
    name: 'checkPortListening() method',
    pattern: /async checkPortListening\(port\)/,
    line: null
  },
  {
    name: 'verifyNextJsStarted() method',
    pattern: /async verifyNextJsStarted\(\)/,
    line: null
  },
  {
    name: 'verifyNextJsAvailable() method',
    pattern: /async verifyNextJsAvailable\(\)/,
    line: null
  },
  {
    name: 'Direct node spawn (not npm)',
    pattern: /spawn\('node',\s*\[nextPath,\s*'start'\]/,
    line: null
  },
  {
    name: 'shell: false option',
    pattern: /shell:\s*false/,
    line: null
  },
  {
    name: 'appProcess property in constructor',
    pattern: /this\.appProcess\s*=\s*null/,
    line: null
  },
  {
    name: 'OLD PATTERN: npm spawn (should NOT exist)',
    pattern: /spawn\(npmCmd,\s*\['run',\s*'start'\]/,
    line: null,
    shouldNotExist: true
  }
];

lines.forEach((line, index) => {
  signatures.forEach(sig => {
    if (sig.pattern.test(line)) {
      sig.line = index + 1;
    }
  });
});

let hasAllFixes = true;
let hasOldCode = false;

signatures.forEach(sig => {
  if (sig.shouldNotExist) {
    if (sig.line !== null) {
      console.log(`❌ FOUND OLD CODE: ${sig.name} at line ${sig.line}`);
      hasOldCode = true;
    } else {
      console.log(`✅ OLD CODE REMOVED: ${sig.name}`);
    }
  } else {
    if (sig.line !== null) {
      console.log(`✅ FOUND: ${sig.name} at line ${sig.line}`);
    } else {
      console.log(`❌ MISSING: ${sig.name}`);
      hasAllFixes = false;
    }
  }
});

// Check 4: Git information
console.log('\n📝 Step 4: Checking git information...\n');
try {
  const gitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const gitHashShort = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const lastCommitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim().split('\n')[0];
  const lastCommitDate = execSync('git log -1 --pretty=%cd', { encoding: 'utf8' }).trim();

  console.log(`Git Branch: ${gitBranch}`);
  console.log(`Git Commit: ${gitHashShort} (${gitHash})`);
  console.log(`Last Commit: ${lastCommitMsg}`);
  console.log(`Commit Date: ${lastCommitDate}`);
} catch (error) {
  console.warn('⚠️  Could not retrieve git information:', error.message);
}

// Check 5: File modification time
console.log('\n📝 Step 5: Checking file modification time...\n');
const stats = fs.statSync(wrapperPath);
console.log(`Last Modified: ${stats.mtime.toISOString()}`);
console.log(`File Size: ${stats.size} bytes`);

// Check 6: Verify specific fix content
console.log('\n📝 Step 6: Verifying fix implementation details...\n');

// Check for the exact spawn command
const spawnNodePattern = /spawn\('node',\s*\[nextPath,\s*'start'\]/;
const spawnMatch = wrapperContent.match(spawnNodePattern);
if (spawnMatch) {
  console.log('✅ Direct node spawn confirmed');
  console.log(`   Pattern: ${spawnMatch[0]}`);
} else {
  console.log('❌ Direct node spawn NOT found');
}

// Check for logging of spawn command
const loggingPattern = /console\.log\(`📝 Spawning: node \$\{nextPath\} start`\)/;
if (loggingPattern.test(wrapperContent)) {
  console.log('✅ Spawn command logging confirmed');
} else {
  console.log('❌ Spawn command logging NOT found');
}

// Check for port verification
const portVerifyPattern = /await this\.verifyNextJsStarted\(\)/;
if (portVerifyPattern.test(wrapperContent)) {
  console.log('✅ Port verification call confirmed');
} else {
  console.log('❌ Port verification call NOT found');
}

// Check 7: Verify constructor has appProcess
console.log('\n📝 Step 7: Verifying constructor setup...\n');
const constructorPattern = /constructor\(options\s*=\s*\{\}\)\s*{[^}]*this\.appProcess\s*=\s*null/s;
if (constructorPattern.test(wrapperContent)) {
  console.log('✅ Constructor has appProcess property');
} else {
  console.log('❌ Constructor missing appProcess property');
}

// Final verdict
console.log('\n' + '='.repeat(70));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(70) + '\n');

if (hasAllFixes && !hasOldCode) {
  console.log('✅ SERVICE WRAPPER HAS ALL FIXES APPLIED');
  console.log('✅ Old code has been removed');
  console.log('\n👍 The service wrapper is up-to-date with the fix.');
  console.log('\nIf the remote server is still showing errors:');
  console.log('  1. Verify the remote server has pulled the latest code');
  console.log('  2. Check git commit hash matches: e528f6a or later');
  console.log('  3. Restart the service: npm run service:restart');
  console.log('  4. Check service logs: cat logs/service.log | tail -100');
  process.exit(0);
} else if (hasOldCode) {
  console.log('❌ OLD CODE STILL EXISTS IN SERVICE WRAPPER');
  console.log('❌ The npm spawn pattern was found - fix NOT applied');
  console.log('\n🔧 ACTION REQUIRED:');
  console.log('  1. Ensure you have pulled the latest code from git');
  console.log('  2. Check git commit: git log -1');
  console.log('  3. Expected commit hash: e528f6a or later');
  console.log('  4. If needed, pull again: git pull origin main');
  process.exit(1);
} else {
  console.log('⚠️  SOME FIXES ARE MISSING');
  console.log('\n🔧 ACTION REQUIRED:');
  console.log('  1. Pull latest code: git pull origin main');
  console.log('  2. Verify commit hash: e528f6a or later');
  console.log('  3. Re-run this verification script');
  process.exit(1);
}
