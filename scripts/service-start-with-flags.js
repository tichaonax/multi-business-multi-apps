#!/usr/bin/env node
/**
 * Service Start with Flags Support
 * Wrapper script that passes through command-line flags to the sync service system
 * Enables seamless use of commands like: npm run service:start --force-build
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2);
const forceBuild = args.includes('--force-build') || args.includes('-f');
const verbose = args.includes('--verbose') || args.includes('-v');

// Load .env.local into process.env (so child npm processes inherit DB and sync config)
function loadEnvLocal() {
  const path = require('path');
  const fs = require('fs');
  try {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      if (verbose) console.log('Loading environment variables from .env.local');
      const content = fs.readFileSync(envLocalPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
        const [key, ...vals] = trimmed.split('=');
        const value = vals.join('=').replace(/^"(.*)"$/, '$1');
        process.env[key.trim()] = value;
      });
      if (verbose) console.log('✅ Environment variables loaded from .env.local');
    } else {
      if (verbose) console.warn('⚠️  .env.local not found at', path.join(process.cwd(), '.env.local'));
    }
  } catch (err) {
    if (verbose) console.error('❌ Failed to load .env.local:', err && err.message ? err.message : err);
  }
}

// Always attempt to load .env.local so child processes (npm/prisma) see DATABASE_URL etc.
loadEnvLocal();

async function startServiceWithFlags() {
  try {
    if (verbose) {
      console.log('🔍 Starting service with flags:', { forceBuild, verbose });
    }

    // If force-build is requested, pass the flag to the normal service start
    if (forceBuild) {
      console.log('🔨 Force build requested - passing flag to service start...');

      // Use the normal sync-service start but pass the force-build flag
      const command = 'npm run sync-service:start -- --force-build';

      if (verbose) {
        console.log(`📞 Executing: ${command}`);
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

    } else {
      // Use regular service start
      if (verbose) {
        console.log('📞 Using regular service start (no force-build)');
      }

      const command = 'npm run sync-service:start';

      if (verbose) {
        console.log(`📞 Executing: ${command}`);
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    }

    console.log('✅ Service start command completed');

  } catch (error) {
    console.error('❌ Failed to start service:', error instanceof Error ? error.message : error);

    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);

    process.exit(1);
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('Service Start with Flags Support');
  console.log('');
  console.log('Usage: node service-start-with-flags.js [flags]');
  console.log('');
  console.log('Flags:');
  console.log('  --force-build, -f    Force TypeScript build before starting service');
  console.log('  --verbose, -v        Enable verbose output');
  console.log('  --help, -h           Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  npm run service:start                    # Regular start');
  console.log('  npm run service:start -- --force-build  # Start with force build');
  console.log('  npm run service:start -- --verbose      # Start with verbose output');
  console.log('  npm run service:start -- -f -v          # Start with force build and verbose');
  process.exit(0);
}

// Run the service start
startServiceWithFlags();