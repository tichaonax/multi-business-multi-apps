// Test script to verify admin permissions
import { getEffectivePermissions } from './src/lib/permission-utils.js'

// Test with admin user
const adminUser = {
  id: 'admin-user-id',
  role: 'admin',
  permissions: {},
  businessMemberships: []
};

const permissions = getEffectivePermissions(adminUser);
console.log('Admin user permissions:');
console.log('canMakeExpensePayments:', permissions.canMakeExpensePayments);
console.log('canAccessExpenseAccount:', permissions.canAccessExpenseAccount);
console.log('Full permissions object:', JSON.stringify(permissions, null, 2));