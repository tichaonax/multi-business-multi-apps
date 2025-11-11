/**
 * Diagnose Sync Error
 * Test the sync request endpoint and identify the 500 error cause
 */

const crypto = require('crypto');

async function diagnoseSyncError() {
  console.log('🔍 Diagnosing sync error...\n');

  // Check 1: Environment variables
  console.log('1️⃣ Checking environment variables:');
  const registrationKey = process.env.SYNC_REGISTRATION_KEY;
  const registrationHash = registrationKey
    ? crypto.createHash('sha256').update(registrationKey).digest('hex')
    : null;

  console.log(`   SYNC_REGISTRATION_KEY: ${registrationKey ? '✅ Set' : '❌ Missing'}`);
  if (registrationHash) {
    console.log(`   Registration Hash: ${registrationHash.substring(0, 16)}...`);
  }
  console.log('');

  // Check 2: Database schema
  console.log('2️⃣ Checking database schema:');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Check if syncEvents table exists and has correct structure
    const syncEventsCount = await prisma.syncEvents.count().catch(e => {
      console.log('   ❌ syncEvents table error:', e.message);
      return null;
    });

    if (syncEventsCount !== null) {
      console.log(`   ✅ syncEvents table exists (${syncEventsCount} records)`);

      // Check a sample record to see structure
      const sample = await prisma.syncEvents.findFirst();
      if (sample) {
        console.log('   Sample record structure:');
        console.log('   - eventId:', typeof sample.eventId);
        console.log('   - tableName:', typeof sample.tableName);
        console.log('   - operation:', typeof sample.operation);
        console.log('   - recordId:', typeof sample.recordId);
        console.log('   - sourceNodeId:', typeof sample.sourceNodeId);
        console.log('   - createdAt:', typeof sample.createdAt);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.log('   ❌ Database connection error:', error.message);
  }
  console.log('');

  // Check 3: Test the sync request API endpoint
  console.log('3️⃣ Testing sync request API endpoint:');
  const testUrl = 'http://localhost:8080/api/sync/request';

  const testPayload = {
    sessionId: 'test-session-' + Date.now(),
    sourceNodeId: 'test-node',
    lastSyncTime: new Date(0).toISOString(),
    maxEvents: 10
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Node-ID': 'test-node',
    'X-Registration-Hash': registrationHash || 'test-hash'
  };

  console.log(`   URL: ${testUrl}`);
  console.log(`   Headers:`, headers);
  console.log(`   Payload:`, testPayload);
  console.log('');

  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload)
    });

    console.log(`   Response status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log('   Response body:', JSON.stringify(data, null, 2));

    if (response.status === 500) {
      console.log('\n   ❌ 500 Error detected!');
      console.log('   This is the same error you\'re experiencing.');
      console.log('   Check the server logs above for the actual error details.');
    } else if (response.ok) {
      console.log('\n   ✅ API endpoint working correctly!');
    }
  } catch (error) {
    console.log('   ❌ Fetch error:', error.message);
  }
}

diagnoseSyncError().catch(console.error);
