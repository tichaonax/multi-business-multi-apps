/**
 * Migrate Barcode Management Permissions
 *
 * This script migrates the old single BARCODE_MANAGEMENT permission
 * to the new granular permission system:
 *
 * - BARCODE_MANAGE_TEMPLATES: Create, edit, delete barcode templates
 * - BARCODE_VIEW_TEMPLATES: View barcode templates and history
 * - BARCODE_PRINT: Submit print jobs and view print queue
 * - BARCODE_VIEW_REPORTS: Access print history and analytics
 * - BARCODE_MANAGE_SETTINGS: Configure printers and print settings
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateBarcodePermissions() {
  console.log('🔄 Starting barcode permission migration...\n');

  try {
    // Step 1: Create new granular permissions
    console.log('📝 Creating new granular permissions...');

    const newPermissions = [
      {
        name: 'BARCODE_MANAGE_TEMPLATES',
        description: 'Create, edit, and delete barcode templates',
        category: 'Barcode Management',
        isSystemPermission: true,
      },
      {
        name: 'BARCODE_VIEW_TEMPLATES',
        description: 'View barcode templates and history',
        category: 'Barcode Management',
        isSystemPermission: true,
      },
      {
        name: 'BARCODE_PRINT',
        description: 'Submit print jobs and view print queue',
        category: 'Barcode Management',
        isSystemPermission: true,
      },
      {
        name: 'BARCODE_VIEW_REPORTS',
        description: 'Access print history and analytics',
        category: 'Barcode Management',
        isSystemPermission: true,
      },
      {
        name: 'BARCODE_MANAGE_SETTINGS',
        description: 'Configure printers and print settings',
        category: 'Barcode Management',
        isSystemPermission: true,
      },
    ];

    const createdPermissions = [];
    for (const perm of newPermissions) {
      const created = await prisma.permissions.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
      createdPermissions.push(created);
      console.log(`  ✅ ${perm.name}`);
    }

    // Step 2: Find users with old BARCODE_MANAGEMENT permission
    console.log('\n🔍 Finding users with BARCODE_MANAGEMENT permission...');

    const oldPermission = await prisma.permissions.findUnique({
      where: { name: 'BARCODE_MANAGEMENT' },
      include: {
        userPermissions: {
          include: {
            users: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!oldPermission) {
      console.log('  ⚠️  Old BARCODE_MANAGEMENT permission not found. Skipping migration.');
      return;
    }

    const usersWithOldPermission = oldPermission.userPermissions
      .filter(up => up.granted)
      .map(up => up.users);

    console.log(`  Found ${usersWithOldPermission.length} users with BARCODE_MANAGEMENT`);

    // Step 3: Migrate permissions based on user role
    console.log('\n🔄 Migrating permissions for each user...\n');

    let adminCount = 0;
    let managerCount = 0;
    let userCount = 0;

    for (const user of usersWithOldPermission) {
      console.log(`  👤 ${user.name} (${user.email}) - Role: ${user.role}`);

      let permissionsToGrant = [];

      if (user.role === 'admin') {
        // Admin gets all permissions
        permissionsToGrant = createdPermissions.map(p => p.id);
        adminCount++;
        console.log(`     → Granting ALL permissions (Admin)`);
      } else if (user.role === 'manager') {
        // Manager gets: manage templates, print, view reports (not settings)
        permissionsToGrant = createdPermissions
          .filter(p => p.name !== 'BARCODE_MANAGE_SETTINGS')
          .map(p => p.id);
        managerCount++;
        console.log(`     → Granting MANAGE_TEMPLATES, VIEW_TEMPLATES, PRINT, VIEW_REPORTS (Manager)`);
      } else {
        // Regular user gets: view templates, print only
        permissionsToGrant = createdPermissions
          .filter(p => p.name === 'BARCODE_VIEW_TEMPLATES' || p.name === 'BARCODE_PRINT')
          .map(p => p.id);
        userCount++;
        console.log(`     → Granting VIEW_TEMPLATES, PRINT (User)`);
      }

      // Grant the permissions
      for (const permissionId of permissionsToGrant) {
        await prisma.userPermissions.upsert({
          where: {
            userId_permissionId: {
              userId: user.id,
              permissionId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            permissionId,
            granted: true,
            grantedBy: 'SYSTEM_MIGRATION',
          },
        });
      }

      console.log(`     ✅ Migration complete for ${user.name}\n`);
    }

    // Step 4: Remove old BARCODE_MANAGEMENT permission from users
    console.log('🗑️  Removing old BARCODE_MANAGEMENT permission from users...');

    await prisma.userPermissions.deleteMany({
      where: {
        permissionId: oldPermission.id,
      },
    });
    console.log('  ✅ Old permission grants removed');

    // Step 5: Mark old permission as deprecated (keep for reference)
    console.log('\n📌 Marking old BARCODE_MANAGEMENT permission as deprecated...');

    await prisma.permissions.update({
      where: { id: oldPermission.id },
      data: {
        description: '[DEPRECATED] Legacy barcode management permission. Replaced by granular permissions.',
        category: 'Deprecated',
      },
    });
    console.log('  ✅ Old permission marked as deprecated');

    // Step 6: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!\n');
    console.log(`📊 Summary:`);
    console.log(`   - New permissions created: ${createdPermissions.length}`);
    console.log(`   - Total users migrated: ${usersWithOldPermission.length}`);
    console.log(`     • Admins (full access): ${adminCount}`);
    console.log(`     • Managers (manage+print+reports): ${managerCount}`);
    console.log(`     • Users (view+print only): ${userCount}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateBarcodePermissions()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
