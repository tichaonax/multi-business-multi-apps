#!/usr/bin/env node
/**
 * Service Start with Flags Support
 * Starts the Windows service (via sc.exe), optionally force-rebuilding the
 * app first. Self-contained — previously delegated to `npm run
 * sync-service:start` (scripts/sync-service-start.js), which was deleted
 * along with the rest of the legacy peer-to-peer sync engine (see
 * ai-contexts/project-plans/review/projectplan-NOTKT-remove-legacy-sync-service-2026-09-12.md).
 * That file's "direct start" dev-bypass mode spawned the sync engine
 * directly and has no equivalent here — this only covers the real,
 * documented usage: starting the installed Windows service.
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execAsync = util.promisify(exec);

const SERVICE_NAME = 'multibusinesssyncservice.exe';
const SC = process.env.SC_COMMAND || 'sc.exe';
const MAX_WAIT_TIME = 30000; // 30 seconds
const CHECK_INTERVAL = 1000; // 1 second

const args = process.argv.slice(2);
const forceBuild = args.includes('--force-build') || args.includes('-f');
const verbose = args.includes('--verbose') || args.includes('-v');

if (args.includes('--help') || args.includes('-h')) {
  console.log('Service Start with Flags Support');
  console.log('');
  console.log('Usage: node service-start-with-flags.js [flags]');
  console.log('');
  console.log('Flags:');
  console.log('  --force-build, -f    Rebuild the app (npm run build) before starting the service');
  console.log('  --verbose, -v        Enable verbose output');
  console.log('  --help, -h           Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  npm run service:start                    # Regular start');
  console.log('  npm run service:start -- --force-build  # Start with force build');
  process.exit(0);
}

// Load .env.local into process.env (so the force-build child process sees DATABASE_URL etc.)
function loadEnvLocal() {
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
    }
  } catch (err) {
    if (verbose) console.error('❌ Failed to load .env.local:', err && err.message ? err.message : err);
  }
}

/**
 * Wait for service to reach RUNNING state — Windows services take time to
 * start, passing through START_PENDING first.
 */
async function waitForServiceRunning() {
  const startTime = Date.now();

  while ((Date.now() - startTime) < MAX_WAIT_TIME) {
    try {
      const { stdout } = await execAsync(`${SC} query ${SERVICE_NAME}`);

      if (stdout.includes('RUNNING')) {
        console.log('✅ Service fully started');
        return true;
      }
      if (stdout.includes('START_PENDING')) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏳ Waiting for service to start... (${elapsed}s)`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
        continue;
      }
      if (stdout.includes('STOPPED')) {
        throw new Error('Service stopped unexpectedly during startup');
      }
    } catch (error) {
      if (error.message.includes('stopped unexpectedly')) throw error;
      // Other errors during startup — wait and retry.
    }

    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }

  throw new Error(`Service did not start within ${MAX_WAIT_TIME / 1000} seconds`);
}

async function startServiceWithFlags() {
  loadEnvLocal();

  try {
    if (forceBuild) {
      console.log('🔨 Force build requested - rebuilding app before starting...');
      const { stdout, stderr } = await execAsync('npm run build', { cwd: process.cwd(), env: { ...process.env } });
      if (verbose && stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      console.log('✅ Build completed');
    }

    console.log('🚀 Starting Multi-Business service...');

    try {
      const { stdout: statusOut } = await execAsync(`${SC} query ${SERVICE_NAME}`);
      if (statusOut.includes('RUNNING')) {
        console.log('✅ Service is already running!');
        console.log('🌐 Application should be accessible at http://localhost:8080');
        return;
      }
    } catch (err) {
      console.log('ℹ️  Service not installed yet — run: npm run service:install');
      process.exit(1);
    }

    const { stdout, stderr } = await execAsync(`${SC} start ${SERVICE_NAME}`);
    if (verbose && stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    await waitForServiceRunning();
    console.log('🌐 Application should be accessible at http://localhost:8080');
    console.log('✅ Service start command completed');

  } catch (error) {
    console.error('❌ Failed to start service:', error instanceof Error ? error.message : error);

    const msg = String(error);
    if (msg.toLowerCase().includes('access is denied')) {
      console.error('Access denied — this usually means you need administrator privileges.');
      console.log('Run this command from an elevated (Administrator) shell.');
    }

    process.exit(1);
  }
}

startServiceWithFlags();
