const { PrismaClient } = require('@prisma/client');
;(async () => {
  const p = new PrismaClient();
  try {
  const res = await p.$queryRawUnsafe("SELECT to_regclass('public.payroll_exports')::text as exists");
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    await p.$disconnect();
  }
})();
