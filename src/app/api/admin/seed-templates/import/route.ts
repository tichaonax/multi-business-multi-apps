import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import type {
  ImportTemplateOptions,
  ImportTemplateResult,
  SeedDataTemplate
} from '@/types/seed-templates'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/admin/seed-templates/import
 * 
 * Imports a seed template and applies it to a business
 * 
 * Body: ImportTemplateOptions with template data
 * Returns: ImportTemplateResult with import stats
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    const currentUser = user as any
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admins have full access)
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin && !hasUserPermission(user, 'canApplySeedTemplates')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const options: ImportTemplateOptions = await req.json()

    // Validate required fields
    if (!options.template || !options.targetBusinessId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: template, targetBusinessId' 
        },
        { status: 400 }
      )
    }

    const template: SeedDataTemplate = options.template

    // Verify target business exists
    const business = await prisma.businesses.findUnique({
      where: { id: options.targetBusinessId },
      select: { id: true, name: true, type: true }
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Target business not found' },
        { status: 404 }
      )
    }

    // Verify business type matches
    if (business.type !== template.businessType) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Business type mismatch: business is ${business.type}, template is ${template.businessType}` 
        },
        { status: 400 }
      )
    }

    const stats = {
      categoriesCreated: 0,
      categoriesSkipped: 0,
      subcategoriesCreated: 0,
      subcategoriesSkipped: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      expenseAccountsCreated: 0,
      wifiIntegrationsCreated: 0,
      wifiTokenConfigsCreated: 0,
      r710DevicesCreated: 0,
      r710WlansCreated: 0,
      r710TokenConfigsCreated: 0,
      payrollAccountsCreated: 0,
      errors: [] as string[]
    }

    // Import categories first
    for (const catData of template.categories) {
      try {
        const existing = await prisma.businessCategories.findFirst({
          where: {
            businessId: options.targetBusinessId,
            name: catData.name
          }
        })

        if (existing) {
          if (options.mode === 'update' || options.mode === 'new-only') {
            stats.categoriesSkipped++
          }
        } else {
          await prisma.businessCategories.create({
            data: {
              businessId: options.targetBusinessId,
              name: catData.name,
              emoji: catData.emoji,
              color: catData.color,
              description: catData.description,
              displayOrder: catData.displayOrder,
              businessType: catData.businessType
            }
          })
          stats.categoriesCreated++
        }
      } catch (error: any) {
        stats.errors.push(`Category ${catData.name}: ${error.message}`)
      }
    }

    // Import subcategories
    for (const subData of template.subcategories) {
      try {
        // Find parent category
        const category = await prisma.businessCategories.findFirst({
          where: {
            businessId: options.targetBusinessId,
            name: subData.categoryName
          }
        })

        if (!category) {
          stats.errors.push(`Subcategory ${subData.name}: parent category ${subData.categoryName} not found`)
          continue
        }

        const existing = await prisma.inventorySubcategory.findFirst({
          where: {
            categoryId: category.id,
            name: subData.name
          }
        })

        if (existing) {
          stats.subcategoriesSkipped++
        } else {
          await prisma.inventorySubcategory.create({
            data: {
              categoryId: category.id,
              name: subData.name,
              emoji: subData.emoji,
              displayOrder: subData.displayOrder
            }
          })
          stats.subcategoriesCreated++
        }
      } catch (error: any) {
        stats.errors.push(`Subcategory ${subData.name}: ${error.message}`)
      }
    }

    // Import products
    for (const prodData of template.products) {
      try {
        // Find category
        const category = await prisma.businessCategories.findFirst({
          where: {
            businessId: options.targetBusinessId,
            name: prodData.categoryName
          }
        })

        if (!category) {
          stats.errors.push(`Product ${prodData.name}: category ${prodData.categoryName} not found`)
          continue
        }

        // Find subcategory if specified
        let subcategoryId = null
        if (prodData.subcategoryName) {
          const subcategory = await prisma.inventorySubcategory.findFirst({
            where: {
              categoryId: category.id,
              name: prodData.subcategoryName
            }
          })
          subcategoryId = subcategory?.id || null
        }

        // Find brand if specified
        let brandId = null
        if (prodData.brandName) {
          const brand = await prisma.businessBrands.findFirst({
            where: {
              businessId: options.targetBusinessId,
              name: prodData.brandName
            }
          })
          
          if (!brand) {
            // Create brand if it doesn't exist
            const newBrand = await prisma.businessBrands.create({
              data: {
                businessId: options.targetBusinessId,
                name: prodData.brandName
              }
            })
            brandId = newBrand.id
          } else {
            brandId = brand.id
          }
        }

        // Check if product exists by SKU
        const existing = prodData.sku ? await prisma.businessProducts.findFirst({
          where: {
            businessId: options.targetBusinessId,
            sku: prodData.sku
          }
        }) : null

        if (existing) {
          if (options.mode === 'skip') {
            stats.productsSkipped++
          } else if (options.mode === 'update') {
            await prisma.businessProducts.update({
              where: { id: existing.id },
              data: {
                name: prodData.name,
                description: prodData.description,
                categoryId: category.id,
                subcategoryId,
                brandId,
                basePrice: prodData.basePrice,
                costPrice: prodData.costPrice,
                originalPrice: prodData.originalPrice,
                discountPercent: prodData.discountPercent,
                attributes: prodData.attributes as any
              }
            })
            stats.productsUpdated++
          } else if (options.mode === 'new-only') {
            stats.productsSkipped++
          }
        } else {
          await prisma.businessProducts.create({
            data: {
              businessId: options.targetBusinessId,
              sku: prodData.sku || undefined,
              name: prodData.name,
              description: prodData.description,
              categoryId: category.id,
              subcategoryId,
              brandId,
              basePrice: prodData.basePrice,
              costPrice: prodData.costPrice,
              originalPrice: prodData.originalPrice,
              discountPercent: prodData.discountPercent,
              attributes: prodData.attributes as any,
              isActive: true
            }
          })
          stats.productsCreated++
        }
      } catch (error: any) {
        stats.errors.push(`Product ${prodData.name}: ${error.message}`)
      }
    }

    // Import expense accounts (if present in template)
    if (template.expenseAccounts && template.expenseAccounts.length > 0) {
      for (const accountData of template.expenseAccounts) {
        try {
          const existing = await prisma.expenseAccounts.findUnique({
            where: { accountNumber: accountData.accountNumber }
          })

          if (!existing) {
            await prisma.expenseAccounts.create({
              data: {
                accountNumber: accountData.accountNumber,
                accountName: accountData.accountName,
                description: accountData.description,
                balance: accountData.initialBalance || 0,
                lowBalanceThreshold: accountData.lowBalanceThreshold || 500,
                isActive: accountData.isActive !== false,
                createdBy: user.id
              }
            })
            stats.expenseAccountsCreated++
          }
        } catch (error: any) {
          stats.errors.push(`Expense account ${accountData.accountName}: ${error.message}`)
        }
      }
    }

    // Import WiFi integrations (ESP32 Portal) - if present in template
    if (template.wifiIntegrations && template.wifiIntegrations.length > 0) {
      for (const wifiData of template.wifiIntegrations) {
        try {
          const existing = await prisma.portalIntegrations.findUnique({
            where: { businessId: options.targetBusinessId }
          })

          if (!existing) {
            // Find expense account by account number if specified
            let expenseAccountId = null
            if (wifiData.expenseAccountNumber) {
              const expenseAccount = await prisma.expenseAccounts.findUnique({
                where: { accountNumber: wifiData.expenseAccountNumber }
              })
              expenseAccountId = expenseAccount?.id || null
            }

            await prisma.portalIntegrations.create({
              data: {
                businessId: options.targetBusinessId,
                portalIpAddress: wifiData.portalIpAddress,
                portalPort: wifiData.portalPort,
                apiKey: wifiData.apiKey,
                isActive: wifiData.isActive !== false,
                showTokensInPOS: wifiData.showTokensInPOS || false,
                expenseAccountId,
                createdBy: user.id
              }
            })
            stats.wifiIntegrationsCreated++
          }
        } catch (error: any) {
          stats.errors.push(`WiFi integration ${wifiData.portalIpAddress}: ${error.message}`)
        }
      }
    }

    // Import WiFi token configs (ESP32) - if present in template
    if (template.wifiTokenConfigs && template.wifiTokenConfigs.length > 0) {
      for (const configData of template.wifiTokenConfigs) {
        try {
          const existing = await prisma.tokenConfigurations.findFirst({
            where: { name: configData.name }
          })

          if (!existing) {
            const tokenConfig = await prisma.tokenConfigurations.create({
              data: {
                name: configData.name,
                description: configData.description,
                durationMinutes: configData.durationMinutes,
                bandwidthDownMb: configData.bandwidthDownMb,
                bandwidthUpMb: configData.bandwidthUpMb,
                basePrice: configData.basePrice,
                ssid: configData.ssid,
                isActive: configData.isActive !== false,
                displayOrder: configData.displayOrder || 0
              }
            })

            // Create business menu item for this business
            await prisma.businessTokenMenuItems.create({
              data: {
                businessId: options.targetBusinessId,
                tokenConfigId: tokenConfig.id,
                customPrice: configData.basePrice,
                isEnabled: true
              }
            })
            stats.wifiTokenConfigsCreated++
          }
        } catch (error: any) {
          stats.errors.push(`WiFi token config ${configData.name}: ${error.message}`)
        }
      }
    }

    // Import R710 devices - if present in template
    if (template.r710Devices && template.r710Devices.length > 0) {
      for (const deviceData of template.r710Devices) {
        try {
          const existing = await prisma.r710DeviceRegistry.findUnique({
            where: { ipAddress: deviceData.ipAddress }
          })

          if (!existing) {
            const device = await prisma.r710DeviceRegistry.create({
              data: {
                ipAddress: deviceData.ipAddress,
                adminUsername: deviceData.adminUsername,
                encryptedAdminPassword: '', // Will need to be set manually
                firmwareVersion: deviceData.firmwareVersion,
                model: deviceData.model || 'R710',
                description: deviceData.description,
                isActive: deviceData.isActive !== false,
                connectionStatus: 'DISCONNECTED',
                createdBy: user.id
              }
            })

            // Create business integration
            await prisma.r710BusinessIntegrations.create({
              data: {
                businessId: options.targetBusinessId,
                deviceRegistryId: device.id,
                isActive: true
              }
            })
            stats.r710DevicesCreated++
          }
        } catch (error: any) {
          stats.errors.push(`R710 device ${deviceData.ipAddress}: ${error.message}`)
        }
      }
    }

    // Import R710 WLANs - if present in template
    if (template.r710Wlans && template.r710Wlans.length > 0) {
      for (const wlanData of template.r710Wlans) {
        try {
          // Find device by IP address
          const device = await prisma.r710DeviceRegistry.findUnique({
            where: { ipAddress: wlanData.deviceIpAddress }
          })

          if (!device) {
            stats.errors.push(`R710 WLAN ${wlanData.ssid}: device ${wlanData.deviceIpAddress} not found`)
            continue
          }

          const existing = await prisma.r710Wlans.findFirst({
            where: {
              businessId: options.targetBusinessId,
              deviceRegistryId: device.id,
              wlanId: wlanData.wlanId
            }
          })

          if (!existing) {
            await prisma.r710Wlans.create({
              data: {
                businessId: options.targetBusinessId,
                deviceRegistryId: device.id,
                wlanId: wlanData.wlanId,
                guestServiceId: wlanData.guestServiceId,
                ssid: wlanData.ssid,
                logoType: wlanData.logoType || 'none',
                title: wlanData.title || 'Welcome to Guest WiFi !',
                validDays: wlanData.validDays || 1,
                enableFriendlyKey: wlanData.enableFriendlyKey || false,
                enableZeroIt: wlanData.enableZeroIt !== false,
                isActive: wlanData.isActive !== false
              }
            })
            stats.r710WlansCreated++
          }
        } catch (error: any) {
          stats.errors.push(`R710 WLAN ${wlanData.ssid}: ${error.message}`)
        }
      }
    }

    // Import R710 token configs - if present in template
    if (template.r710TokenConfigs && template.r710TokenConfigs.length > 0) {
      for (const configData of template.r710TokenConfigs) {
        try {
          // Find WLAN by SSID
          const wlan = await prisma.r710Wlans.findFirst({
            where: {
              businessId: options.targetBusinessId,
              ssid: configData.wlanSsid
            }
          })

          if (!wlan) {
            stats.errors.push(`R710 token config ${configData.name}: WLAN ${configData.wlanSsid} not found`)
            continue
          }

          const existing = await prisma.r710TokenConfigs.findFirst({
            where: {
              businessId: options.targetBusinessId,
              name: configData.name
            }
          })

          if (!existing) {
            const tokenConfig = await prisma.r710TokenConfigs.create({
              data: {
                businessId: options.targetBusinessId,
                wlanId: wlan.id,
                name: configData.name,
                description: configData.description,
                durationValue: configData.durationValue,
                durationUnit: configData.durationUnit,
                deviceLimit: configData.deviceLimit || 1,
                basePrice: configData.basePrice,
                autoGenerateThreshold: configData.autoGenerateThreshold || 5,
                autoGenerateQuantity: configData.autoGenerateQuantity || 20,
                isActive: configData.isActive !== false,
                displayOrder: configData.displayOrder || 0
              }
            })

            // Create business menu item for this business
            await prisma.r710BusinessTokenMenuItems.create({
              data: {
                businessId: options.targetBusinessId,
                tokenConfigId: tokenConfig.id,
                customPrice: configData.basePrice,
                isEnabled: true
              }
            })
            stats.r710TokenConfigsCreated++
          }
        } catch (error: any) {
          stats.errors.push(`R710 token config ${configData.name}: ${error.message}`)
        }
      }
    }

    // Import payroll accounts - if present in template
    if (template.payrollAccounts && template.payrollAccounts.length > 0) {
      for (const accountData of template.payrollAccounts) {
        try {
          const existing = await prisma.payrollAccounts.findUnique({
            where: { accountNumber: accountData.accountNumber }
          })

          if (!existing) {
            await prisma.payrollAccounts.create({
              data: {
                businessId: options.targetBusinessId,
                accountNumber: accountData.accountNumber,
                balance: accountData.initialBalance || 0,
                isActive: accountData.isActive !== false,
                createdBy: user.id
              }
            })
            stats.payrollAccountsCreated++
          }
        } catch (error: any) {
          stats.errors.push(`Payroll account ${accountData.accountNumber}: ${error.message}`)
        }
      }
    }

    // Optionally save template to database if not from existing template
    let savedTemplateId: string | undefined
    if (options.saveToDatabase !== false) {
      try {
        const saved = await prisma.seedDataTemplates.create({
          data: {
            name: template.metadata.name,
            businessType: template.businessType,
            version: template.version,
            description: template.metadata.description,
            isActive: true,
            isSystemDefault: false,
            productCount: template.products.length,
            categoryCount: template.categories.length,
            templateData: template as any,
            createdBy: user.id,
            exportNotes: `Imported to ${business.name}`
          }
        })
        savedTemplateId = saved.id
      } catch (error: any) {
        stats.errors.push(`Save template: ${error.message}`)
      }
    }

    const result: ImportTemplateResult = {
      success: stats.errors.length === 0 || 
               stats.productsCreated > 0 || 
               stats.categoriesCreated > 0,
      stats,
      savedTemplateId,
      message: `Imported ${stats.productsCreated} products, ${stats.categoriesCreated} categories, ${stats.subcategoriesCreated} subcategories`
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Import template error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to import template',
        stats: {
          categoriesCreated: 0,
          categoriesSkipped: 0,
          subcategoriesCreated: 0,
          subcategoriesSkipped: 0,
          productsCreated: 0,
          productsUpdated: 0,
          productsSkipped: 0,
          errors: [error.message]
        }
      },
      { status: 500 }
    )
  }
}
