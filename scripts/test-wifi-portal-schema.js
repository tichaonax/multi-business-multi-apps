const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWifiPortalSchema() {
  console.log('🧪 Testing WiFi Portal Database Schema...\n');

  let testBusinessId = null;
  let testUserId = null;
  let testExpenseAccountId = null;
  let portalIntegrationId = null;
  let tokenConfigId = null;
  let businessTokenMenuItemId = null;
  let wifiTokenId = null;
  let wifiTokenSaleId = null;

  try {
    // Step 1: Find any restaurant business
    console.log('1️⃣ Finding restaurant business...');
    let testBusiness = await prisma.businesses.findFirst({
      where: {
        type: 'restaurant'
      }
    });

    if (!testBusiness) {
      console.log('   No restaurant business found. Checking for any business...');
      testBusiness = await prisma.businesses.findFirst();

      if (!testBusiness) {
        console.log('❌ No businesses found in database. Please create a business first.');
        return;
      }
      console.log(`   Found ${testBusiness.type} business: ${testBusiness.name}`);
      console.log(`   ⚠️  Note: WiFi portal is designed for restaurant/grocery businesses`);
    }

    testBusinessId = testBusiness.id;
    console.log(`✅ Using business: ${testBusiness.name} (${testBusinessId})\n`);

    // Step 2: Find test user (owner)
    console.log('2️⃣ Finding test user...');
    const testUser = await prisma.users.findFirst({
      where: {
        business_memberships: {
          some: {
            businessId: testBusinessId
          }
        }
      }
    });

    if (!testUser) {
      console.log('❌ No user found for test business.');
      return;
    }

    testUserId = testUser.id;
    console.log(`✅ Found user: ${testUser.email} (${testUserId})\n`);

    // Step 3: Find or create WiFi revenue expense account
    console.log('3️⃣ Finding/creating WiFi revenue expense account...');
    let wifiExpenseAccount = await prisma.expenseAccounts.findFirst({
      where: {
        businessId: testBusinessId,
        accountName: 'WiFi Token Revenue'
      }
    });

    if (!wifiExpenseAccount) {
      wifiExpenseAccount = await prisma.expenseAccounts.create({
        data: {
          businessId: testBusinessId,
          accountName: 'WiFi Token Revenue',
          accountType: 'REVENUE',
          currency: 'PHP',
          balance: 0,
          createdBy: testUserId,
          autoCreated: true
        }
      });
      console.log(`✅ Created WiFi revenue account (${wifiExpenseAccount.id})\n`);
    } else {
      console.log(`✅ Found existing WiFi revenue account (${wifiExpenseAccount.id})\n`);
    }

    testExpenseAccountId = wifiExpenseAccount.id;

    // Step 4: Create PortalIntegration
    console.log('4️⃣ Creating PortalIntegration...');
    const portalIntegration = await prisma.portalIntegrations.create({
      data: {
        businessId: testBusinessId,
        apiKey: 'test_api_key_' + Date.now(),
        portalIpAddress: '192.168.1.100',
        portalPort: 8080,
        isActive: true,
        showTokensInPOS: true, // Enable POS integration
        createdBy: testUserId
      }
    });
    portalIntegrationId = portalIntegration.id;
    console.log(`✅ Created portal integration (${portalIntegrationId})`);
    console.log(`   - IP: ${portalIntegration.portalIpAddress}:${portalIntegration.portalPort}`);
    console.log(`   - POS Integration: ${portalIntegration.showTokensInPOS ? 'Enabled' : 'Disabled'}\n`);

    // Step 5: Create TokenConfiguration (admin base price)
    console.log('5️⃣ Creating TokenConfiguration...');
    const tokenConfig = await prisma.tokenConfigurations.create({
      data: {
        name: '4 Hours WiFi Access',
        description: 'High-speed WiFi access for 4 hours',
        durationMinutes: 240,
        bandwidthDownMb: 10,
        bandwidthUpMb: 5,
        basePrice: 50.00, // Admin base price
        isActive: true,
        displayOrder: 1
      }
    });
    tokenConfigId = tokenConfig.id;
    console.log(`✅ Created token configuration (${tokenConfigId})`);
    console.log(`   - Name: ${tokenConfig.name}`);
    console.log(`   - Duration: ${tokenConfig.durationMinutes} minutes`);
    console.log(`   - Base Price: ₱${tokenConfig.basePrice}\n`);

    // Step 6: Create BusinessTokenMenuItem (custom business price)
    console.log('6️⃣ Creating BusinessTokenMenuItem with custom pricing...');
    const businessTokenMenuItem = await prisma.businessTokenMenuItems.create({
      data: {
        businessId: testBusinessId,
        tokenConfigId: tokenConfigId,
        businessPrice: 65.00, // Business custom price (higher than base)
        isActive: true,
        displayOrder: 1
      }
    });
    businessTokenMenuItemId = businessTokenMenuItem.id;
    console.log(`✅ Created business token menu item (${businessTokenMenuItemId})`);
    console.log(`   - Admin Base Price: ₱${tokenConfig.basePrice}`);
    console.log(`   - Business Custom Price: ₱${businessTokenMenuItem.businessPrice}`);
    console.log(`   - Price Difference: ₱${(parseFloat(businessTokenMenuItem.businessPrice) - parseFloat(tokenConfig.basePrice)).toFixed(2)}\n`);

    // Step 7: Create WifiToken
    console.log('7️⃣ Creating WifiToken...');
    const wifiToken = await prisma.wifiTokens.create({
      data: {
        businessId: testBusinessId,
        tokenConfigId: tokenConfigId,
        businessTokenMenuItemId: businessTokenMenuItemId,
        token: 'TEST-WIFI-' + Date.now(),
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 240 * 60 * 1000), // 4 hours from now
        bandwidthUsedDown: 0,
        bandwidthUsedUp: 0,
        usageCount: 0
      }
    });
    wifiTokenId = wifiToken.id;
    console.log(`✅ Created WiFi token (${wifiTokenId})`);
    console.log(`   - Token: ${wifiToken.token}`);
    console.log(`   - Status: ${wifiToken.status}`);
    console.log(`   - Expires: ${wifiToken.expiresAt.toLocaleString()}\n`);

    // Step 8: Create WifiTokenSale
    console.log('8️⃣ Creating WifiTokenSale...');
    const wifiTokenSale = await prisma.wifiTokenSales.create({
      data: {
        businessId: testBusinessId,
        wifiTokenId: wifiTokenId,
        expenseAccountId: testExpenseAccountId,
        saleAmount: businessTokenMenuItem.businessPrice, // Use business custom price
        paymentMethod: 'CASH',
        soldBy: testUserId,
        receiptPrinted: false
      }
    });
    wifiTokenSaleId = wifiTokenSale.id;
    console.log(`✅ Created WiFi token sale (${wifiTokenSaleId})`);
    console.log(`   - Sale Amount: ₱${wifiTokenSale.saleAmount}`);
    console.log(`   - Payment Method: ${wifiTokenSale.paymentMethod}`);
    console.log(`   - Sold At: ${wifiTokenSale.soldAt.toLocaleString()}\n`);

    // Step 9: Test unique constraint (businessId + tokenConfigId)
    console.log('9️⃣ Testing unique constraint [businessId, tokenConfigId]...');
    try {
      await prisma.businessTokenMenuItems.create({
        data: {
          businessId: testBusinessId,
          tokenConfigId: tokenConfigId,
          businessPrice: 70.00,
          isActive: true,
          displayOrder: 2
        }
      });
      console.log('❌ FAILED: Unique constraint did not prevent duplicate!\n');
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('✅ PASSED: Unique constraint working correctly\n');
      } else {
        console.log(`❌ Unexpected error: ${error.message}\n`);
      }
    }

    // Step 10: Verify all relationships
    console.log('🔟 Verifying relationships...');
    const portalWithRelations = await prisma.portalIntegrations.findUnique({
      where: { id: portalIntegrationId },
      include: {
        businesses: true,
        users: true
      }
    });

    const tokenWithSales = await prisma.wifiTokens.findUnique({
      where: { id: wifiTokenId },
      include: {
        wifi_token_sales: true,
        business_token_menu_items: true,
        token_configurations: true
      }
    });

    console.log(`✅ Portal Integration → Business: ${portalWithRelations.businesses.businessName}`);
    console.log(`✅ Portal Integration → User: ${portalWithRelations.users.email}`);
    console.log(`✅ WiFi Token → Sales Count: ${tokenWithSales.wifi_token_sales.length}`);
    console.log(`✅ WiFi Token → Menu Item: ₱${tokenWithSales.business_token_menu_items.businessPrice}`);
    console.log(`✅ WiFi Token → Config: ${tokenWithSales.token_configurations.name}\n`);

    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📊 Summary:');
    console.log(`   - PortalIntegration: ${portalIntegrationId}`);
    console.log(`   - TokenConfiguration: ${tokenConfigId} (Base: ₱${tokenConfig.basePrice})`);
    console.log(`   - BusinessTokenMenuItem: ${businessTokenMenuItemId} (Custom: ₱${businessTokenMenuItem.businessPrice})`);
    console.log(`   - WifiToken: ${wifiTokenId}`);
    console.log(`   - WifiTokenSale: ${wifiTokenSaleId} (₱${wifiTokenSale.saleAmount})`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');

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
      console.log('✅ Cleanup complete!\n');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError.message);
    }

    await prisma.$disconnect();
  }
}

testWifiPortalSchema()
  .then(() => {
    console.log('✅ Test script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
