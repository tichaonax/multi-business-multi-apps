const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed ESP32 WiFi Portal Demo Data
 * Creates token configurations, menu items, tokens, and sales for demo businesses
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function getDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function getMinutesAgo(minutes) {
  const date = new Date()
  date.setMinutes(date.getMinutes() - minutes)
  return date
}

function generateToken(prefix = 'WIFI') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = prefix + '-'
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

async function seedESP32WiFiDemo() {
  console.log('🌱 Starting ESP32 WiFi Portal Demo Data Seeding...\n')

  try {
    // Get demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    })

    console.log(`Found ${demoBusinesses.length} demo businesses\n`)

    if (demoBusinesses.length === 0) {
      console.log('❌ No demo businesses found. Please run business seed scripts first.')
      return
    }

    // Get a system user for sales
    const systemUser = await prisma.users.findFirst({
      where: { email: { contains: 'admin' } },
      select: { id: true }
    })

    if (!systemUser) {
      console.log('❌ No admin user found. Cannot create sales records.')
      return
    }

    // Get restaurant and grocery demo businesses
    const restaurant = demoBusinesses.find(b => b.type === 'restaurant')
    const grocery = demoBusinesses.find(b => b.type === 'grocery')

    // ═══════════════════════════════════════════════════════════
    // RESTAURANT DEMO - 2 Token Configurations
    // ═══════════════════════════════════════════════════════════
    if (restaurant) {
      console.log(`📱 Setting up ESP32 WiFi for: ${restaurant.name}`)

      // Get or create expense account for WiFi sales
      let expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: { contains: 'WiFi' }
        }
      })

      if (!expenseAccount) {
        console.log(`  Creating WiFi Portal expense account...`)
        expenseAccount = await prisma.expenseAccounts.create({
          data: {
            accountNumber: `WIFI-${restaurant.id.substring(0, 8).toUpperCase()}`,
            accountName: 'WiFi Portal Sales',
            balance: 0,
            lowBalanceThreshold: 0,
            isActive: true,
            createdBy: systemUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`  ✅ Created expense account: ${expenseAccount.accountNumber}`)
      } else {
        console.log(`  ✅ Using existing WiFi expense account`)
      }

      // Token Configuration 1: 30 Min Free
      console.log(`\n  Creating token configuration: 30 Min Free WiFi`)
      const config1 = await prisma.tokenConfigurations.create({
        data: {
          name: '30 Min Free WiFi',
          description: 'Complimentary 30 minutes internet access',
          durationMinutes: 30,
          bandwidthDownMb: 5,
          bandwidthUpMb: 2,
          ssid: 'RestaurantDemo-Guest',
          basePrice: 0,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${config1.name} (${config1.durationMinutes} min, Free)`)

      // Link to restaurant menu
      const menuItem1 = await prisma.businessTokenMenuItems.create({
        data: {
          businessId: restaurant.id,
          tokenConfigId: config1.id,
          businessPrice: 0,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added to restaurant menu (Price: $0.00)`)

      // Token Configuration 2: 1 Hour Premium
      console.log(`\n  Creating token configuration: 1 Hour Premium WiFi`)
      const config2 = await prisma.tokenConfigurations.create({
        data: {
          name: '1 Hour Premium WiFi',
          description: 'High-speed internet for 1 hour',
          durationMinutes: 60,
          bandwidthDownMb: 25,
          bandwidthUpMb: 10,
          ssid: 'RestaurantDemo-Guest',
          basePrice: 4.99,
          isActive: true,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${config2.name} (${config2.durationMinutes} min, $${config2.basePrice})`)

      // Link to restaurant menu
      const menuItem2 = await prisma.businessTokenMenuItems.create({
        data: {
          businessId: restaurant.id,
          tokenConfigId: config2.id,
          businessPrice: 4.99,
          isActive: true,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added to restaurant menu (Price: $4.99)`)

      // Generate 10 sample tokens (5 active, 5 expired)
      console.log(`\n  Generating 10 sample tokens...`)
      const restaurantTokens = []

      // 5 active tokens (not used yet)
      for (let i = 0; i < 5; i++) {
        const config = i < 3 ? config1 : config2
        const menuItem = i < 3 ? menuItem1 : menuItem2

        const token = await prisma.wifiTokens.create({
          data: {
            businessId: restaurant.id,
            tokenConfigId: config.id,
            businessTokenMenuItemId: menuItem.id,
            token: generateToken('REST'),
            status: 'ACTIVE',
            createdAt: getDaysAgo(randomInt(1, 5)),
            usageCount: 0,
            deviceCount: 0
          }
        })
        restaurantTokens.push(token)
      }
      console.log(`  ✅ Created 5 active tokens (unused)`)

      // 5 expired tokens (previously used)
      for (let i = 0; i < 5; i++) {
        const config = i < 2 ? config1 : config2
        const menuItem = i < 2 ? menuItem1 : menuItem2
        const createdDaysAgo = randomInt(10, 25)

        const token = await prisma.wifiTokens.create({
          data: {
            businessId: restaurant.id,
            tokenConfigId: config.id,
            businessTokenMenuItemId: menuItem.id,
            token: generateToken('REST'),
            status: 'EXPIRED',
            createdAt: getDaysAgo(createdDaysAgo),
            firstUsedAt: getDaysAgo(createdDaysAgo),
            expiresAt: getDaysAgo(createdDaysAgo - 1),
            usageCount: randomInt(1, 5),
            deviceCount: randomInt(1, 3),
            bandwidthUsedDown: randomInt(100, 500),
            bandwidthUsedUp: randomInt(20, 100),
            deviceType: randomItem(['Android', 'iOS', 'Windows', 'MacOS']),
            lastSyncedAt: getDaysAgo(createdDaysAgo - 1)
          }
        })
        restaurantTokens.push(token)
      }
      console.log(`  ✅ Created 5 expired tokens (previously used)`)

      // Create 3 WiFi token sales
      console.log(`\n  Creating 3 token sales records...`)
      for (let i = 0; i < 3; i++) {
        const soldDaysAgo = randomInt(2, 15)
        const soldToken = restaurantTokens[randomInt(5, 9)] // Use one of the expired tokens
        const config = soldToken.tokenConfigId === config1.id ? config1 : config2

        await prisma.wifiTokenSales.create({
          data: {
            businessId: restaurant.id,
            wifiTokenId: soldToken.id,
            expenseAccountId: expenseAccount.id,
            saleAmount: parseFloat(config.basePrice),
            paymentMethod: randomItem(['CASH', 'CREDIT_CARD', 'DEBIT_CARD']),
            saleChannel: 'POS',
            soldAt: getDaysAgo(soldDaysAgo),
            soldBy: systemUser.id,
            receiptPrinted: true
          }
        })
      }
      console.log(`  ✅ Created 3 sales records`)

      console.log(`\n✅ Restaurant WiFi Demo Complete:`)
      console.log(`   - 2 token configurations`)
      console.log(`   - 2 menu items`)
      console.log(`   - 10 tokens (5 active, 5 expired)`)
      console.log(`   - 3 sales records\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // GROCERY DEMO - 2 Different Token Configurations
    // ═══════════════════════════════════════════════════════════
    if (grocery) {
      console.log(`📱 Setting up ESP32 WiFi for: ${grocery.name}`)

      // Get or create expense account for WiFi sales
      let expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: { contains: 'WiFi' }
        }
      })

      if (!expenseAccount) {
        console.log(`  Creating WiFi Portal expense account...`)
        expenseAccount = await prisma.expenseAccounts.create({
          data: {
            accountNumber: `WIFI-${grocery.id.substring(0, 8).toUpperCase()}`,
            accountName: 'WiFi Portal Sales',
            balance: 0,
            lowBalanceThreshold: 0,
            isActive: true,
            createdBy: systemUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`  ✅ Created expense account: ${expenseAccount.accountNumber}`)
      } else {
        console.log(`  ✅ Using existing WiFi expense account`)
      }

      // Token Configuration 1: 2 Hour Standard
      console.log(`\n  Creating token configuration: 2 Hour Standard WiFi`)
      const config3 = await prisma.tokenConfigurations.create({
        data: {
          name: '2 Hour Standard WiFi',
          description: 'Standard speed internet for 2 hours',
          durationMinutes: 120,
          bandwidthDownMb: 10,
          bandwidthUpMb: 5,
          ssid: 'GroceryDemo-Guest',
          basePrice: 3.99,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${config3.name} (${config3.durationMinutes} min, $${config3.basePrice})`)

      // Link to grocery menu
      const menuItem3 = await prisma.businessTokenMenuItems.create({
        data: {
          businessId: grocery.id,
          tokenConfigId: config3.id,
          businessPrice: 3.99,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added to grocery menu (Price: $3.99)`)

      // Token Configuration 2: 1 Day Unlimited
      console.log(`\n  Creating token configuration: 1 Day Unlimited WiFi`)
      const config4 = await prisma.tokenConfigurations.create({
        data: {
          name: '1 Day Unlimited WiFi',
          description: 'Unlimited high-speed internet for 24 hours',
          durationMinutes: 1440, // 24 hours
          bandwidthDownMb: 50,
          bandwidthUpMb: 25,
          ssid: 'GroceryDemo-Guest',
          basePrice: 9.99,
          isActive: true,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${config4.name} (${config4.durationMinutes} min, $${config4.basePrice})`)

      // Link to grocery menu
      const menuItem4 = await prisma.businessTokenMenuItems.create({
        data: {
          businessId: grocery.id,
          tokenConfigId: config4.id,
          businessPrice: 9.99,
          isActive: true,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added to grocery menu (Price: $9.99)`)

      // Generate 20 sample tokens (12 active, 8 expired)
      console.log(`\n  Generating 20 sample tokens...`)
      const groceryTokens = []

      // 12 active tokens
      for (let i = 0; i < 12; i++) {
        const config = i < 7 ? config3 : config4
        const menuItem = i < 7 ? menuItem3 : menuItem4

        const token = await prisma.wifiTokens.create({
          data: {
            businessId: grocery.id,
            tokenConfigId: config.id,
            businessTokenMenuItemId: menuItem.id,
            token: generateToken('GROC'),
            status: 'ACTIVE',
            createdAt: getDaysAgo(randomInt(1, 7)),
            usageCount: 0,
            deviceCount: 0
          }
        })
        groceryTokens.push(token)
      }
      console.log(`  ✅ Created 12 active tokens (unused)`)

      // 8 expired tokens
      for (let i = 0; i < 8; i++) {
        const config = i < 4 ? config3 : config4
        const menuItem = i < 4 ? menuItem3 : menuItem4
        const createdDaysAgo = randomInt(10, 30)

        const token = await prisma.wifiTokens.create({
          data: {
            businessId: grocery.id,
            tokenConfigId: config.id,
            businessTokenMenuItemId: menuItem.id,
            token: generateToken('GROC'),
            status: 'EXPIRED',
            createdAt: getDaysAgo(createdDaysAgo),
            firstUsedAt: getDaysAgo(createdDaysAgo),
            expiresAt: getDaysAgo(createdDaysAgo - 2),
            usageCount: randomInt(2, 10),
            deviceCount: randomInt(1, 4),
            bandwidthUsedDown: randomInt(500, 2000),
            bandwidthUsedUp: randomInt(100, 500),
            deviceType: randomItem(['Android', 'iOS', 'Windows', 'MacOS', 'Linux']),
            lastSyncedAt: getDaysAgo(createdDaysAgo - 2)
          }
        })
        groceryTokens.push(token)
      }
      console.log(`  ✅ Created 8 expired tokens (previously used)`)

      // Create 8 WiFi token sales
      console.log(`\n  Creating 8 token sales records...`)
      for (let i = 0; i < 8; i++) {
        const soldDaysAgo = randomInt(3, 20)
        const soldToken = groceryTokens[randomInt(12, 19)] // Use one of the expired tokens
        const config = soldToken.tokenConfigId === config3.id ? config3 : config4

        await prisma.wifiTokenSales.create({
          data: {
            businessId: grocery.id,
            wifiTokenId: soldToken.id,
            expenseAccountId: expenseAccount.id,
            saleAmount: parseFloat(config.basePrice),
            paymentMethod: randomItem(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT']),
            saleChannel: 'POS',
            soldAt: getDaysAgo(soldDaysAgo),
            soldBy: systemUser.id,
            receiptPrinted: true
          }
        })
      }
      console.log(`  ✅ Created 8 sales records`)

      console.log(`\n✅ Grocery WiFi Demo Complete:`)
      console.log(`   - 2 token configurations`)
      console.log(`   - 2 menu items`)
      console.log(`   - 20 tokens (12 active, 8 expired)`)
      console.log(`   - 8 sales records\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║       ✅ ESP32 WiFi Portal Demo Seeding Complete!         ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   Total Token Configurations: 4`)
    console.log(`   Total Menu Items: 4`)
    console.log(`   Total Tokens Created: 30 (17 active, 13 expired)`)
    console.log(`   Total Sales Records: 11`)
    console.log('')
    console.log('🧪 Testing:')
    console.log(`   - Login to Restaurant POS`)
    console.log(`   - Navigate to WiFi Token section`)
    console.log(`   - Verify 2 token options are available`)
    console.log(`   - Test selling a token`)
    console.log(`   - View token sales history`)
    console.log('')

  } catch (error) {
    console.error('❌ Error seeding ESP32 WiFi demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedESP32WiFiDemo()
