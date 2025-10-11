const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const SERVICE_NAME = 'multibusinesssyncservice.exe';
const SC = process.env.SC_COMMAND || 'sc.exe';

async function run() {
  try {
    console.log(`Running: ${SC} stop ${SERVICE_NAME}`);
    const { stdout, stderr } = await execAsync(`${SC} stop ${SERVICE_NAME}`);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (err) {
    const msg = String(err);
    const stdout = err && err.stdout ? String(err.stdout) : '';
    const stderr = err && err.stderr ? String(err.stderr) : '';
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
