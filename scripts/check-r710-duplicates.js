const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('Checking for duplicate R710 tokens (username + password)...\n');

  // Find all duplicates
  const duplicates = await prisma.$queryRaw`
    SELECT username, password, COUNT(*) as count
    FROM r710_tokens
    GROUP BY username, password
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found! Safe to proceed with migration.');
    await prisma.$disconnect();
    return;
  }

  console.log(`❌ Found ${duplicates.length} duplicate token combinations:\n`);

  for (const dup of duplicates) {
    console.log(`Username: "${dup.username}", Password: "${dup.password}", Count: ${dup.count}`);

    // Get details of each duplicate
    const tokens = await prisma.r710Tokens.findMany({
      where: {
        username: dup.username,
        password: dup.password
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        firstUsedAt: true,
        wlanId: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    tokens.forEach((token, idx) => {
      console.log(`  ${idx + 1}. ID: ${token.id}, Status: ${token.status}, Created: ${token.createdAt}, First Used: ${token.firstUsedAt || 'Never'}`);
    });
    console.log('');
  }

  console.log('\n⚠️  Migration will fail unless duplicates are resolved.');
  console.log('Options:');
  console.log('1. Keep oldest token, delete newer ones');
  console.log('2. Keep most recently used token, delete others');
  console.log('3. Manually review and decide\n');

  await prisma.$disconnect();
}

checkDuplicates().catch(console.error);
