const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const SERVICE_NAME = 'multibusinesssyncservice.exe';
const SC = process.env.SC_COMMAND || 'sc.exe';
const MAX_WAIT_TIME = 60000; // 60 seconds for graceful shutdown
const CHECK_INTERVAL = 1000; // 1 second

/**
 * Wait for service to reach STOPPED state
 * Windows services don't stop instantly - they go through STOP_PENDING state
 */
async function waitForServiceStopped() {
  const startTime = Date.now();

  while ((Date.now() - startTime) < MAX_WAIT_TIME) {
    try {
      const { stdout } = await execAsync(`${SC} query ${SERVICE_NAME}`);

      if (stdout.includes('STOPPED')) {
        console.log('✅ Service fully stopped');
        return true;
      }

      if (stdout.includes('STOP_PENDING')) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏳ Waiting for service to stop... (${elapsed}s)`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
        continue;
      }

    } catch (error) {
      // If sc query fails, service might be uninstalled
      if (error.message.includes('1060') || error.message.toLowerCase().includes('does not exist')) {
        console.log('ℹ️  Service not installed');
        return true;
      }
    }

    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }

  console.log(`⚠️  Service did not stop gracefully within ${MAX_WAIT_TIME/1000} seconds`);
  console.log('🔄 Attempting force stop...');
  
  try {
    await execAsync(`taskkill /f /im node.exe /fi "WINDOWTITLE eq ${SERVICE_NAME}*"`);
    console.log('✅ Force stop completed');
    return true;
  } catch (forceError) {
    throw new Error(`Service did not stop within ${MAX_WAIT_TIME/1000} seconds and force stop failed`);
  }
}

async function run() {
  try {
    // First check if service is already stopped
    try {
      const { stdout: statusOut } = await execAsync(`${SC} query ${SERVICE_NAME}`);

      if (statusOut.includes('STOPPED')) {
        console.log('ℹ️  Service is already stopped');
        return;
      }
    } catch (statusErr) {
      // If query fails, service might not be installed
      if (statusErr.message.includes('1060') || statusErr.message.toLowerCase().includes('does not exist')) {
        console.log('ℹ️  Service is not installed');
        return;
      }
    }

    console.log(`Running: ${SC} stop ${SERVICE_NAME}`);
    const { stdout, stderr } = await execAsync(`${SC} stop ${SERVICE_NAME}`);
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Wait for service to fully stop
    await waitForServiceStopped();

  } catch (err) {
    const msg = String(err);
    const stdout = err && err.stdout ? String(err.stdout) : '';
    const stderr = err && err.stderr ? String(err.stderr) : '';

    // Handle "service not started" error gracefully
    const alreadyStopped = msg.includes('1062') ||
                          msg.toLowerCase().includes('has not been started') ||
                          stdout.includes('1062') ||
                          stdout.toLowerCase().includes('has not been started');

    if (alreadyStopped) {
      console.log('ℹ️  Service is already stopped');
      return;
    }

    console.error('Failed to stop service:', msg);

    const looksLikeAccessDenied = msg.includes('FAILED 5') || msg.toLowerCase().includes('access is denied') || stdout.includes('FAILED 5') || stdout.toLowerCase().includes('access is denied') || stderr.toLowerCase().includes('access is denied');

    if (looksLikeAccessDenied) {
      console.error('Access denied when stopping the service. This usually means you need administrator privileges.');
      console.log('Please run this command from an elevated (Administrator) shell. Steps:');
      console.log('  1. Open Start -> type "PowerShell" -> Right click -> Run as Administrator');
      console.log('  2. In the elevated shell, run:');
      console.log(`     ${SC} stop ${SERVICE_NAME}`);
      console.log('  or from the project folder:');
      console.log('     npm run sync-service:stop');
    } else {
      console.error('Unexpected error stopping service. Full error:');
      console.error(err);
    }
    process.exit(1);
  }
}

run();
