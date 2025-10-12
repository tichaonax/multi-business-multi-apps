const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Analyzing admin user business access patterns...\n');

    // Find users with admin role
    const adminUsers = await prisma.users.findMany({
      where: {
        OR: [
          { role: 'admin' },
          { role: 'system-admin' }
        ]
      },
      include: {
        businessMemberships: {
          include: {
            business: true
          }
        }
      }
    });

    console.log(`👤 Admin Users Found: ${adminUsers.length}\n`);

    for (const user of adminUsers) {
      console.log(`📋 User: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Business Memberships: ${user.businessMemberships.length}`);

      if (user.businessMemberships.length > 0) {
        console.log('   🏢 Business Access:');
        for (const membership of user.businessMemberships) {
          console.log(`     - ${membership.business.name} (${membership.business.type}) - Role: ${membership.role}`);
          console.log(`       ID: ${membership.business.id}`);
          console.log(`       Active: ${membership.business.isActive}`);
        }
      }
      console.log('');
    }

    // Get business statistics by type
    console.log('📊 Business Distribution Analysis:');
    const businessStats = await prisma.businesses.groupBy({
      by: ['type'],
      _count: {
        type: true
      },
      where: {
        isActive: true
      }
    });

    const totalBusinesses = await prisma.businesses.count({
      where: { isActive: true }
    });

    console.log(`\nTotal Active Businesses: ${totalBusinesses}`);
    for (const stat of businessStats) {
      console.log(`  ${stat.type}: ${stat._count.type}`);
    }

    // Get all businesses for admin access pattern analysis
    console.log('\n🏢 All Active Businesses:');
    const allBusinesses = await prisma.businesses.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        businessMemberships: {
          include: {
            user: {
              select: { name: true, email: true, role: true }
            }
          }
        }
      }
    });

    const businessesByType = {};
    for (const business of allBusinesses) {
      if (!businessesByType[business.type]) {
        businessesByType[business.type] = [];
      }
      businessesByType[business.type].push({
        id: business.id,
        name: business.name,
        memberCount: business.businessMemberships.length,
        hasAdminAccess: business.businessMemberships.some(m =>
          m.user.role === 'admin' || m.user.role === 'system-admin'
        )
      });
    }

    console.log('\n📊 Business Type Analysis:');
    for (const [type, businesses] of Object.entries(businessesByType)) {
      console.log(`\n${type.toUpperCase()} (${businesses.length} businesses):`);
      for (const biz of businesses) {
        console.log(`  - ${biz.name} (${biz.memberCount} members, Admin Access: ${biz.hasAdminAccess})`);
      }
    }

    // Check current business permissions context structure
    console.log('\n🔍 Business Membership Structure Analysis:');
    const sampleMembership = await prisma.businessMembership.findFirst({
      include: {
        business: true,
        user: true
      }
    });

    if (sampleMembership) {
      console.log('Sample Business Membership Structure:');
      console.log(`  Business ID: ${sampleMembership.businessId}`);
      console.log(`  Business Name: ${sampleMembership.business.name}`);
      console.log(`  Business Type: ${sampleMembership.business.type}`);
      console.log(`  User Role: ${sampleMembership.role}`);
      console.log(`  Permissions: ${JSON.stringify(sampleMembership.permissions, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();