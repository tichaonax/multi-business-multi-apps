const { PrismaClient } = require('@prisma/client');
;(async ()=>{
  const p = new PrismaClient();
  try {
    const u = await p.users.findUnique({ where: { email: 'admin@business.local' } });
    console.log('admin user:', u ? { id: u.id, email: u.email, isActive: u.isActive, passwordHash: !!u.passwordHash } : null)
  } catch (e) {
    console.error('error', e)
  } finally { await p.$disconnect() }
})()
