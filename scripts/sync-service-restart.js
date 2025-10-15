const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const path = require('path');

const SERVICE_NAME = 'multibusinesssyncservice.exe';
const SC = process.env.SC_COMMAND || 'sc.exe';

async function checkServiceStatus() {
  try {
    const { stdout } = await execAsync(`${SC} query ${SERVICE_NAME}`);
    
    if (stdout.includes('RUNNING')) {
      return 'RUNNING';
    } else if (stdout.includes('STOPPED')) {
      return 'STOPPED';
    } else if (stdout.includes('STOP_PENDING')) {
      return 'STOP_PENDING';
    } else if (stdout.includes('START_PENDING')) {
      return 'START_PENDING';
    }
    return 'UNKNOWN';
  } catch (error) {
    if (error.message.includes('1060') || error.message.toLowerCase().includes('does not exist')) {
      return 'NOT_INSTALLED';
    }
    return 'ERROR';
  }
}

async function runScript(scriptName) {
  console.log(`🔄 Running ${scriptName}...`);
  
  const scriptPath = path.join(__dirname, scriptName);
  return new Promise((resolve, reject) => {
    const child = exec(`node "${scriptPath}"`, { 
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let output = '';
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      output += data;
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      output += data;
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function smartRestart() {
  console.log('🔄 Starting smart service restart...\n');

  // Check initial status
  const initialStatus = await checkServiceStatus();
  console.log(`📊 Initial service status: ${initialStatus}\n`);

  // Stop the service if it's running
  if (initialStatus === 'RUNNING' || initialStatus === 'START_PENDING') {
    console.log('🛑 Stopping service gracefully...');
    try {
      await runScript('sync-service-stop.js');
      console.log('✅ Service stopped successfully\n');
    } catch (error) {
      console.error('❌ Failed to stop service:', error.message);
      process.exit(1);
    }
  } else if (initialStatus === 'STOPPED') {
    console.log('ℹ️  Service already stopped\n');
  } else if (initialStatus === 'NOT_INSTALLED') {
    console.log('⚠️  Service not installed, will install and start\n');
  }

  // Wait a moment for cleanup
  console.log('⏱️  Waiting for cleanup...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify service is stopped
  const stopStatus = await checkServiceStatus();
  console.log(`📊 Service status after stop: ${stopStatus}`);
  
  if (stopStatus === 'RUNNING') {
    console.error('❌ Service is still running after stop attempt');
    process.exit(1);
  }

  // Start the service
  console.log('\n🚀 Starting service...');
  try {
    await runScript('sync-service-start.js');
    console.log('✅ Service started successfully');
  } catch (error) {
    console.error('❌ Failed to start service:', error.message);
    process.exit(1);
  }

  // Verify service is running
  await new Promise(resolve => setTimeout(resolve, 3000));
  const finalStatus = await checkServiceStatus();
  console.log(`\n📊 Final service status: ${finalStatus}`);

  if (finalStatus === 'RUNNING') {
    console.log('🎉 Service restart completed successfully!');
  } else {
    console.log(`⚠️  Service restart completed but status is: ${finalStatus}`);
    if (finalStatus === 'START_PENDING') {
      console.log('ℹ️  Service may still be starting up...');
    }
  }
}

async function run() {
  try {
    await smartRestart();
  } catch (error) {
    console.error('❌ Restart failed:', error.message);
    process.exit(1);
  }
}

run();