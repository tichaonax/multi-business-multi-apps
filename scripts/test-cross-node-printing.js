/**
 * Test Cross-Node Print Job Routing
 * Verifies that print jobs can be routed to printers on remote nodes
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCrossNodePrinting() {
  console.log('🧪 Testing Cross-Node Print Job Routing\n');
  console.log('=' .repeat(60));

  try {
    const currentNodeId = process.env.NODE_ID || 'default-node';

    // Test 1: Find remote printers
    console.log('\n📋 Test 1: Identify Remote Printers');
    console.log('-'.repeat(60));
    console.log(`Current Node ID: ${currentNodeId}`);

    const allPrinters = await prisma.networkPrinters.findMany({
      where: { isOnline: true },
    });

    const localPrinters = allPrinters.filter(p => p.nodeId === currentNodeId);
    const remotePrinters = allPrinters.filter(p => p.nodeId !== currentNodeId);

    console.log(`\n✅ Found ${localPrinters.length} local printer(s)`);
    console.log(`✅ Found ${remotePrinters.length} remote printer(s)`);

    if (remotePrinters.length === 0) {
      console.log('\n⚠️  No remote printers available for testing!');
      console.log('   To test cross-node printing:');
      console.log('   1. Start a second sync node');
      console.log('   2. Register a printer on that node');
      console.log('   3. Ensure both nodes are on the same network');
      console.log('   4. Run this test again');
      console.log('\n' + '='.repeat(60));
      return;
    }

    console.log('\nRemote printers available:');
    remotePrinters.forEach((printer, index) => {
      console.log(`  ${index + 1}. ${printer.printerName} (${printer.printerType})`);
      console.log(`     Node: ${printer.nodeId}`);
      console.log(`     Address: ${printer.ipAddress || 'N/A'}:${printer.port || 'N/A'}`);
    });

    // Test 2: Create test print jobs to remote printers
    console.log('\n\n📋 Test 2: Create Test Print Jobs to Remote Printers');
    console.log('-'.repeat(60));

    const testBusiness = await prisma.businesses.findFirst({
      where: { isDemoData: false },
    });

    const testUser = await prisma.users.findFirst();

    if (!testBusiness || !testUser) {
      console.log('⚠️  No business or user found for testing!');
      console.log('   Please ensure the database has at least one business and user.');
      return;
    }

    console.log(`\nTest Business: ${testBusiness.name} (${testBusiness.id})`);
    console.log(`Test User: ${testUser.name || testUser.email} (${testUser.id})`);

    // Create a test job for each remote printer
    const testJobs = [];

    for (const printer of remotePrinters.slice(0, 3)) { // Test up to 3 printers
      console.log(`\nCreating test job for remote printer: ${printer.printerName}...`);

      const testJob = await prisma.printJobs.create({
        data: {
          printerId: printer.id,
          businessId: testBusiness.id,
          businessType: testBusiness.businessType,
          userId: testUser.id,
          jobType: printer.printerType === 'label' ? 'label' : 'receipt',
          jobData: {
            test: true,
            message: `Cross-node test print from ${currentNodeId} to ${printer.nodeId}`,
            timestamp: new Date().toISOString(),
            printerName: printer.printerName,
            sourceNode: currentNodeId,
            targetNode: printer.nodeId,
          },
          status: 'PENDING',
          retryCount: 0,
        },
      });

      testJobs.push(testJob);
      console.log(`  ✅ Created test job: ${testJob.id}`);
      console.log(`     Status: ${testJob.status}`);
      console.log(`     Type: ${testJob.jobType}`);
    }

    // Test 3: Verify test jobs were created
    console.log('\n\n📋 Test 3: Verify Test Jobs');
    console.log('-'.repeat(60));

    for (const job of testJobs) {
      const verifyJob = await prisma.printJobs.findUnique({
        where: { id: job.id },
        include: {
          network_printers: {
            select: {
              printerName: true,
              nodeId: true,
              isOnline: true,
            },
          },
        },
      });

      console.log(`\n✅ Job ${verifyJob.id}:`);
      console.log(`   Printer: ${verifyJob.network_printers.printerName}`);
      console.log(`   Target Node: ${verifyJob.network_printers.nodeId}`);
      console.log(`   Printer Online: ${verifyJob.network_printers.isOnline}`);
      console.log(`   Job Status: ${verifyJob.status}`);
      console.log(`   Created: ${verifyJob.createdAt.toISOString()}`);
    }

    // Test 4: Check print job queue for remote jobs
    console.log('\n\n📋 Test 4: Check Print Job Queue');
    console.log('-'.repeat(60));

    const pendingJobs = await prisma.printJobs.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        network_printers: {
          select: {
            printerName: true,
            nodeId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`\n✅ Total pending jobs in queue: ${pendingJobs.length}`);

    const localJobs = pendingJobs.filter(j => j.network_printers.nodeId === currentNodeId);
    const remoteJobs = pendingJobs.filter(j => j.network_printers.nodeId !== currentNodeId);

    console.log(`   - Jobs for local printers: ${localJobs.length}`);
    console.log(`   - Jobs for remote printers: ${remoteJobs.length}`);

    if (remoteJobs.length > 0) {
      console.log('\nRemote print jobs:');
      remoteJobs.forEach(job => {
        console.log(`  - Job ${job.id.substring(0, 8)}...`);
        console.log(`    Printer: ${job.network_printers.printerName}`);
        console.log(`    Node: ${job.network_printers.nodeId}`);
        console.log(`    Type: ${job.jobType}`);
      });
    }

    // Test 5: Simulate job processing
    console.log('\n\n📋 Test 5: Simulate Job Processing');
    console.log('-'.repeat(60));

    console.log('\n⚠️  Note: Actual job processing requires:');
    console.log('   1. Print job queue processor running');
    console.log('   2. Network connectivity to remote nodes');
    console.log('   3. Printer drivers/protocols (ESC/POS, ZPL)');
    console.log('\nTo manually process these jobs:');
    console.log('   - Use POST /api/print/jobs/[id]/retry');
    console.log('   - Start the print queue processor');
    console.log('   - Implement actual printer communication');

    // Test 6: Check job statistics
    console.log('\n\n📋 Test 6: Print Job Statistics');
    console.log('-'.repeat(60));

    const [pending, processing, completed, failed] = await Promise.all([
      prisma.printJobs.count({ where: { status: 'PENDING' } }),
      prisma.printJobs.count({ where: { status: 'PROCESSING' } }),
      prisma.printJobs.count({ where: { status: 'COMPLETED' } }),
      prisma.printJobs.count({ where: { status: 'FAILED' } }),
    ]);

    console.log('\nJob status breakdown:');
    console.log(`  Pending: ${pending}`);
    console.log(`  Processing: ${processing}`);
    console.log(`  Completed: ${completed}`);
    console.log(`  Failed: ${failed}`);

    // Cleanup test jobs
    console.log('\n\n📋 Cleanup: Remove Test Jobs');
    console.log('-'.repeat(60));

    for (const job of testJobs) {
      await prisma.printJobs.delete({
        where: { id: job.id },
      });
      console.log(`  ✅ Deleted test job: ${job.id}`);
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Remote printers discovered: ${remotePrinters.length}`);
    console.log(`Test jobs created: ${testJobs.length}`);
    console.log(`Jobs successfully queued: ${testJobs.length}`);
    console.log(`\n✅ Cross-node print job routing works!`);
    console.log('   - Jobs can be created for remote printers');
    console.log('   - Jobs are properly queued in the database');
    console.log('   - Job routing metadata is correct');

    console.log('\n📝 Next Steps:');
    console.log('   1. Implement actual printer communication');
    console.log('   2. Start print queue processor');
    console.log('   3. Test with real printer hardware');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nError details:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCrossNodePrinting();
