const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Printer System Demo Data
 * Creates network printers, barcode templates, and print jobs for demo businesses
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

async function seedPrintersDemo() {
  console.log('🖨️  Starting Printer System Demo Data Seeding...\n')

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

    const restaurant = demoBusinesses.find(b => b.type === 'restaurant')
    const grocery = demoBusinesses.find(b => b.type === 'grocery')
    const hardware = demoBusinesses.find(b => b.type === 'hardware')
    const clothing = demoBusinesses.find(b => b.type === 'clothing')

    // Get or create local sync node
    let localNode = await prisma.syncNodes.findUnique({
      where: { nodeId: 'local-node' }
    })

    if (!localNode) {
      console.log('📡 Creating local sync node...')
      localNode = await prisma.syncNodes.create({
        data: {
          nodeId: 'local-node',
          nodeName: 'Local Development Node',
          ipAddress: '127.0.0.1',
          port: 8080,
          isActive: true,
          lastSeen: new Date(),
          nodeVersion: '1.0.0',
          schemaCompatible: true,
          createdAt: new Date()
        }
      })
      console.log('✅ Created local sync node\n')
    } else {
      console.log('✅ Using existing local sync node\n')
    }

    // Get admin user for print jobs
    const adminUser = await prisma.users.findFirst({
      where: { email: { contains: 'admin' } },
      select: { id: true }
    })

    if (!adminUser) {
      console.log('❌ No admin user found. Cannot create print jobs.')
      return
    }

    // ═══════════════════════════════════════════════════════════
    // NETWORK PRINTERS
    // ═══════════════════════════════════════════════════════════
    console.log('📠 Setting up Network Printers...\n')

    // 1. Barcode Printer for Grocery Demo
    let barcodePrinter = await prisma.networkPrinters.findFirst({
      where: {
        printerType: 'barcode',
        nodeId: localNode.nodeId
      }
    })

    if (!barcodePrinter) {
      barcodePrinter = await prisma.networkPrinters.create({
        data: {
          printerId: 'ZEBRA-GK420D-DEMO',
          printerName: 'Zebra GK420d Barcode Printer',
          printerType: 'barcode',
          nodeId: localNode.nodeId,
          ipAddress: '192.168.1.201',
          port: 9100,
          capabilities: {
            maxWidth: 104, // 4 inches at 203 dpi
            dpi: 203,
            supportedSymbologies: ['CODE128', 'EAN13', 'UPCA', 'QR'],
            paperSizes: ['40x30mm', '50x40mm', '25x25mm']
          },
          isShareable: true,
          isOnline: true,
          lastSeen: new Date()
        }
      })
      console.log(`✅ Created barcode printer: ${barcodePrinter.printerName}`)
    } else {
      console.log(`✅ Using existing barcode printer: ${barcodePrinter.printerName}`)
    }

    // 2. Thermal Receipt Printer for Restaurant Demo (check if exists)
    let thermalPrinter = await prisma.networkPrinters.findFirst({
      where: {
        printerType: 'receipt',
        nodeId: localNode.nodeId
      }
    })

    if (!thermalPrinter) {
      thermalPrinter = await prisma.networkPrinters.create({
        data: {
          printerId: 'EPSON-TM-T20III-DEMO',
          printerName: 'EPSON TM-T20III Receipt',
          printerType: 'receipt',
          nodeId: localNode.nodeId,
          ipAddress: '192.168.1.202',
          port: 9100,
          capabilities: {
            maxWidth: 80, // 80mm paper
            cpl: 48, // characters per line
            supportedCommands: ['ESC/POS'],
            features: ['autoCut', 'logo', 'barcode']
          },
          isShareable: true,
          isOnline: true,
          receiptWidth: 48,
          lastSeen: new Date()
        }
      })
      console.log(`✅ Created thermal receipt printer: ${thermalPrinter.printerName}`)
    } else {
      console.log(`✅ Using existing thermal receipt printer: ${thermalPrinter.printerName}`)
    }

    // 3. Document Printer for Hardware Demo (check if exists)
    let documentPrinter = await prisma.networkPrinters.findFirst({
      where: {
        printerType: 'document',
        nodeId: localNode.nodeId
      }
    })

    if (!documentPrinter) {
      documentPrinter = await prisma.networkPrinters.create({
        data: {
          printerId: 'BROTHER-MFC-7860DW-DEMO',
          printerName: 'Brother MFC-7860DW Printer',
          printerType: 'document',
          nodeId: localNode.nodeId,
          ipAddress: '192.168.1.203',
          port: 9100,
          capabilities: {
            color: false,
            duplex: true,
            paperSizes: ['A4', 'Letter', 'Legal'],
            maxResolution: '2400x600dpi'
          },
          isShareable: true,
          isOnline: true,
          lastSeen: new Date()
        }
      })
      console.log(`✅ Created document printer: ${documentPrinter.printerName}`)
    } else {
      console.log(`✅ Using existing document printer: ${documentPrinter.printerName}`)
    }

    console.log('\n✅ Network Printers Setup Complete\n')

    // ═══════════════════════════════════════════════════════════
    // BARCODE TEMPLATES
    // ═══════════════════════════════════════════════════════════
    if (grocery) {
      console.log(`📋 Creating Barcode Templates for ${grocery.name}...\n`)

      // Template 1: Product Label (40mm × 30mm)
      let productLabelTemplate = await prisma.barcodeTemplates.findFirst({
        where: {
          businessId: grocery.id,
          name: 'Product Label - Standard'
        }
      })

      if (!productLabelTemplate) {
        productLabelTemplate = await prisma.barcodeTemplates.create({
          data: {
            name: 'Product Label - Standard',
            barcodeValue: 'TEMPLATE-001',
            type: 'grocery',
            description: 'Standard product label for grocery items (40mm × 30mm)',
            symbology: 'CODE128',
            width: 300,
            height: 150,
            margin: 10,
            displayValue: true,
            fontSize: 12,
            backgroundColor: '#FFFFFF',
            lineColor: '#000000',
            dpi: 203,
            quietZone: 10,
            paperSize: '40x30mm',
            orientation: 'landscape',
            layoutTemplate: {
              fields: [
                { name: 'productName', x: 10, y: 10, fontSize: 14, fontWeight: 'bold' },
                { name: 'price', x: 10, y: 30, fontSize: 18, fontWeight: 'bold', prefix: '$' },
                { name: 'barcode', x: 10, y: 60, width: 280, height: 80 },
                { name: 'sku', x: 10, y: 145, fontSize: 10 }
              ]
            },
            businessId: grocery.id,
            createdById: adminUser.id
          }
        })
        console.log(`  ✅ Created: ${productLabelTemplate.name}`)
      } else {
        console.log(`  ✅ Using existing: ${productLabelTemplate.name}`)
      }

      // Template 2: Shelf Label (50mm × 40mm)
      let shelfLabelTemplate = await prisma.barcodeTemplates.findFirst({
        where: {
          businessId: grocery.id,
          name: 'Shelf Label - Large'
        }
      })

      if (!shelfLabelTemplate) {
        shelfLabelTemplate = await prisma.barcodeTemplates.create({
          data: {
            name: 'Shelf Label - Large',
            barcodeValue: 'TEMPLATE-002',
            type: 'grocery',
            description: 'Large shelf label with price and description (50mm × 40mm)',
            symbology: 'CODE128',
            width: 350,
            height: 200,
            margin: 15,
            displayValue: true,
            fontSize: 14,
            backgroundColor: '#FFFFFF',
            lineColor: '#000000',
            dpi: 203,
            quietZone: 10,
            paperSize: '50x40mm',
            orientation: 'landscape',
            layoutTemplate: {
              fields: [
                { name: 'productName', x: 15, y: 15, fontSize: 16, fontWeight: 'bold', maxWidth: 320 },
                { name: 'price', x: 15, y: 45, fontSize: 24, fontWeight: 'bold', prefix: '$', color: '#D32F2F' },
                { name: 'description', x: 15, y: 80, fontSize: 11, maxWidth: 320 },
                { name: 'barcode', x: 15, y: 105, width: 320, height: 70 },
                { name: 'sku', x: 15, y: 180, fontSize: 10, color: '#666666' }
              ]
            },
            businessId: grocery.id,
            createdById: adminUser.id
          }
        })
        console.log(`  ✅ Created: ${shelfLabelTemplate.name}`)
      } else {
        console.log(`  ✅ Using existing: ${shelfLabelTemplate.name}`)
      }

      // Template 3: Asset Tag (25mm × 25mm)
      let assetTagTemplate = await prisma.barcodeTemplates.findFirst({
        where: {
          businessId: grocery.id,
          name: 'Asset Tag - Small'
        }
      })

      if (!assetTagTemplate) {
        assetTagTemplate = await prisma.barcodeTemplates.create({
          data: {
            name: 'Asset Tag - Small',
            barcodeValue: 'TEMPLATE-003',
            type: 'grocery',
            description: 'Small asset tag for inventory tracking (25mm × 25mm)',
            symbology: 'QR',
            width: 180,
            height: 180,
            margin: 5,
            displayValue: false,
            backgroundColor: '#FFFFFF',
            lineColor: '#000000',
            dpi: 203,
            quietZone: 5,
            paperSize: '25x25mm',
            orientation: 'portrait',
            layoutTemplate: {
              fields: [
                { name: 'barcode', x: 10, y: 10, width: 160, height: 160 },
                { name: 'assetId', x: 10, y: 175, fontSize: 8, align: 'center' }
              ]
            },
            businessId: grocery.id,
            createdById: adminUser.id
          }
        })
        console.log(`  ✅ Created: ${assetTagTemplate.name}`)
      } else {
        console.log(`  ✅ Using existing: ${assetTagTemplate.name}`)
      }

      console.log('\n✅ Barcode Templates Created\n')

      // ═══════════════════════════════════════════════════════════
      // BARCODE PRINT JOBS for Grocery
      // ═══════════════════════════════════════════════════════════
      console.log(`🖨️  Creating Barcode Print Jobs for ${grocery.name}...\n`)

      // Get some grocery products
      const groceryProducts = await prisma.businessProducts.findMany({
        where: { businessId: grocery.id },
        take: 10,
        select: { id: true, name: true, barcode: true, basePrice: true }
      })

      if (groceryProducts.length > 0) {
        const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'QUEUED', 'PRINTING', 'FAILED', 'QUEUED', 'CANCELLED']
        const templates = [productLabelTemplate, shelfLabelTemplate, assetTagTemplate]

        for (let i = 0; i < 10; i++) {
          const product = groceryProducts[i % groceryProducts.length]
          const template = templates[i % 3]
          const status = statuses[i]
          const daysAgo = randomInt(1, 30)
          const quantity = randomInt(10, 100)

          await prisma.barcodePrintJobs.create({
            data: {
              templateId: template.id,
              itemId: product.id,
              itemType: 'PRODUCT',
              barcodeData: product.barcode || `GRC-${product.id.slice(0, 8)}`,
              itemName: product.name,
              requestedQuantity: quantity,
              printedQuantity: status === 'COMPLETED' ? quantity : (status === 'FAILED' ? 0 : randomInt(0, quantity)),
              status: status,
              printerId: barcodePrinter.id,
              printSettings: {
                copies: quantity,
                quality: 'high',
                paperSize: template.paperSize,
                orientation: template.orientation,
                barcodeParams: {
                  barcodeData: product.barcode || `GRC-${product.id.slice(0, 8)}`,
                  symbology: template.symbology,
                  itemName: product.name,
                  businessName: grocery.name,
                  templateName: template.name,
                  width: template.width,
                  height: template.height,
                  displayValue: template.displayValue,
                  fontSize: template.fontSize,
                  customData: {
                    productName: product.name,
                    price: product.price ? `$${product.price.toFixed(2)}` : 'N/A',
                    barcodeValue: product.barcode || `GRC-${product.id.slice(0, 8)}`
                  }
                }
              },
              printedAt: status === 'COMPLETED' ? getDaysAgo(daysAgo) : null,
              errorMessage: status === 'FAILED' ? 'Printer communication timeout' : null,
              businessId: grocery.id,
              createdById: adminUser.id,
              createdAt: getDaysAgo(daysAgo)
            }
          })
        }

        console.log(`  ✅ Created 10 barcode print jobs (various statuses)`)
      }

      console.log('\n✅ Barcode Print Jobs Created\n')
    }

    // ═══════════════════════════════════════════════════════════
    // THERMAL RECEIPT PRINT JOBS for Restaurant
    // ═══════════════════════════════════════════════════════════
    if (restaurant) {
      console.log(`🧾 Creating Thermal Receipt Print Jobs for ${restaurant.name}...\n`)

      // Create sample receipt print jobs
      const receiptStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING']

      for (let i = 0; i < 5; i++) {
        const daysAgo = randomInt(1, 15)
        const orderNum = `ORD-${Date.now()}-${i}`
        const total = (Math.random() * 100 + 20).toFixed(2)

        await prisma.printJobs.create({
          data: {
            printerId: thermalPrinter.id,
            businessId: restaurant.id,
            businessType: 'restaurant',
            userId: adminUser.id,
            jobType: 'RECEIPT',
            jobData: {
              orderNumber: orderNum,
              customerName: randomItem(['Walk-in', 'Table 5', 'Delivery #' + randomInt(100, 999)]),
              total: total,
              receiptType: 'customer',
              items: randomInt(2, 8),
              timestamp: getDaysAgo(daysAgo).toISOString()
            },
            status: receiptStatuses[i],
            processedAt: receiptStatuses[i] === 'COMPLETED' ? getDaysAgo(daysAgo) : null,
            createdAt: getDaysAgo(daysAgo)
          }
        })
      }

      console.log(`  ✅ Created 5 thermal receipt print jobs`)
      console.log('\n✅ Thermal Receipt Print Jobs Created\n')
    }

    // ═══════════════════════════════════════════════════════════
    // DOCUMENT PRINT JOBS for Hardware
    // ═══════════════════════════════════════════════════════════
    if (hardware) {
      console.log(`📄 Creating Document Print Jobs for ${hardware.name}...\n`)

      const documentTypes = ['INVOICE', 'PACKING_SLIP', 'DELIVERY_NOTE']
      const statuses = ['COMPLETED', 'COMPLETED', 'PENDING']

      for (let i = 0; i < 3; i++) {
        const daysAgo = randomInt(5, 20)
        await prisma.printJobs.create({
          data: {
            printerId: documentPrinter.id,
            businessId: hardware.id,
            businessType: 'hardware',
            userId: adminUser.id,
            jobType: documentTypes[i],
            jobData: {
              documentNumber: `HW-${Date.now()}-${i}`,
              title: documentTypes[i].replace('_', ' '),
              date: getDaysAgo(daysAgo),
              pages: randomInt(1, 5)
            },
            status: statuses[i],
            processedAt: statuses[i] === 'COMPLETED' ? getDaysAgo(daysAgo) : null,
            createdAt: getDaysAgo(daysAgo)
          }
        })
      }

      console.log(`  ✅ Created 3 document print jobs`)
      console.log('\n✅ Document Print Jobs Created\n')
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║       ✅ Printer System Demo Seeding Complete!            ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    const totalPrinters = await prisma.networkPrinters.count()
    const totalTemplates = await prisma.barcodeTemplates.count()
    const totalBarcodePrintJobs = await prisma.barcodePrintJobs.count()
    const totalPrintJobs = await prisma.printJobs.count()

    console.log('\n📊 Summary:')
    console.log(`   Total Network Printers: ${totalPrinters}`)
    console.log(`   Total Barcode Templates: ${totalTemplates}`)
    console.log(`   Total Barcode Print Jobs: ${totalBarcodePrintJobs}`)
    console.log(`   Total Print Jobs: ${totalPrintJobs}`)

    console.log('\n🧪 Testing:')
    console.log('   - Grocery: Test barcode printing with 3 templates')
    console.log('   - Restaurant: Test thermal receipt printing')
    console.log('   - Hardware: Test document printing')
    console.log('   - All printers visible in printer management UI')

  } catch (error) {
    console.error('❌ Error seeding printer demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedPrintersDemo()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
