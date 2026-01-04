const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed R710 WiFi Portal Demo Data
 * Creates business integrations, WLANs, token configs, tokens, and sales for demo businesses
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

function generateUsername(prefix = 'demo') {
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}${timestamp}`
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar looking characters
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

async function seedR710WiFiDemo() {
  console.log('🌱 Starting R710 WiFi Portal Demo Data Seeding...\n')

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

    // Get or create R710 device
    let r710Device = await prisma.r710DeviceRegistry.findFirst()

    if (!r710Device) {
      console.log('📡 Creating R710 device registry...')
      r710Device = await prisma.r710DeviceRegistry.create({
        data: {
          deviceName: 'Demo R710 Controller',
          ipAddress: '192.168.1.100',
          macAddress: '00:11:22:33:44:55',
          firmwareVersion: '6.1.2.0',
          model: 'R710',
          isActive: true,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`✅ Created R710 device: ${r710Device.deviceName}\n`)
    } else {
      console.log(`✅ Using existing R710 device: ${r710Device.id}\n`)
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

    // Get hardware and clothing demo businesses (since restaurant/grocery have ESP32)
    const hardware = demoBusinesses.find(b => b.type === 'hardware')
    const clothing = demoBusinesses.find(b => b.type === 'clothing')

    // ═══════════════════════════════════════════════════════════
    // HARDWARE DEMO - R710 Setup
    // ═══════════════════════════════════════════════════════════
    if (hardware) {
      console.log(`📡 Setting up R710 WiFi for: ${hardware.name}`)

      // Create business integration
      let integration = await prisma.r710BusinessIntegrations.findFirst({
        where: {
          businessId: hardware.id,
          deviceRegistryId: r710Device.id
        }
      })

      if (!integration) {
        integration = await prisma.r710BusinessIntegrations.create({
          data: {
            businessId: hardware.id,
            deviceRegistryId: r710Device.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`  ✅ Created business integration`)
      } else {
        console.log(`  ✅ Using existing integration`)
      }

      // Get or create WLAN
      console.log(`\n  Setting up WLAN configuration...`)
      let wlan = await prisma.r710Wlans.findFirst({
        where: {
          businessId: hardware.id,
          deviceRegistryId: r710Device.id
        }
      })

      if (!wlan) {
        wlan = await prisma.r710Wlans.create({
          data: {
            businessId: hardware.id,
            deviceRegistryId: r710Device.id,
            wlanId: '3',
            guestServiceId: '1',
            ssid: 'HardwareDemo-Guest',
            title: 'Welcome to Hardware Demo Guest WiFi',
            logoType: 'none',
            validDays: 1,
            enableFriendlyKey: false,
            enableZeroIt: false,
            isActive: true
          }
        })
        console.log(`  ✅ Created WLAN: ${wlan.ssid}`)
      } else {
        console.log(`  ✅ Using existing WLAN: ${wlan.ssid}`)
      }

      // Get or create expense account
      let expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: { contains: 'WiFi' }
        }
      })

      if (!expenseAccount) {
        console.log(`  Creating WiFi Portal expense account...`)
        expenseAccount = await prisma.expenseAccounts.create({
          data: {
            accountNumber: `WIFI-${hardware.id.substring(0, 8).toUpperCase()}`,
            accountName: 'WiFi Portal Sales',
            balance: 0,
            lowBalanceThreshold: 0,
            isActive: true,
            createdBy: systemUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`  ✅ Created expense account`)
      } else {
        console.log(`  ✅ Using existing WiFi expense account`)
      }

      // Token Configuration 1: 1 Hour Basic
      console.log(`\n  Creating token configuration: 1 Hour Basic`)
      const config1 = await prisma.r710TokenConfigs.create({
        data: {
          businessId: hardware.id,
          wlanId: wlan.id,
          name: '1 Hour Basic WiFi',
          description: 'Basic internet access for 1 hour',
          durationValue: 1,
          durationUnit: 'HOURS',
          deviceLimit: 1,
          basePrice: 2.99,
          autoGenerateThreshold: 5,
          autoGenerateQuantity: 20,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${config1.name} ($${config1.basePrice})`)

      // Link to hardware menu
      const menuItem1 = await prisma.r710BusinessTokenMenuItems.create({
        data: {
          businessId: hardware.id,
          tokenConfigId: config1.id,
          businessPrice: 2.99,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added to hardware menu`)

      // Token Configuration 2: 4 Hour Premium
      console.log(`\n  Creating token configuration: 4 Hour Premium`)
      const config2 = await prisma.r710TokenConfigs.create({
        data: {
          businessId: hardware.id,
          wlanId: wlan.id,
          name: '4 Hour Premium WiFi',
          description: 'High-speed internet for 4 hours',
          durationValue: 4,
          durationUnit: 'HOURS',
          deviceLimit: 2,
          basePrice: 7.99,
          autoGenerateThreshold: 5,
          autoGenerateQuantity: 20,
          isActive: true,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${config2.name} ($${config2.basePrice})`)

      // Link to hardware menu
      const menuItem2 = await prisma.r710BusinessTokenMenuItems.create({
        data: {
          businessId: hardware.id,
          tokenConfigId: config2.id,
          businessPrice: 7.99,
          isActive: true,
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added to hardware menu`)

      // Generate 10 sample tokens (6 available, 4 used)
      console.log(`\n  Generating 10 sample tokens...`)
      const hardwareTokens = []

      // 6 available tokens
      for (let i = 0; i < 6; i++) {
        const config = i < 4 ? config1 : config2
        const createdDaysAgo = randomInt(1, 5)

        const token = await prisma.r710Tokens.create({
          data: {
            businessId: hardware.id,
            wlanId: wlan.id,
            tokenConfigId: config.id,
            username: generateUsername('hw'),
            password: generatePassword(),
            status: 'AVAILABLE',
            createdAt: getDaysAgo(createdDaysAgo)
          }
        })
        hardwareTokens.push(token)
      }
      console.log(`  ✅ Created 6 available tokens`)

      // 4 used tokens
      for (let i = 0; i < 4; i++) {
        const config = i < 2 ? config1 : config2
        const createdDaysAgo = randomInt(10, 20)

        const token = await prisma.r710Tokens.create({
          data: {
            businessId: hardware.id,
            wlanId: wlan.id,
            tokenConfigId: config.id,
            username: generateUsername('hw'),
            password: generatePassword(),
            status: 'EXPIRED',
            createdAt: getDaysAgo(createdDaysAgo),
            firstUsedAt: getDaysAgo(createdDaysAgo),
            expiresAtR710: getDaysAgo(createdDaysAgo - 1)
          }
        })
        hardwareTokens.push(token)
      }
      console.log(`  ✅ Created 4 used tokens`)

      // Create 3 R710 token sales
      console.log(`\n  Creating 3 token sales records...`)
      for (let i = 0; i < 3; i++) {
        const soldDaysAgo = randomInt(3, 15)
        const soldToken = hardwareTokens[randomInt(6, 9)] // Use one of the used tokens
        const config = soldToken.tokenConfigId === config1.id ? config1 : config2

        await prisma.r710TokenSales.create({
          data: {
            businessId: hardware.id,
            tokenId: soldToken.id,
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

      console.log(`\n✅ Hardware R710 WiFi Demo Complete:`)
      console.log(`   - 1 business integration`)
      console.log(`   - 1 WLAN configuration`)
      console.log(`   - 2 token configurations`)
      console.log(`   - 2 menu items`)
      console.log(`   - 10 tokens (6 available, 4 used)`)
      console.log(`   - 3 sales records\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // CLOTHING DEMO - R710 Setup
    // ═══════════════════════════════════════════════════════════
    if (clothing) {
      console.log(`📡 Setting up R710 WiFi for: ${clothing.name}`)

      // Create business integration
      let integration = await prisma.r710BusinessIntegrations.findFirst({
        where: {
          businessId: clothing.id,
          deviceRegistryId: r710Device.id
        }
      })

      if (!integration) {
        integration = await prisma.r710BusinessIntegrations.create({
          data: {
            businessId: clothing.id,
            deviceRegistryId: r710Device.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`  ✅ Created business integration`)
      } else {
        console.log(`  ✅ Using existing integration`)
      }

      // Get or create WLAN
      console.log(`\n  Setting up WLAN configuration...`)
      let wlan = await prisma.r710Wlans.findFirst({
        where: {
          businessId: clothing.id,
          deviceRegistryId: r710Device.id
        }
      })

      if (!wlan) {
        wlan = await prisma.r710Wlans.create({
          data: {
            businessId: clothing.id,
            deviceRegistryId: r710Device.id,
            wlanId: '4',
            guestServiceId: '1',
            ssid: 'ClothingDemo-Guest',
            title: 'Welcome to Clothing Demo Guest WiFi',
            logoType: 'none',
            validDays: 1,
            enableFriendlyKey: false,
            enableZeroIt: true,
            isActive: true
          }
        })
        console.log(`  ✅ Created WLAN: ${wlan.ssid}`)
      } else {
        console.log(`  ✅ Using existing WLAN: ${wlan.ssid}`)
      }

      // Get or create expense account
      let expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: { contains: 'WiFi' }
        }
      })

      if (!expenseAccount) {
        console.log(`  Creating WiFi Portal expense account...`)
        expenseAccount = await prisma.expenseAccounts.create({
          data: {
            accountNumber: `WIFI-${clothing.id.substring(0, 8).toUpperCase()}`,
            accountName: 'WiFi Portal Sales',
            balance: 0,
            lowBalanceThreshold: 0,
            isActive: true,
            createdBy: systemUser.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`  ✅ Created expense account`)
      } else {
        console.log(`  ✅ Using existing WiFi expense account`)
      }

      // Token Configuration 1: 30 Min Quick
      console.log(`\n  Creating token configuration: 30 Min Quick`)
      const config3 = await prisma.r710TokenConfigs.create({
        data: {
          businessId: clothing.id,
          wlanId: wlan.id,
          name: '30 Min Quick WiFi',
          description: 'Quick internet access for 30 minutes',
          durationValue: 30,
          durationUnit: 'MINUTES',
          deviceLimit: 1,
          basePrice: 1.99,
          autoGenerateThreshold: 10,
          autoGenerateQuantity: 30,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${config3.name} ($${config3.basePrice})`)

      // Link to clothing menu
      const menuItem3 = await prisma.r710BusinessTokenMenuItems.create({
        data: {
          businessId: clothing.id,
          tokenConfigId: config3.id,
          businessPrice: 1.99,
          isActive: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added to clothing menu`)

      // Generate 8 sample tokens (5 available, 3 used)
      console.log(`\n  Generating 8 sample tokens...`)
      const clothingTokens = []

      // 5 available tokens
      for (let i = 0; i < 5; i++) {
        const createdDaysAgo = randomInt(1, 3)

        const token = await prisma.r710Tokens.create({
          data: {
            businessId: clothing.id,
            wlanId: wlan.id,
            tokenConfigId: config3.id,
            username: generateUsername('cl'),
            password: generatePassword(),
            status: 'AVAILABLE',
            createdAt: getDaysAgo(createdDaysAgo)
          }
        })
        clothingTokens.push(token)
      }
      console.log(`  ✅ Created 5 available tokens`)

      // 3 used tokens
      for (let i = 0; i < 3; i++) {
        const createdDaysAgo = randomInt(7, 15)

        const token = await prisma.r710Tokens.create({
          data: {
            businessId: clothing.id,
            wlanId: wlan.id,
            tokenConfigId: config3.id,
            username: generateUsername('cl'),
            password: generatePassword(),
            status: 'EXPIRED',
            createdAt: getDaysAgo(createdDaysAgo),
            firstUsedAt: getDaysAgo(createdDaysAgo),
            expiresAtR710: getDaysAgo(createdDaysAgo - 1)
          }
        })
        clothingTokens.push(token)
      }
      console.log(`  ✅ Created 3 used tokens`)

      // Create 2 R710 token sales
      console.log(`\n  Creating 2 token sales records...`)
      for (let i = 0; i < 2; i++) {
        const soldDaysAgo = randomInt(5, 12)
        const soldToken = clothingTokens[randomInt(5, 7)] // Use one of the used tokens

        await prisma.r710TokenSales.create({
          data: {
            businessId: clothing.id,
            tokenId: soldToken.id,
            expenseAccountId: expenseAccount.id,
            saleAmount: parseFloat(config3.basePrice),
            paymentMethod: randomItem(['CASH', 'CREDIT_CARD']),
            saleChannel: 'POS',
            soldAt: getDaysAgo(soldDaysAgo),
            soldBy: systemUser.id,
            receiptPrinted: true
          }
        })
      }
      console.log(`  ✅ Created 2 sales records`)

      console.log(`\n✅ Clothing R710 WiFi Demo Complete:`)
      console.log(`   - 1 business integration`)
      console.log(`   - 1 WLAN configuration`)
      console.log(`   - 1 token configuration`)
      console.log(`   - 1 menu item`)
      console.log(`   - 8 tokens (5 available, 3 used)`)
      console.log(`   - 2 sales records\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║        ✅ R710 WiFi Portal Demo Seeding Complete!         ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   Total Business Integrations: 2`)
    console.log(`   Total WLAN Configurations: 2`)
    console.log(`   Total Token Configurations: 3`)
    console.log(`   Total Menu Items: 3`)
    console.log(`   Total Tokens Created: 18 (11 available, 7 used)`)
    console.log(`   Total Sales Records: 5`)
    console.log('')
    console.log('🧪 Testing:')
    console.log(`   - Login to Hardware POS`)
    console.log(`   - Navigate to R710 WiFi Token section`)
    console.log(`   - Verify 2 token options are available`)
    console.log(`   - Test selling a token`)
    console.log(`   - View token sales history`)
    console.log('')

  } catch (error) {
    console.error('❌ Error seeding R710 WiFi demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedR710WiFiDemo()
