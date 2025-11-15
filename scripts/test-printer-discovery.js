/**
 * Test Multi-Node Printer Discovery
 * Verifies that printers are discovered across sync nodes
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrinterDiscovery() {
  console.log('🧪 Testing Multi-Node Printer Discovery\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check if printers table exists and has data
    console.log('\n📋 Test 1: Check Printer Table Schema');
    console.log('-'.repeat(60));

    const printers = await prisma.networkPrinters.findMany({
      select: {
        id: true,
        printerId: true,
        printerName: true,
        printerType: true,
        nodeId: true,
        ipAddress: true,
        port: true,
        capabilities: true,
        isShareable: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    console.log(`✅ Found ${printers.length} printer(s) in database`);

    if (printers.length > 0) {
      console.log('\nPrinters found:');
      printers.forEach((printer, index) => {
        console.log(`\n  ${index + 1}. ${printer.printerName} (${printer.printerId})`);
        console.log(`     Type: ${printer.printerType}`);
        console.log(`     Node: ${printer.nodeId}`);
        console.log(`     Address: ${printer.ipAddress || 'N/A'}:${printer.port || 'N/A'}`);
        console.log(`     Capabilities: ${JSON.stringify(printer.capabilities)}`);
        console.log(`     Shareable: ${printer.isShareable}`);
        console.log(`     Online: ${printer.isOnline}`);
        console.log(`     Last Seen: ${printer.lastSeen.toISOString()}`);
      });
    }

    // Test 2: Check for local vs remote printers
    console.log('\n\n📋 Test 2: Identify Local vs Remote Printers');
    console.log('-'.repeat(60));

    const currentNodeId = process.env.NODE_ID || 'default-node';
    console.log(`Current Node ID: ${currentNodeId}`);

    const localPrinters = printers.filter(p => p.nodeId === currentNodeId);
    const remotePrinters = printers.filter(p => p.nodeId !== currentNodeId);

    console.log(`\n✅ Local printers: ${localPrinters.length}`);
    console.log(`✅ Remote printers: ${remotePrinters.length}`);

    if (remotePrinters.length > 0) {
      console.log('\nRemote printer nodes:');
      const remoteNodes = [...new Set(remotePrinters.map(p => p.nodeId))];
      remoteNodes.forEach(nodeId => {
        const nodePrinters = remotePrinters.filter(p => p.nodeId === nodeId);
        console.log(`  - ${nodeId}: ${nodePrinters.length} printer(s)`);
      });
    }

    // Test 3: Check printer online status
    console.log('\n\n📋 Test 3: Check Printer Online Status');
    console.log('-'.repeat(60));

    const onlinePrinters = printers.filter(p => p.isOnline);
    const offlinePrinters = printers.filter(p => !p.isOnline);

    console.log(`✅ Online printers: ${onlinePrinters.length}`);
    console.log(`⚠️  Offline printers: ${offlinePrinters.length}`);

    // Test 4: Check shareable printers
    console.log('\n\n📋 Test 4: Check Shareable Printers');
    console.log('-'.repeat(60));

    const shareablePrinters = printers.filter(p => p.isShareable);
    console.log(`✅ Shareable printers: ${shareablePrinters.length}`);

    if (shareablePrinters.length > 0) {
      console.log('\nShareable printers:');
      shareablePrinters.forEach(printer => {
        console.log(`  - ${printer.printerName} (${printer.printerType}) on node ${printer.nodeId}`);
      });
    }

    // Test 5: Check printer capabilities
    console.log('\n\n📋 Test 5: Printer Capabilities Summary');
    console.log('-'.repeat(60));

    const capabilitySummary = {};
    printers.forEach(printer => {
      const caps = Array.isArray(printer.capabilities) ? printer.capabilities : [];
      caps.forEach(cap => {
        capabilitySummary[cap] = (capabilitySummary[cap] || 0) + 1;
      });
    });

    console.log('Capability distribution:');
    Object.entries(capabilitySummary).forEach(([cap, count]) => {
      console.log(`  - ${cap}: ${count} printer(s)`);
    });

    // Test 6: Check recent printer activity
    console.log('\n\n📋 Test 6: Recent Printer Activity');
    console.log('-'.repeat(60));

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const recentPrinters = printers.filter(p => p.lastSeen > fiveMinutesAgo);
    const stalePrinters = printers.filter(p => p.lastSeen <= fiveMinutesAgo);

    console.log(`✅ Active in last 5 minutes: ${recentPrinters.length}`);
    console.log(`⏰ Stale (>5 minutes): ${stalePrinters.length}`);

    if (stalePrinters.length > 0) {
      console.log('\nStale printers:');
      stalePrinters.forEach(printer => {
        const minutesAgo = Math.floor((Date.now() - printer.lastSeen.getTime()) / 60000);
        console.log(`  - ${printer.printerName}: last seen ${minutesAgo} minutes ago`);
      });
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total printers: ${printers.length}`);
    console.log(`  - Local: ${localPrinters.length}`);
    console.log(`  - Remote: ${remotePrinters.length}`);
    console.log(`  - Online: ${onlinePrinters.length}`);
    console.log(`  - Offline: ${offlinePrinters.length}`);
    console.log(`  - Shareable: ${shareablePrinters.length}`);
    console.log(`  - Active (5min): ${recentPrinters.length}`);

    if (printers.length === 0) {
      console.log('\n⚠️  No printers found! To test:');
      console.log('   1. Register a printer via POST /api/printers');
      console.log('   2. Start the sync service to enable discovery');
      console.log('   3. Run this test again');
    } else if (remotePrinters.length === 0) {
      console.log('\n⚠️  No remote printers discovered!');
      console.log('   To test multi-node discovery:');
      console.log('   1. Start a second sync node');
      console.log('   2. Register printers on that node');
      console.log('   3. Wait for mDNS discovery (30 seconds)');
      console.log('   4. Run this test again');
    } else {
      console.log('\n✅ Multi-node printer discovery is working!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPrinterDiscovery();
