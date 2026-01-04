const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Thermal Printer Settings Demo Data
 * Creates realistic receipt configurations for each demo business
 */

async function seedThermalPrinterSettings() {
  console.log('🖨️  Starting Thermal Printer Settings Demo Data Seeding...\n')

  try {
    // Get demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true, address: true, phone: true }
    })

    console.log(`Found ${demoBusinesses.length} demo businesses\n`)

    if (demoBusinesses.length === 0) {
      console.log('❌ No demo businesses found. Please run business seed scripts first.')
      return
    }

    // ═══════════════════════════════════════════════════════════
    // RESTAURANT DEMO - Thermal Printer Settings
    // ═══════════════════════════════════════════════════════════
    const restaurant = demoBusinesses.find(b => b.type === 'restaurant')
    if (restaurant) {
      console.log(`🍽️  Configuring thermal printer settings for: ${restaurant.name}`)

      const restaurantSettings = {
        // Receipt printer configuration
        receiptPrinter: {
          enabled: true,
          paperWidth: '80mm', // 80mm thermal paper
          charactersPerLine: 48,
          defaultCopies: 1,
          autoCut: true,

          // Header configuration
          header: {
            showLogo: false, // No logo for demo
            logoUrl: null,
            showBusinessName: true,
            businessNameSize: 'large', // small, medium, large
            showAddress: true,
            showPhone: true,
            showDate: true,
            showTime: true,
            customHeader: null
          },

          // Body configuration
          body: {
            showOrderNumber: true,
            showTableNumber: true,
            showServerName: true,
            showItemDetails: true,
            showPrices: true,
            fontSize: 'medium', // small, medium, large
            itemLineSpacing: 1
          },

          // Footer configuration
          footer: {
            showSubtotal: true,
            showTax: true,
            showTotal: true,
            showPaymentMethod: true,
            showReturnPolicy: true,
            returnPolicyText: 'No refunds on food items. Enjoy your meal!',
            showThankYouMessage: true,
            thankYouMessage: 'Thank you for dining with us!',
            customFooter: null
          },

          // WiFi token receipt format
          wifiTokenReceipt: {
            enabled: true,
            showTokenInfo: true,
            showDuration: true,
            showBandwidth: true,
            showExpiryDate: true,
            showInstructions: true,
            instructionsText: '1. Connect to WiFi network\\n2. Enter username and password\\n3. Enjoy your internet!',
            separateSection: true
          },

          // Receipt templates
          templates: {
            businessCopy: {
              enabled: true,
              condensed: true,
              showCustomerDetails: false,
              showPaymentDetails: true,
              showItemizedList: true
            },
            customerCopy: {
              enabled: true,
              condensed: false,
              showCustomerDetails: true,
              showPaymentDetails: true,
              showItemizedList: true,
              showNutritionalInfo: false
            }
          }
        },

        // Global settings
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h', // 12h or 24h
        currency: 'USD',
        currencySymbol: '$',
        taxLabel: 'Sales Tax'
      }

      await prisma.businesses.update({
        where: { id: restaurant.id },
        data: {
          settings: restaurantSettings,
          receiptReturnPolicy: 'No refunds on food items. All sales are final.',
          taxIncludedInPrice: false,
          taxRate: 8.5,
          taxLabel: 'Sales Tax'
        }
      })

      console.log(`  ✅ Restaurant thermal printer settings configured`)
      console.log(`     - Paper: 80mm, 48 characters/line`)
      console.log(`     - Auto-cut enabled`)
      console.log(`     - Business + Customer copy templates`)
      console.log(`     - WiFi token receipt format enabled\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // GROCERY DEMO - Thermal Printer Settings
    // ═══════════════════════════════════════════════════════════
    const grocery = demoBusinesses.find(b => b.type === 'grocery')
    if (grocery) {
      console.log(`🛒 Configuring thermal printer settings for: ${grocery.name}`)

      const grocerySettings = {
        // Receipt printer configuration
        receiptPrinter: {
          enabled: true,
          paperWidth: '80mm',
          charactersPerLine: 48,
          defaultCopies: 2, // Print 2 copies by default
          autoCut: true,

          header: {
            showLogo: false,
            logoUrl: null,
            showBusinessName: true,
            businessNameSize: 'large',
            showAddress: true,
            showPhone: true,
            showDate: true,
            showTime: true,
            customHeader: '** FRESH PRODUCE DAILY **'
          },

          body: {
            showOrderNumber: true,
            showTableNumber: false,
            showServerName: false,
            showItemDetails: true,
            showPrices: true,
            fontSize: 'medium',
            itemLineSpacing: 1,
            showQuantity: true,
            showUnitPrice: true,
            showTotalPrice: true
          },

          footer: {
            showSubtotal: true,
            showTax: true,
            showTotal: true,
            showPaymentMethod: true,
            showReturnPolicy: true,
            returnPolicyText: 'Returns accepted within 7 days with receipt.',
            showThankYouMessage: true,
            thankYouMessage: 'Thank you for shopping with us!',
            customFooter: 'Save your receipt for returns'
          },

          wifiTokenReceipt: {
            enabled: true,
            showTokenInfo: true,
            showDuration: true,
            showBandwidth: true,
            showExpiryDate: true,
            showInstructions: true,
            instructionsText: 'Connect to our free WiFi while you shop!',
            separateSection: true
          },

          templates: {
            businessCopy: {
              enabled: true,
              condensed: true,
              showCustomerDetails: false,
              showPaymentDetails: true,
              showItemizedList: false
            },
            customerCopy: {
              enabled: true,
              condensed: false,
              showCustomerDetails: true,
              showPaymentDetails: true,
              showItemizedList: true,
              showNutritionalInfo: false
            }
          }
        },

        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'USD',
        currencySymbol: '$',
        taxLabel: 'VAT'
      }

      await prisma.businesses.update({
        where: { id: grocery.id },
        data: {
          settings: grocerySettings,
          receiptReturnPolicy: 'Returns accepted within 7 days with receipt. Perishables excluded.',
          taxIncludedInPrice: true,
          taxRate: 10.0,
          taxLabel: 'VAT (included)'
        }
      })

      console.log(`  ✅ Grocery thermal printer settings configured`)
      console.log(`     - Paper: 80mm, 48 characters/line`)
      console.log(`     - Default 2 copies`)
      console.log(`     - Custom header message`)
      console.log(`     - Extended return policy\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // HARDWARE DEMO - Thermal Printer Settings
    // ═══════════════════════════════════════════════════════════
    const hardware = demoBusinesses.find(b => b.type === 'hardware')
    if (hardware) {
      console.log(`🔧 Configuring thermal printer settings for: ${hardware.name}`)

      const hardwareSettings = {
        // Receipt printer configuration
        receiptPrinter: {
          enabled: true,
          paperWidth: '58mm', // Smaller paper width
          charactersPerLine: 32,
          defaultCopies: 1,
          autoCut: true,

          header: {
            showLogo: false,
            logoUrl: null,
            showBusinessName: true,
            businessNameSize: 'medium',
            showAddress: true,
            showPhone: true,
            showDate: true,
            showTime: true,
            customHeader: null
          },

          body: {
            showOrderNumber: true,
            showTableNumber: false,
            showServerName: false,
            showItemDetails: true,
            showPrices: true,
            fontSize: 'small', // Smaller font for 58mm
            itemLineSpacing: 1
          },

          footer: {
            showSubtotal: true,
            showTax: true,
            showTotal: true,
            showPaymentMethod: true,
            showReturnPolicy: true,
            returnPolicyText: '30-day return policy on all hardware items.',
            showThankYouMessage: true,
            thankYouMessage: 'Build something great!',
            customFooter: 'Visit us for all your hardware needs'
          },

          wifiTokenReceipt: {
            enabled: true,
            showTokenInfo: true,
            showDuration: true,
            showBandwidth: true,
            showExpiryDate: true,
            showInstructions: true,
            instructionsText: 'Free WiFi available in-store',
            separateSection: true
          },

          templates: {
            businessCopy: {
              enabled: true,
              condensed: true,
              showCustomerDetails: false,
              showPaymentDetails: true,
              showItemizedList: true
            },
            customerCopy: {
              enabled: true,
              condensed: false,
              showCustomerDetails: true,
              showPaymentDetails: true,
              showItemizedList: true,
              showWarrantyInfo: true
            }
          }
        },

        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        currency: 'USD',
        currencySymbol: '$',
        taxLabel: 'Tax'
      }

      await prisma.businesses.update({
        where: { id: hardware.id },
        data: {
          settings: hardwareSettings,
          receiptReturnPolicy: '30-day return policy. Original packaging required. Restocking fee may apply.',
          taxIncludedInPrice: false,
          taxRate: 7.5,
          taxLabel: 'Sales Tax'
        }
      })

      console.log(`  ✅ Hardware thermal printer settings configured`)
      console.log(`     - Paper: 58mm, 32 characters/line`)
      console.log(`     - Smaller font size for compact receipts`)
      console.log(`     - Warranty info on customer copy\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // CLOTHING DEMO - Thermal Printer Settings
    // ═══════════════════════════════════════════════════════════
    const clothing = demoBusinesses.find(b => b.type === 'clothing')
    if (clothing) {
      console.log(`👔 Configuring thermal printer settings for: ${clothing.name}`)

      const clothingSettings = {
        // Receipt printer configuration
        receiptPrinter: {
          enabled: true,
          paperWidth: '80mm',
          charactersPerLine: 48,
          defaultCopies: 1,
          autoCut: true,

          header: {
            showLogo: false,
            logoUrl: null,
            showBusinessName: true,
            businessNameSize: 'large',
            showAddress: true,
            showPhone: true,
            showDate: true,
            showTime: true,
            customHeader: '** FASHION FORWARD **'
          },

          body: {
            showOrderNumber: true,
            showTableNumber: false,
            showServerName: true, // Show sales associate
            showItemDetails: true,
            showPrices: true,
            fontSize: 'medium',
            itemLineSpacing: 1,
            showSize: true,
            showColor: true,
            showStyle: true
          },

          footer: {
            showSubtotal: true,
            showTax: true,
            showTotal: true,
            showPaymentMethod: true,
            showReturnPolicy: true,
            returnPolicyText: 'Returns accepted within 14 days. Tags must be attached.',
            showThankYouMessage: true,
            thankYouMessage: 'Thank you for your purchase!',
            customFooter: 'Follow us on social media @fashiondemo'
          },

          wifiTokenReceipt: {
            enabled: true,
            showTokenInfo: true,
            showDuration: true,
            showBandwidth: true,
            showExpiryDate: true,
            showInstructions: true,
            instructionsText: 'Free WiFi while you shop!',
            separateSection: true
          },

          templates: {
            businessCopy: {
              enabled: true,
              condensed: true,
              showCustomerDetails: false,
              showPaymentDetails: true,
              showItemizedList: true
            },
            customerCopy: {
              enabled: true,
              condensed: false,
              showCustomerDetails: true,
              showPaymentDetails: true,
              showItemizedList: true,
              showSizeGuide: false
            }
          }
        },

        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        currency: 'USD',
        currencySymbol: '$',
        taxLabel: 'Sales Tax'
      }

      await prisma.businesses.update({
        where: { id: clothing.id },
        data: {
          settings: clothingSettings,
          receiptReturnPolicy: 'Returns accepted within 14 days with tags attached. Final sale items excluded.',
          taxIncludedInPrice: false,
          taxRate: 8.875,
          taxLabel: 'Sales Tax'
        }
      })

      console.log(`  ✅ Clothing thermal printer settings configured`)
      console.log(`     - Paper: 80mm, 48 characters/line`)
      console.log(`     - Shows size, color, style on receipt`)
      console.log(`     - Social media footer message\n`)
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    ✅ Thermal Printer Settings Demo Seeding Complete!     ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    console.log('\n📊 Summary:')
    console.log(`   Businesses Configured: ${demoBusinesses.length}`)
    console.log('\n📄 Receipt Settings:')
    console.log('   Restaurant:')
    console.log('     - 80mm paper, 48 chars/line')
    console.log('     - Tax NOT included in price (8.5%)')
    console.log('     - Business + Customer copy templates')
    console.log('   Grocery:')
    console.log('     - 80mm paper, 48 chars/line, 2 copies default')
    console.log('     - Tax INCLUDED in price (10%)')
    console.log('     - Custom header message')
    console.log('   Hardware:')
    console.log('     - 58mm paper, 32 chars/line')
    console.log('     - Tax NOT included in price (7.5%)')
    console.log('     - Compact format with warranty info')
    console.log('   Clothing:')
    console.log('     - 80mm paper, 48 chars/line')
    console.log('     - Tax NOT included in price (8.875%)')
    console.log('     - Size/color/style details on receipt')

    console.log('\n🧪 Testing:')
    console.log('   - Test receipt preview in each business')
    console.log('   - Verify WiFi token receipt formatting')
    console.log('   - Check business vs customer copy differences')
    console.log('   - Validate tax calculations and display')

  } catch (error) {
    console.error('❌ Error seeding thermal printer settings:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedThermalPrinterSettings()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
