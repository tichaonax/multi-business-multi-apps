/**
 * Clear R710 Session Cache
 *
 * Invalidates all cached R710 sessions to force re-initialization with updated configuration.
 * This is needed after making changes to the session initialization process.
 */

const { getR710SessionManager } = require('../dist/lib/r710-session-manager.js');

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('🧹 R710 SESSION CACHE CLEANUP');
    console.log('='.repeat(80));
    console.log('');

    const sessionManager = getR710SessionManager();

    // Get current stats
    const statsBefore = sessionManager.getStats();
    console.log('📊 Current Session Stats:');
    console.log(`   Total Sessions: ${statsBefore.totalSessions}`);
    console.log(`   Active Sessions: ${statsBefore.activeSessions}`);
    console.log(`   Idle Sessions: ${statsBefore.idleSessions}`);
    console.log('');

    if (statsBefore.totalSessions === 0) {
      console.log('✅ No sessions to clear');
      console.log('');
      return;
    }

    // Clear all sessions
    console.log('🗑️  Clearing all sessions...');
    await sessionManager.clearAllSessions();
    console.log('');

    // Verify cleanup
    const statsAfter = sessionManager.getStats();
    console.log('✅ Cleanup Complete');
    console.log(`   Remaining Sessions: ${statsAfter.totalSessions}`);
    console.log('');

    console.log('='.repeat(80));
    console.log('📝 NEXT STEPS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Next token generation request will:');
    console.log('  1. Create a fresh session');
    console.log('  2. Initialize with <guest-access/> component');
    console.log('  3. Get valid session key');
    console.log('  4. Generate tokens successfully');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('✅ Session cache cleared successfully');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to clear session cache:', error);
    process.exit(1);
  });
