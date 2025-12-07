const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

// Fixed admin user ID for consistency across all fresh installs
const SYSTEM_ADMIN_ID = 'admin-system-user-default';

async function createAdminUser() {
  const prisma = new PrismaClient();

  try {
    const password_hash = await bcrypt.hash('admin123', 12);

    const adminPermissions = {
      construction: ['read', 'write', 'delete', 'reports'],
      restaurant: ['read', 'write', 'delete', 'reports', 'pos'],
      grocery: ['read', 'write', 'delete', 'reports', 'pos'],
      clothing: ['read', 'write', 'delete', 'reports', 'pos'],
      personal: ['read', 'write', 'delete', 'reports'],
      admin: ['manage_users', 'backup_restore'],
    };

    const user = await prisma.users.upsert({
      where: {
        email: 'admin@business.local'
      },
      update: {
        passwordHash: password_hash,
        permissions: adminPermissions
      },
      create: {
        id: SYSTEM_ADMIN_ID,  // Fixed ID for system admin
        email: 'admin@business.local',
        passwordHash: password_hash,
        name: 'System Administrator',
        role: 'admin',
        permissions: adminPermissions,
        isActive: true
      }
    });

    console.log('Admin user created successfully:');
    console.log('Email: admin@business.local');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('User ID:', user.id);
    
  } catch (error) {
    console.error('Failed to create admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();