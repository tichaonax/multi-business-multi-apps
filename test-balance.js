const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businesses = await prisma.businesses.findMany({
    where: { isActive: true, type: { not: 'umbrella' } },
    select: {
      id: true,
      name: true,
      type: true,
      business_accounts: {
        select: { id: true, balance: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== Raw Prisma Results ===');
  for (const b of businesses) {
    const ba = b.business_accounts;
    console.log(JSON.stringify({
      name: b.name,
      type: b.type,
      business_accounts: ba,
      balance_type: ba ? typeof ba.balance : 'N/A',
      balance_constructor: ba ? ba.balance?.constructor?.name : 'N/A',
      balance_toString: ba ? String(ba.balance) : 'N/A',
      balance_Number: ba ? Number(ba.balance) : 'N/A',
    }));
  }

  console.log('\n=== JSON.stringify simulation (what API returns) ===');
  const jsonStr = JSON.stringify({ businesses });
  const parsed = JSON.parse(jsonStr);
  for (const b of parsed.businesses) {
    console.log(b.name, '-> balance:', b.business_accounts?.balance, '-> type:', typeof b.business_accounts?.balance);
    console.log('  Number(balance || 0):', Number(b.business_accounts?.balance || 0));
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
