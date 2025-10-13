#!/usr/bin/env node

/**
 * Test Service Wrapper Directly
 * This helps diagnose why the service wrapper might be failing silently
 */

console.log('='.repeat(70));
console.log('🧪 TESTING SERVICE WRAPPER DIRECTLY');
console.log('='.repeat(70));
console.log('');

const path = require('path');
const fs = require('fs');

const wrapperPath = path.join(__dirname, '..', 'windows-service', 'service-wrapper-hybrid.js');

console.log('Step 1: Checking if wrapper file exists...');
if (!fs.existsSync(wrapperPath)) {
  console.error(`❌ Wrapper not found at: ${wrapperPath}`);
  process.exit(1);
}
console.log(`✅ Wrapper found: ${wrapperPath}`);
console.log('');

console.log('Step 2: Checking for syntax errors...');
try {
  require(wrapperPath);
  console.log('❌ Wrapper loaded but should not have (it runs on require)');
} catch (error) {
  if (error.message && error.message.includes('SyntaxError')) {
    console.error('❌ SYNTAX ERROR in wrapper:');
    console.error(error);
    process.exit(1);
  }

  // Expected - wrapper starts on require
  console.log('✅ No syntax errors detected');
}
console.log('');

console.log('Step 3: Testing wrapper execution...');
console.log('Running: node windows-service/service-wrapper-hybrid.js start');
console.log('');
console.log('--- Wrapper Output ---');

const { spawn } = require('child_process');
const wrapperProcess = spawn('node', [wrapperPath, 'start'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

wrapperProcess.on('error', (err) => {
  console.error('');
  console.error('❌ Failed to start wrapper:');
  console.error(err);
  process.exit(1);
});

wrapperProcess.on('exit', (code) => {
  console.log('');
  console.log('--- End Wrapper Output ---');
  console.log('');
  if (code === 0) {
    console.log('✅ Wrapper executed successfully');
  } else {
    console.error(`❌ Wrapper exited with code ${code}`);
  }
  process.exit(code);
});

// Kill after 30 seconds
setTimeout(() => {
  console.log('');
  console.log('⏱️  Test timeout - killing wrapper');
  wrapperProcess.kill('SIGTERM');
  setTimeout(() => {
    wrapperProcess.kill('SIGKILL');
    process.exit(1);
  }, 5000);
}, 30000);
