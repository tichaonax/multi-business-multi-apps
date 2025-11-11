/**
 * Find Peer Server Port
 * Try common ports to find where the peer server is running
 */

async function findPeerPort() {
  console.log('🔍 Searching for peer server on different ports...\n');

  const peerIp = '192.168.0.112';
  const commonPorts = [8080, 8765, 3000, 8000, 8081];

  for (const port of commonPorts) {
    const url = `http://${peerIp}:${port}`;
    console.log(`Trying ${url}/api/health ...`);

    try {
      const response = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const health = await response.json();
        console.log(`✅ FOUND! Peer server is running on port ${port}`);
        console.log(`   Status: ${health.status}`);
        console.log(`   Database: ${health.database}`);
        console.log(`   Environment: ${health.environment || 'N/A'}`);
        console.log(`\n📝 Update the sync peer configuration to use: http://${peerIp}:${port}\n`);
        return port;
      } else {
        console.log(`   ❌ Got ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${error.message}`);
    }
  }

  console.log('\n⚠️  Could not find peer server on any common port.');
  console.log('   Make sure the peer server is running and accessible.\n');
  return null;
}

findPeerPort().catch(console.error);
