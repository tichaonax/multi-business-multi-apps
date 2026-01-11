import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Business type specific configuration schemas
const ClothingConfigSchema = z.object({
  sizing: z.object({
    standards: z.array(z.enum(['US', 'EU', 'UK', 'Asia'])).default(['US']),
    customSizes: z.array(z.string()).default([])
  }).optional(),
  colors: z.object({
    standardColors: z.array(z.string()).default(['Black', 'White', 'Blue', 'Red', 'Gray']),
    seasonalColors: z.array(z.string()).default([])
  }).optional(),
  seasons: z.array(z.enum(['Spring', 'Summer', 'Fall', 'Winter'])).default(['Spring', 'Summer', 'Fall', 'Winter']),
  genderCategories: z.array(z.enum(['Men', 'Women', 'Unisex', 'Kids'])).default(['Men', 'Women', 'Unisex']),
  returnsPolicy: z.object({
    returnPeriodDays: z.number().int().min(1).max(365).default(30),
    requireReceipt: z.boolean().default(true),
    exchangeOnly: z.boolean().default(false)
  }).optional()
})

const HardwareConfigSchema = z.object({
  measurements: z.object({
    units: z.enum(['Imperial', 'Metric', 'Both']).default('Imperial'),
    showBothUnits: z.boolean().default(false)
  }).optional(),
  categories: z.object({
    showProfessionalGrade: z.boolean().default(true),
    showConsumerGrade: z.boolean().default(true),
    requireAgeVerification: z.array(z.string()).default(['Electrical', 'Power Tools'])
  }).optional(),
  warranty: z.object({
    defaultWarrantyMonths: z.number().int().min(1).max(120).default(12),
    extendedWarrantyAvailable: z.boolean().default(true)
  }).optional(),
  bulkOrdering: z.object({
    enabled: z.boolean().default(true),
    minimumQuantity: z.number().int().min(1).default(10),
    bulkDiscountPercent: z.number().min(0).max(50).default(10)
  }).optional()
})

const GroceryConfigSchema = z.object({
  freshness: z.object({
    trackExpiryDates: z.boolean().default(true),
    alertDaysBeforeExpiry: z.number().int().min(1).max(30).default(3),
    autoRemoveExpired: z.boolean().default(false)
  }).optional(),
  pricing: z.object({
    allowWeightPricing: z.boolean().default(true),
    weightUnit: z.enum(['lbs', 'kg']).default('lbs'),
    showPricePerUnit: z.boolean().default(true)
  }).optional(),
  dietary: z.object({
    showNutritionalInfo: z.boolean().default(true),
    allergenWarnings: z.boolean().default(true),
    organicLabeling: z.boolean().default(true),
    halalCertification: z.boolean().default(false)
  }).optional(),
  storage: z.object({
    temperatureZones: z.array(z.enum(['Frozen', 'Refrigerated', 'Room Temperature'])).default(['Frozen', 'Refrigerated', 'Room Temperature'])
  }).optional()
})

const RestaurantConfigSchema = z.object({
  service: z.object({
    serviceTypes: z.array(z.enum(['Dine-in', 'Takeout', 'Delivery', 'Catering'])).default(['Dine-in', 'Takeout']),
    tableService: z.boolean().default(true),
    reservationsEnabled: z.boolean().default(true)
  }).optional(),
  menu: z.object({
    showPreparationTime: z.boolean().default(true),
    allowCustomizations: z.boolean().default(true),
    spiceLevels: z.array(z.string()).default(['Mild', 'Medium', 'Spicy', 'Very Spicy']),
    dietaryOptions: z.array(z.string()).default(['Vegetarian', 'Vegan', 'Gluten-Free'])
  }).optional(),
  kitchen: z.object({
    enableKitchenDisplay: z.boolean().default(true),
    orderPriorityLevels: z.array(z.string()).default(['Normal', 'Rush', 'VIP'])
  }).optional(),
  loyalty: z.object({
    pointsPerDollar: z.number().min(0).max(10).default(1),
    rewardThreshold: z.number().int().min(100).default(100)
  }).optional()
})

const ConsultingConfigSchema = z.object({
  services: z.object({
    hourlyRateEnabled: z.boolean().default(true),
    projectRateEnabled: z.boolean().default(true),
    retainerEnabled: z.boolean().default(false),
    defaultHourlyRate: z.number().min(0).default(150)
  }).optional(),
  projects: z.object({
    requireProjectApproval: z.boolean().default(true),
    trackTimeByPhase: z.boolean().default(true),
    clientPortalEnabled: z.boolean().default(false)
  }).optional(),
  billing: z.object({
    invoicingCycle: z.enum(['Weekly', 'Bi-weekly', 'Monthly', 'On-completion']).default('Monthly'),
    paymentTerms: z.enum(['Net-15', 'Net-30', 'Net-60', 'Upon-receipt']).default('Net-30')
  }).optional(),
  expertise: z.object({
    certifications: z.array(z.string()).default([]),
    specializations: z.array(z.string()).default([])
  }).optional()
})

const BusinessConfigSchema = z.object({
  businessId: z.string().min(1),
  businessType: z.string().min(1),
  general: z.object({
    currency: z.string().min(3).max(3).default('USD'),
    timezone: z.string().default('America/New_York'),
    language: z.string().default('en'),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
    numberFormat: z.enum(['US', 'EU']).default('US'),
    taxEnabled: z.boolean().default(true),
    taxRate: z.number().min(0).max(100).default(8.25)
  }).optional(),
  pos: z.object({
    enableBarcodeScan: z.boolean().default(true),
    enableReceiptPrint: z.boolean().default(true),
    enableCashDrawer: z.boolean().default(true),
    requireSignature: z.boolean().default(false),
    enableTips: z.boolean().default(false),
    defaultPaymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY']).default('CASH')
  }).optional(),
  inventory: z.object({
    trackInventory: z.boolean().default(true),
    autoReorderEnabled: z.boolean().default(false),
    lowStockThreshold: z.number().int().min(0).default(10),
    enableStockMovements: z.boolean().default(true)
  }).optional(),
  notifications: z.object({
    lowStockAlerts: z.boolean().default(true),
    orderStatusUpdates: z.boolean().default(true),
    dailySalesReport: z.boolean().default(true),
    emailNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false)
  }).optional(),
  businessSpecific: z.union([
    ClothingConfigSchema,
    HardwareConfigSchema,
    GroceryConfigSchema,
    RestaurantConfigSchema,
    ConsultingConfigSchema,
    z.object({}) // For other business types
  ]).optional()
})

// GET - Fetch business configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        address: true,
        phone: true,
        ecocashEnabled: true,
        receiptReturnPolicy: true,
        taxIncludedInPrice: true,
        taxRate: true,
        taxLabel: true,
        settings: true,
        isActive: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Provide default configuration based on business type
    const getDefaultConfig = (businessType: string) => {
      const baseConfig = {
        general: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'US',
          taxEnabled: true,
          taxRate: 8.25
        },
        pos: {
          enableBarcodeScan: true,
          enableReceiptPrint: true,
          enableCashDrawer: true,
          requireSignature: false,
          enableTips: businessType === 'restaurant',
          defaultPaymentMethod: 'CASH'
        },
        inventory: {
          trackInventory: ['clothing', 'hardware', 'grocery'].includes(businessType),
          autoReorderEnabled: false,
          lowStockThreshold: 10,
          enableStockMovements: true
        },
        notifications: {
          lowStockAlerts: true,
          orderStatusUpdates: true,
          dailySalesReport: true,
          emailNotifications: true,
          smsNotifications: false
        }
      }

      const businessSpecificDefaults = {
        clothing: {
          sizing: {
            standards: ['US'],
            customSizes: []
          },
          colors: {
            standardColors: ['Black', 'White', 'Blue', 'Red', 'Gray'],
            seasonalColors: []
          },
          seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
          genderCategories: ['Men', 'Women', 'Unisex'],
          returnsPolicy: {
            returnPeriodDays: 30,
            requireReceipt: true,
            exchangeOnly: false
          }
        },
        hardware: {
          measurements: {
            units: 'Imperial',
            showBothUnits: false
          },
          categories: {
            showProfessionalGrade: true,
            showConsumerGrade: true,
            requireAgeVerification: ['Electrical', 'Power Tools']
          },
          warranty: {
            defaultWarrantyMonths: 12,
            extendedWarrantyAvailable: true
          },
          bulkOrdering: {
            enabled: true,
            minimumQuantity: 10,
            bulkDiscountPercent: 10
          }
        },
        grocery: {
          freshness: {
            trackExpiryDates: true,
            alertDaysBeforeExpiry: 3,
            autoRemoveExpired: false
          },
          pricing: {
            allowWeightPricing: true,
            weightUnit: 'lbs',
            showPricePerUnit: true
          },
          dietary: {
            showNutritionalInfo: true,
            allergenWarnings: true,
            organicLabeling: true,
            halalCertification: false
          },
          storage: {
            temperatureZones: ['Frozen', 'Refrigerated', 'Room Temperature']
          }
        },
        restaurant: {
          service: {
            serviceTypes: ['Dine-in', 'Takeout'],
            tableService: true,
            reservationsEnabled: true
          },
          menu: {
            showPreparationTime: true,
            allowCustomizations: true,
            spiceLevels: ['Mild', 'Medium', 'Spicy', 'Very Spicy'],
            dietaryOptions: ['Vegetarian', 'Vegan', 'Gluten-Free']
          },
          kitchen: {
            enableKitchenDisplay: true,
            orderPriorityLevels: ['Normal', 'Rush', 'VIP']
          },
          loyalty: {
            pointsPerDollar: 1,
            rewardThreshold: 100
          }
        },
        consulting: {
          services: {
            hourlyRateEnabled: true,
            projectRateEnabled: true,
            retainerEnabled: false,
            defaultHourlyRate: 150
          },
          projects: {
            requireProjectApproval: true,
            trackTimeByPhase: true,
            clientPortalEnabled: false
          },
          billing: {
            invoicingCycle: 'Monthly',
            paymentTerms: 'Net-30'
          },
          expertise: {
            certifications: [],
            specializations: []
          }
        }
      }

      return {
        ...baseConfig,
        businessSpecific: businessSpecificDefaults[businessType as keyof typeof businessSpecificDefaults] || {}
      }
    }

    // Merge stored settings with defaults
    const defaultConfig = getDefaultConfig(business.type)
    const currentSettings = business.settings as any || {}

    const config = {
      businessId: business.id,
      businessName: business.name,
      businessType: business.type,
      businessDescription: business.description,
      isActive: business.isActive,
      address: business.address,
      phone: business.phone,
      ecocashEnabled: business.ecocashEnabled ?? false,
      receiptReturnPolicy: business.receiptReturnPolicy,
      taxIncludedInPrice: business.taxIncludedInPrice ?? true,
      taxRate: business.taxRate ? Number(business.taxRate) : null,
      taxLabel: business.taxLabel,
      ...defaultConfig,
      ...currentSettings
    }

    return NextResponse.json({
      success: true,
      data: config,
      meta: {
        businessType: business.type,
        configSchema: `${business.type}ConfigSchema`,
        lastUpdated: currentSettings.lastUpdated || null
      }
    })

  } catch (error) {
    console.error('Error fetching business configuration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update business configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = BusinessConfigSchema.parse(body)

    const { businessId, businessType, ...configData } = validatedData

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify business type matches
    if (business.type !== businessType) {
      return NextResponse.json(
        { error: `Business type mismatch. Expected: ${business.type}, provided: ${businessType}` },
        { status: 400 }
      )
    }

    // Add metadata to config
    const updatedSettings = {
      ...configData,
      lastUpdated: new Date().toISOString(),
      version: 1
    }

    // Update business settings
    const updatedBusiness = await prisma.businesses.update({
      where: { id: businessId },
      data: {
        settings: updatedSettings
      },
      select: {
        id: true,
        name: true,
        type: true,
        settings: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        businessId: updatedBusiness.id,
        businessName: updatedBusiness.name,
        businessType: updatedBusiness.type,
        ...updatedBusiness.settings
      },
      message: 'Business configuration updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating business configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update business configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}