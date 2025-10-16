import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

import { randomBytes } from 'crypto';
const prisma = new PrismaClient()

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
        menuComboItems: {
          include: {
            businessProducts: {
              include: {
                business_categories: true,
                product_images: true,
                product_variants: true
              }
            },
            productVariants: true
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
      comboItems: (combo.menuComboItems ?? []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        product: item.businessProducts ? {
          ...item.businessProducts,
          images: item.businessProducts.product_images ?? [],
          variants: item.businessProducts.product_variants ?? []
        } : null,
        variant: item.product_variants ?? null
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

    // Validate that all products exist
    const productIds = comboItems.map((item: any) => item.productId)
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

    // Create the combo with items in a transaction
    const combo = await prisma.$transaction(async (tx) => {
      const newCombo = await tx.menuCombo.create({
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

      // Create combo items
      const comboItemsData = comboItems.map((item: any, index: number) => ({
        comboId: newCombo.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity || 1,
        isRequired: item.isRequired ?? true,
        sortOrder: item.sortOrder ?? index
      }))

      await tx.menuComboItem.createMany({
        data: comboItemsData
      })

      // Return combo with items
      return await tx.menuCombo.findUnique({
        where: { id: newCombo.id },
        include: {
          menuComboItems: {
            include: {
              businessProducts: {
                include: {
                  business_categories: true,
                  product_images: true,
                  product_variants: true
                }
              },
              productVariants: true
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
      menuComboItems: (combo.menuComboItems ?? []).map((item: any) => ({
        ...item,
        product: item.businessProducts ? {
          ...item.businessProducts,
          images: item.businessProducts.product_images ?? [],
          variants: item.businessProducts.product_variants ?? []
        } : null,
        variant: item.product_variants ?? null
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