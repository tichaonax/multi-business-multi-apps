import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    const combos = await prisma.menuCombos.findMany({
      where: {
        businessId
      },
      include: {
        menu_combo_items: {
          include: {
            business_products: {
              include: {
                business_categories: true,
                product_images: true,
                product_variants: true
              }
            },
            product_variants: true,
            r710_token_configs: true
          },
          orderBy: {
            sortOrder: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match our interface
    const transformedCombos = (combos as any[]).map(combo => ({
      id: combo.id,
      name: combo.name,
      description: combo.description,
      totalPrice: combo.totalPrice,
      originalTotalPrice: combo.originalTotalPrice,
      isActive: combo.isActive,
      isAvailable: combo.isAvailable,
      imageUrl: combo.imageUrl,
      preparationTime: combo.preparationTime,
      discountPercent: combo.discountPercent,
      promotionStartDate: combo.promotionStartDate?.toISOString(),
      promotionEndDate: combo.promotionEndDate?.toISOString(),
      comboItems: (combo.menu_combo_items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        tokenConfigId: item.tokenConfigId,
        quantity: item.quantity,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        product: item.business_products ? {
          ...item.business_products,
          images: item.business_products.product_images ?? [],
          variants: item.business_products.product_variants ?? []
        } : null,
        variant: item.product_variants ?? null,
        wifiToken: item.r710_token_configs ? {
          id: item.r710_token_configs.id,
          name: item.r710_token_configs.name,
          description: item.r710_token_configs.description,
          durationValue: item.r710_token_configs.durationValue,
          durationUnit: item.r710_token_configs.durationUnit,
          deviceLimit: item.r710_token_configs.deviceLimit,
          basePrice: item.r710_token_configs.basePrice
        } : null
      }))
    }))

    return NextResponse.json({
      success: true,
      data: transformedCombos
    })

  } catch (error) {
    console.error('Menu combos fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch menu combos'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const {
      businessId,
      name,
      description,
      totalPrice,
      originalTotalPrice,
      preparationTime,
      discountPercent,
      isActive,
      isAvailable,
      comboItems
    } = data

    // Validation
    if (!businessId || !name || !totalPrice || !comboItems || comboItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    if (totalPrice <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Total price must be greater than 0'
      }, { status: 400 })
    }

    // Separate product items from WiFi token items
    const productItems = comboItems.filter((item: any) => item.productId)
    const tokenItems = comboItems.filter((item: any) => item.tokenConfigId)

    // Validate each item has either productId or tokenConfigId
    const invalidItems = comboItems.filter((item: any) => !item.productId && !item.tokenConfigId)
    if (invalidItems.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Each combo item must have either a productId or tokenConfigId'
      }, { status: 400 })
    }

    // Validate that all products exist
    if (productItems.length > 0) {
      const productIds = productItems.map((item: any) => item.productId)
      const existingProducts = await prisma.businessProducts.findMany({
        where: {
          id: { in: productIds },
          businessId
        }
      })

      if (existingProducts.length !== productIds.length) {
        return NextResponse.json({
          success: false,
          error: 'Some products in the combo do not exist'
        }, { status: 400 })
      }
    }

    // Validate that all WiFi token configs exist
    if (tokenItems.length > 0) {
      const tokenConfigIds = tokenItems.map((item: any) => item.tokenConfigId)
      const existingTokenConfigs = await prisma.r710TokenConfigs.findMany({
        where: {
          id: { in: tokenConfigIds },
          businessId,
          isActive: true
        }
      })

      if (existingTokenConfigs.length !== tokenConfigIds.length) {
        return NextResponse.json({
          success: false,
          error: 'Some WiFi token configs in the combo do not exist or are not active'
        }, { status: 400 })
      }
    }

    // Create the combo with items in a transaction
    const combo = await prisma.$transaction(async (tx) => {
      const newCombo = await tx.menuCombos.create({
        data: {
          businessId,
          name,
          description,
          totalPrice,
          originalTotalPrice,
          preparationTime: preparationTime || 0,
          discountPercent,
          isActive: isActive ?? true,
          isAvailable: isAvailable ?? true
        }
      })

      // Create combo items (supports both products and WiFi tokens)
      const comboItemsData = comboItems.map((item: any, index: number) => ({
        comboId: newCombo.id,
        productId: item.productId || null,
        variantId: item.variantId || null,
        tokenConfigId: item.tokenConfigId || null,
        quantity: item.quantity || 1,
        isRequired: item.isRequired ?? true,
        sortOrder: item.sortOrder ?? index
      }))

      await tx.menuComboItems.createMany({
        data: comboItemsData
      })

      // Return combo with items
      return await tx.menuCombos.findUnique({
        where: { id: newCombo.id },
        include: {
          menu_combo_items: {
            include: {
              business_products: {
                include: {
                  business_categories: true,
                  product_images: true,
                  product_variants: true
                }
              },
              product_variants: true,
              r710_token_configs: true
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        }
      }) as any
    })

    // Map the created combo to the same transformed shape as GET
    const resp = combo ? {
      ...combo,
      comboItems: (combo.menu_combo_items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        tokenConfigId: item.tokenConfigId,
        quantity: item.quantity,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        product: item.business_products ? {
          ...item.business_products,
          images: item.business_products.product_images ?? [],
          variants: item.business_products.product_variants ?? []
        } : null,
        variant: item.product_variants ?? null,
        wifiToken: item.r710_token_configs ? {
          id: item.r710_token_configs.id,
          name: item.r710_token_configs.name,
          description: item.r710_token_configs.description,
          durationValue: item.r710_token_configs.durationValue,
          durationUnit: item.r710_token_configs.durationUnit,
          deviceLimit: item.r710_token_configs.deviceLimit,
          basePrice: item.r710_token_configs.basePrice
        } : null
      }))
    } : null

    return NextResponse.json({
      success: true,
      data: resp
    })

  } catch (error) {
    console.error('Menu combo creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create menu combo'
    }, { status: 500 })
  }
}