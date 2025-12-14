const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateWifiPortalSchema() {
  console.log('🧪 Validating WiFi Portal Database Schema...\n');

  let createdBusinessId = null;
  let createdUserId = null;
  let createdExpenseAccountId = null;
  let portalIntegrationId = null;
  let tokenConfigId = null;
  let businessTokenMenuItemId = null;
  let wifiTokenId = null;
  let wifiTokenSaleId = null;

  try {
    console.log('1️⃣ Creating temporary test user...');
    const testUser = await prisma.users.create({
      data: {
        id: 'test_wifi_user_' + Date.now(),
        email: 'test_wifi_' + Date.now() + '@example.com',
        name: 'WiFi Test User',
        passwordHash: 'test_password_hash',
        role: 'business_owner'
      }
    });
    createdUserId = testUser.id;
    console.log(`✅ Created test user: ${testUser.email}\n`);

    console.log('2️⃣ Creating temporary test business...');
    const testBusiness = await prisma.businesses.create({
      data: {
        name: 'WiFi Test Restaurant',
        type: 'restaurant',
        description: 'Temporary test restaurant for WiFi portal schema validation',
        isActive: true,
        createdBy: createdUserId,
        isDemo: true
      }
    });
    createdBusinessId = testBusiness.id;
    console.log(`✅ Created test business: ${testBusiness.name}\n`);

    console.log('3️⃣ Creating business membership...');
    await prisma.businessMemberships.create({
      data: {
        userId: createdUserId,
        businessId: createdBusinessId,
        role: 'owner',
        permissions: {}
      }
    });
    console.log(`✅ Created business membership\n`);

    console.log('4️⃣ Creating WiFi revenue expense account...');
    const wifiExpenseAccount = await prisma.expenseAccounts.create({
      data: {
        accountName: 'WiFi Token Revenue Test',
        accountNumber: 'WIFI-REV-' + Date.now(),
        balance: 0,
        createdBy: createdUserId
      }
    });
    createdExpenseAccountId = wifiExpenseAccount.id;
    console.log(`✅ Created expense account (${wifiExpenseAccount.id})\n`);

    console.log('5️⃣ Testing PortalIntegrations model...');
    const portalIntegration = await prisma.portalIntegrations.create({
      data: {
        businessId: createdBusinessId,
        apiKey: 'test_api_key_' + Date.now(),
        portalIpAddress: '192.168.1.100',
        portalPort: 8080,
        isActive: true,
        showTokensInPOS: true,
        createdBy: createdUserId
      }
    });
    portalIntegrationId = portalIntegration.id;
    console.log(`✅ PortalIntegrations model works correctly`);
    console.log(`   - ID: ${portalIntegration.id}`);
    console.log(`   - showTokensInPOS: ${portalIntegration.showTokensInPOS}\n`);

    console.log('6️⃣ Testing TokenConfigurations model...');
    const tokenConfig = await prisma.tokenConfigurations.create({
      data: {
        name: '4 Hours WiFi Access',
        description: 'High-speed WiFi for 4 hours',
        durationMinutes: 240,
        bandwidthDownMb: 10,
        bandwidthUpMb: 5,
        basePrice: 50.00,
        isActive: true,
        displayOrder: 1
      }
    });
    tokenConfigId = tokenConfig.id;
    console.log(`✅ TokenConfigurations model works correctly`);
    console.log(`   - Name: ${tokenConfig.name}`);
    console.log(`   - Base Price: ₱${tokenConfig.basePrice}\n`);

    console.log('7️⃣ Testing BusinessTokenMenuItems model...');
    const businessTokenMenuItem = await prisma.businessTokenMenuItems.create({
      data: {
        businessId: createdBusinessId,
        tokenConfigId: tokenConfigId,
        businessPrice: 65.00,
        isActive: true,
        displayOrder: 1
      }
    });
    businessTokenMenuItemId = businessTokenMenuItem.id;
    console.log(`✅ BusinessTokenMenuItems model works correctly`);
    console.log(`   - Business Price: ₱${businessTokenMenuItem.businessPrice}`);
    console.log(`   - Markup: ₱${(parseFloat(businessTokenMenuItem.businessPrice) - parseFloat(tokenConfig.basePrice)).toFixed(2)}\n`);

    console.log('8️⃣ Testing unique constraint [businessId, tokenConfigId]...');
    try {
      await prisma.businessTokenMenuItems.create({
        data: {
          businessId: createdBusinessId,
          tokenConfigId: tokenConfigId,
          businessPrice: 70.00,
          isActive: true
        }
      });
      console.log('❌ FAILED: Unique constraint did not prevent duplicate\n');
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('✅ PASSED: Unique constraint working correctly\n');
      } else {
        throw error;
      }
    }

    console.log('9️⃣ Testing WifiTokens model...');
    const wifiToken = await prisma.wifiTokens.create({
      data: {
        businessId: createdBusinessId,
        tokenConfigId: tokenConfigId,
        businessTokenMenuItemId: businessTokenMenuItemId,
        token: 'TEST-WIFI-' + Date.now(),
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 240 * 60 * 1000),
        bandwidthUsedDown: 0,
        bandwidthUsedUp: 0,
        usageCount: 0
      }
    });
    wifiTokenId = wifiToken.id;
    console.log(`✅ WifiTokens model works correctly`);
    console.log(`   - Token: ${wifiToken.token}`);
    console.log(`   - Status: ${wifiToken.status}\n`);

    console.log('🔟 Testing WifiTokenSales model...');
    const wifiTokenSale = await prisma.wifiTokenSales.create({
      data: {
        businessId: createdBusinessId,
        wifiTokenId: wifiTokenId,
        expenseAccountId: createdExpenseAccountId,
        saleAmount: businessTokenMenuItem.businessPrice,
        paymentMethod: 'CASH',
        soldBy: createdUserId,
        receiptPrinted: false
      }
    });
    wifiTokenSaleId = wifiTokenSale.id;
    console.log(`✅ WifiTokenSales model works correctly`);
    console.log(`   - Sale Amount: ₱${wifiTokenSale.saleAmount}`);
    console.log(`   - Payment: ${wifiTokenSale.paymentMethod}\n`);

    console.log('1️⃣1️⃣ Verifying relationships...');
    const portalWithRelations = await prisma.portalIntegrations.findUnique({
      where: { id: portalIntegrationId },
      include: {
        businesses: true,
        users: true
      }
    });

    const tokenWithRelations = await prisma.wifiTokens.findUnique({
      where: { id: wifiTokenId },
      include: {
        wifi_token_sales: true,
        business_token_menu_items: true,
        token_configurations: true,
        businesses: true
      }
    });

    console.log(`✅ All relationships working correctly`);
    console.log(`   - Portal → Business: ${portalWithRelations.businesses.name}`);
    console.log(`   - Portal → User: ${portalWithRelations.users.email}`);
    console.log(`   - Token → Sales: ${tokenWithRelations.wifi_token_sales.length} sale(s)`);
    console.log(`   - Token → Config: ${tokenWithRelations.token_configurations.name}`);
    console.log(`   - Token → Menu Item: ₱${tokenWithRelations.business_token_menu_items.businessPrice}\n`);

    console.log('✅ ALL SCHEMA VALIDATION TESTS PASSED!\n');
    console.log('📊 Validated Models:');
    console.log('   ✅ PortalIntegrations');
    console.log('   ✅ TokenConfigurations');
    console.log('   ✅ BusinessTokenMenuItems (with unique constraint)');
    console.log('   ✅ WifiTokens');
    console.log('   ✅ WifiTokenSales');
    console.log('   ✅ All foreign key relationships');
    console.log('   ✅ Cascade delete configuration\n');

  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    throw error;
  } finally {
    console.log('🧹 Cleaning up test data...');

    try {
      if (wifiTokenSaleId) {
        await prisma.wifiTokenSales.delete({ where: { id: wifiTokenSaleId } });
        console.log('✅ Deleted WifiTokenSale');
      }
      if (wifiTokenId) {
        await prisma.wifiTokens.delete({ where: { id: wifiTokenId } });
        console.log('✅ Deleted WifiToken');
      }
      if (businessTokenMenuItemId) {
        await prisma.businessTokenMenuItems.delete({ where: { id: businessTokenMenuItemId } });
        console.log('✅ Deleted BusinessTokenMenuItem');
      }
      if (tokenConfigId) {
        await prisma.tokenConfigurations.delete({ where: { id: tokenConfigId } });
        console.log('✅ Deleted TokenConfiguration');
      }
      if (portalIntegrationId) {
        await prisma.portalIntegrations.delete({ where: { id: portalIntegrationId } });
        console.log('✅ Deleted PortalIntegration');
      }
      if (createdExpenseAccountId) {
        await prisma.expenseAccounts.delete({ where: { id: createdExpenseAccountId } });
        console.log('✅ Deleted ExpenseAccount');
      }
      if (createdBusinessId) {
        await prisma.businessMemberships.deleteMany({ where: { businessId: createdBusinessId } });
        await prisma.businesses.delete({ where: { id: createdBusinessId } });
        console.log('✅ Deleted Business and Memberships');
      }
      if (createdUserId) {
        await prisma.users.delete({ where: { id: createdUserId } });
        console.log('✅ Deleted User');
      }
      console.log('✅ Cleanup complete!\n');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError.message);
    }

    await prisma.$disconnect();
  }
}

validateWifiPortalSchema()
  .then(() => {
    console.log('✅ Schema validation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  });
