const { promisify } = require('util');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

// Load environment variables from .env.local
function loadEnvironmentVariables() {
  const envLocalPath = path.join(__dirname, '..', '.env.local');

  if (fs.existsSync(envLocalPath)) {
    console.log('Loading environment variables from .env.local');

    try {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const envLines = envContent.split('\n');

      for (const line of envLines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key.trim()] = value.trim();
          }
        }
      }

      console.log('✅ Environment variables loaded from .env.local');
    } catch (error) {
      console.error('❌ Failed to load .env.local:', error.message);
    }
  } else {
    console.warn('⚠️  .env.local file not found at:', envLocalPath);
  }
}

// Load environment variables at startup
loadEnvironmentVariables();

async function runPrestartUpdate(options = {}) {
  const root = path.join(__dirname, '..');
  const distDir = path.join(root, 'dist');
  const runnerPath = path.join(distDir, 'service', 'sync-service-runner.js');
  const commitFile = path.join(distDir, '.build-commit');

  if (process.env.SYNC_SKIP_PREUPDATE === '1') {
    console.log('Prestart update skipped via SYNC_SKIP_PREUPDATE=1');
    return true;
  }

  console.log('Prestart update: checking build/migration status...');

  // Get local git commit if possible
  let localCommit = null;
  try {
    const { stdout } = await execAsync('git rev-parse --short HEAD', { cwd: root });
    localCommit = stdout.trim();
    console.log(`Local commit: ${localCommit}`);
  } catch (err) {
    console.log('Could not determine local git commit (git missing or not a repo).');
  }

  // Read recorded build commit if present
  let recordedCommit = null;
  if (fs.existsSync(commitFile)) {
    try {
      recordedCommit = fs.readFileSync(commitFile, 'utf8').trim();
      console.log(`Recorded build commit: ${recordedCommit}`);
    } catch (err) {
      console.log('Could not read recorded build commit:', err.message);
    }
  }

  // Determine if build is needed
  let needBuild = false;
  if (!fs.existsSync(runnerPath)) {
    console.log('Service runner binary missing, build required');
    needBuild = true;
  } else if (localCommit && recordedCommit && localCommit !== recordedCommit) {
    console.log('Local commit differs from recorded build commit -> build required');
    needBuild = true;
  }

  if (needBuild) {
    console.log('Running build: npm run build:service');
    try {
      const { stdout, stderr } = await execAsync('npm run build:service', { cwd: root, maxBuffer: 10 * 1024 * 1024 });
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      console.log('Build completed');

      // Write commit file
      try {
        const toWrite = localCommit || `built-at-${Date.now()}`;
        if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
        fs.writeFileSync(commitFile, toWrite, 'utf8');
        console.log(`Wrote build commit reference: ${toWrite}`);
      } catch (err) {
        console.warn('Could not write build commit file:', err.message);
      }
    } catch (err) {
      console.error('Build failed during prestart update:', err.message || err);
      throw err;
    }
  } else {
    console.log('Build appears up-to-date; skipping build step');
  }

  // Run migrations
  console.log('Running Prisma generate and migrations (npx prisma generate && npx prisma migrate deploy)');
  try {
    const { stdout: gOut, stderr: gErr } = await execAsync('npx prisma generate', { cwd: root, maxBuffer: 10 * 1024 * 1024 });
    if (gOut) console.log(gOut);
    if (gErr) console.error(gErr);

    const { stdout: mOut, stderr: mErr } = await execAsync('npx prisma migrate deploy', { cwd: root, maxBuffer: 10 * 1024 * 1024 });
    if (mOut) console.log(mOut);
    if (mErr) console.error(mErr);

    console.log('Migrations completed');
  } catch (err) {
    console.error('Migrations failed during prestart update:', err.message || err);
    throw err;
  }

  return true;
}

module.exports = {
  runPrestartUpdate,
};
