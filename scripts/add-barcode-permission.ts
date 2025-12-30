const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addBarcodePermission() {
  try {
    console.log('Adding BARCODE_MANAGEMENT permission...');

    // Check if permission already exists
    const existingPermission = await prisma.permissions.findUnique({
      where: { name: 'BARCODE_MANAGEMENT' },
    });

    if (existingPermission) {
      console.log('BARCODE_MANAGEMENT permission already exists');
      return;
    }

    // Create the permission
    const permission = await prisma.permissions.create({
      data: {
        name: 'BARCODE_MANAGEMENT',
        description: 'Allows users to manage barcode templates, print jobs, and inventory items',
        category: 'BARCODE',
        isSystemPermission: false,
      },
    });

    console.log('BARCODE_MANAGEMENT permission created:', permission.id);

    // Optionally assign to admin users
    const adminUsers = await prisma.users.findMany({
      where: {
        business_memberships: {
          some: {
            role: 'ADMIN',
          },
        },
      },
    });

    for (const user of adminUsers) {
      const existingUserPermission = await prisma.userPermissions.findFirst({
        where: {
          userId: user.id,
          permissionId: permission.id,
        },
      });

      if (!existingUserPermission) {
        await prisma.userPermissions.create({
          data: {
            userId: user.id,
            permissionId: permission.id,
            granted: true,
          },
        });
        console.log(`Granted BARCODE_MANAGEMENT permission to admin user: ${user.email}`);
      }
    }

    console.log('Barcode permission setup completed successfully');
  } catch (error) {
    console.error('Error adding barcode permission:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addBarcodePermission()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });