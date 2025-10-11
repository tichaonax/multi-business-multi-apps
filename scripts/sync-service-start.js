const { exec } = require('child_process');
const util = require('util');
const { spawn } = require('child_process');
const execAsync = util.promisify(exec);

const SERVICE_NAME = 'multibusinesssyncservice.exe';
const SC = process.env.SC_COMMAND || 'sc.exe';
const MAX_WAIT_TIME = 30000; // 30 seconds
const CHECK_INTERVAL = 1000; // 1 second

// Check for force-build flag and other flags
const args = process.argv.slice(2);
const forceBuild = args.includes('--force-build') || args.includes('-f');
const direct = args.includes('--direct') || process.env.SYNC_DIRECT_START === 'true';

/**
 * Wait for service to reach RUNNING state
 * Windows services take time to start - they go through START_PENDING state
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
      if (error.message.includes('stopped unexpectedly')) {
        throw error;
      }
      // Other errors during startup - wait and retry
    }

    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }

  throw new Error(`Service did not start within ${MAX_WAIT_TIME/1000} seconds`);
}

// Helper to load .env.local into process.env so child processes see DATABASE_URL etc.
function loadEnvLocal() {
  try {
    const path = require('path');
    const fs = require('fs');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
        const [key, ...vals] = trimmed.split('=');
        const value = vals.join('=').replace(/^"(.*)"$/, '$1');
        process.env[key.trim()] = value;
      });
      console.log('✅ Loaded .env.local for direct service start');
    } else {
      console.warn('⚠️  .env.local not found at', envLocalPath);
    }
  } catch (err) {
    console.warn('Failed to load .env.local:', err && err.message ? err.message : err);
  }
}

async function run() {
  try {
    // For development/testing, allow direct start (not through Windows service)
    if (direct || forceBuild) {
      console.log('🎯 Starting sync service directly (not through Windows service)...');

      // Build command with all flags passed through
      const serviceArgs = ['start'];
      if (forceBuild) serviceArgs.push('--force-build');

      // Load .env.local so DATABASE_URL and other vars are available to Prisma/child processes
      loadEnvLocal();

      try {
        // Simple migration lock to avoid concurrent runs (prevents 'runs twice' races)
        const path = require('path')
        const fs = require('fs')
        const lockFile = path.join(process.cwd(), '.migration.lock')

        const waitForLockRelease = async (timeoutMs = 2 * 60 * 1000) => {
          const start = Date.now()
          while (fs.existsSync(lockFile)) {
            if (Date.now() - start > timeoutMs) {
              throw new Error('Timeout waiting for existing migration lock to clear')
            }
            console.log('🔒 Migration lock present, waiting 5s for existing migration to finish...')
            // eslint-disable-next-line no-await-in-loop
            await new Promise(r => setTimeout(r, 5000))
          }
        }

        await waitForLockRelease()

        // Acquire lock
        try {
          fs.writeFileSync(lockFile, String(process.pid))
        } catch (err) {
          console.warn('Could not create migration lock file:', err && err.message ? err.message : err)
        }

        // If forceBuild requested, run the build first (keeps parity with wrapper behavior)
        if (forceBuild) {
          console.log('🔨 Force build requested - rebuilding service before starting...');
          await execAsync('npm run build:service', { cwd: process.cwd(), env: { ...process.env } });
          console.log('✅ Service build completed');
        }

  // Run migrations/push and seeding upfront to ensure DB is ready when runner starts
  console.log('🗄️  Running database schema push (direct start)...');
  // Use db push --force-reset to ensure schema is applied similar to wrapper behavior
  await execAsync('npx prisma db push --force-reset', { cwd: process.cwd(), env: { ...process.env } });
  console.log('✅ Database schema applied (direct start)');

  console.log('🌱 Running migration seed script (direct start)...');
  await execAsync('npm run seed:migration', { cwd: process.cwd(), env: { ...process.env } });
  console.log('✅ Database seeding completed (direct start)');
      } catch (err) {
        console.error('❌ Pre-start database setup failed:', err && err.message ? err.message : err);
        // Ensure lock removed on failure
        try { require('fs').unlinkSync(require('path').join(process.cwd(), '.migration.lock')) } catch (e) {}
        process.exit(1);
      } finally {
        // Release lock
        try { require('fs').unlinkSync(require('path').join(process.cwd(), '.migration.lock')) } catch (e) {}
      }
      
      // Start the service runner directly with SKIP_SYNC_RUNNER_MIGRATIONS so the runner doesn't try to re-run them
      const serviceProcess = spawn('node', ['dist/service/sync-service-runner.js', ...serviceArgs], {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env, SKIP_SYNC_RUNNER_MIGRATIONS: 'true' }
      });

      // Handle process events
      serviceProcess.on('close', (code) => {
        console.log(`\n📡 Sync service exited with code ${code}`);
        process.exit(code);
      });

      serviceProcess.on('error', (error) => {
        console.error('❌ Failed to start sync service:', error);
        process.exit(1);
      });

      // Handle shutdown signals
      process.on('SIGINT', () => {
        console.log('\n📡 Received SIGINT, stopping sync service...');
        serviceProcess.kill('SIGINT');
      });

      process.on('SIGTERM', () => {
        console.log('\n📡 Received SIGTERM, stopping sync service...');
        serviceProcess.kill('SIGTERM');
      });

      return;
    }

    // Standard Windows service start
    if (forceBuild) {
      console.log('🔨 Force build requested - rebuilding service before starting...');
      await execAsync('npm run build:service', { cwd: process.cwd() });
      console.log('✅ Service build completed');
    }

    console.log('🚀 Starting Multi-Business Sync Service (Hybrid Mode)...');
    console.log('📊 Current service status: Checking...');

    // Check current status first
    try {
      const { stdout: statusOut } = await execAsync(`${SC} query ${SERVICE_NAME}`);
      if (statusOut.includes('RUNNING')) {
        console.log('📊 Current service status: ALREADY RUNNING');
        console.log('✅ Service is already started!');
        console.log('🌐 Application should be accessible at http://localhost:8080');
        return;
      } else {
        console.log('📊 Current service status: STOPPED');
      }
    } catch (err) {
      console.log('📊 Current service status: NOT_INSTALLED (need to install service first)');
    }

    console.log(`[${new Date().toISOString()}] [INFO] Starting service using sc.exe...`);
    const { stdout, stderr} = await execAsync(`${SC} start ${SERVICE_NAME}`);
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Wait for service to actually start and reach RUNNING state
    console.log(`[${new Date().toISOString()}] [INFO] Waiting for service to fully start...`);
    await waitForServiceRunning();

    console.log(`[${new Date().toISOString()}] [INFO] Service started successfully`);
    console.log('🌐 Application should be accessible at http://localhost:8080');

    // Show process information
    try {
      console.log('📋 Service processes:');
      const { stdout: procOut } = await execAsync('wmic process where "name=\'node.exe\'" get ProcessId,PageFileUsage,Name /format:csv | findstr node.exe');
      const lines = procOut.split('\n').filter(line => line.trim() && line.includes('node.exe'));
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const name = parts[1];
          const memory = parts[2];
          const pid = parts[3];
          if (pid && pid.trim()) {
            console.log(`   - PID ${pid.trim()}: ${name} (${memory} K)`);
          }
        }
      }
    } catch (err) {
      // Ignore process listing errors
    }
  } catch (err) {
    const msg = String(err);
    const stdout = err && err.stdout ? String(err.stdout) : '';
    const stderr = err && err.stderr ? String(err.stderr) : '';
    console.error('Failed to start service:', msg);

    const looksLikeAccessDenied = msg.includes('FAILED 5') || msg.toLowerCase().includes('access is denied') || stdout.includes('FAILED 5') || stdout.toLowerCase().includes('access is denied') || stderr.toLowerCase().includes('access is denied');

    if (looksLikeAccessDenied) {
      console.error('Access denied when starting the service. This usually means you need administrator privileges.');
      console.log('Please run this command from an elevated (Administrator) shell. Steps:');
      console.log('  1. Open Start -> type "PowerShell" -> Right click -> Run as Administrator');
      console.log('  2. In the elevated shell, run:');
      console.log(`     ${SC} start ${SERVICE_NAME}`);
      console.log('  or from the project folder:');
      console.log('     npm run sync-service:start');
      console.log('\nIf you need to install the service first, run:');
      console.log('     npm run sync-service:install');
      console.log('\nFor development/testing, use direct start:');
      console.log('     npm run sync-service:start -- --direct');
      console.log('     npm run sync-service:start -- --force-build');
    } else {
      console.error('Unexpected error starting service. Full error:');
      console.error(err);
    }
    process.exit(1);
  }
}

run();
