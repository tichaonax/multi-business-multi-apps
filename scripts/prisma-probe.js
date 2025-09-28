const {PrismaClient} = require('@prisma/client');

(async () => {
  try {
    const p = new PrismaClient();
    console.log('keys', Object.keys(p));
    const proto = Object.getPrototypeOf(p);
    console.log('proto props', Object.getOwnPropertyNames(proto).slice(0,200));
    console.log('has employee model?', !!p.employee, typeof p.employee);
    console.log('$use type:', typeof p.$use, !!p.$use);
    // Try accessing a model method safely
    try {
      if (p.employee) {
        console.log('employee methods:', Object.keys(p.employee).slice(0,50));
      }
    } catch (e) {
      console.error('error accessing p.employee:', e && e.message ? e.message : e);
    }
    await p.$disconnect();
  } catch (err) {
    console.error('probe error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
