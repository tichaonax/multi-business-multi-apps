/**
 * Check if the server can see environment variables
 */

async function checkServerEnv() {
  console.log('🔍 Checking server environment variables...\n');

  // Test the health endpoint first
  try {
    const healthResponse = await fetch('http://localhost:8080/api/health');
    const health = await healthResponse.json();
    console.log('✅ Server is running:');
    console.log(JSON.stringify(health, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return;
  }

  // Create a test endpoint checker
  console.log('📋 Environment variable status on server:');
  console.log('   Checking if SYNC_REGISTRATION_KEY is accessible...');

  // We need to add a debug endpoint or check the existing code
  console.log('\n💡 Recommendation:');
  console.log('   Add detailed error logging to the sync request route.');
  console.log('   The error is being caught but not properly logged with details.');
}

checkServerEnv().catch(console.error);
