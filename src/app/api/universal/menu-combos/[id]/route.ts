import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const comboId = id
    const data = await request.json()

    const {
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

    // Update combo with items in a transaction
    const updatedCombo = await prisma.$transaction(async (tx) => {
      // Update the combo
      const combo = await tx.menuCombo.update({
        where: { id: comboId },
        data: {
          name,
          description,
          totalPrice,
          originalTotalPrice,
          preparationTime: preparationTime || 0,
          discountPercent,
          isActive: isActive ?? true,
          isAvailable: isAvailable ?? true,
          updatedAt: new Date()
        }
      })

      // If comboItems are provided, update them
      if (comboItems) {
        // Delete existing combo items
        await tx.menuComboItem.deleteMany({
          where: { comboId }
        })

        // Create new combo items
        if (comboItems.length > 0) {
          const comboItemsData = comboItems.map((item: any, index: number) => ({
            comboId,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity || 1,
            isRequired: item.isRequired ?? true,
            sortOrder: item.sortOrder ?? index
          }))

          await tx.menuComboItem.createMany({
            data: comboItemsData
          })
        }
      }

      // Return updated combo with items
      return await tx.menuCombo.findUnique({
        where: { id: comboId },
        include: {
          menuComboItems: {
            include: {
              product: {
                include: {
                  business_categories: true,
                  images: true,
                  variants: true
                }
              },
              variant: true
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      data: updatedCombo
    })

  } catch (error) {
    console.error('Menu combo update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update menu combo'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const comboId = id

    // Delete combo and its items (cascade should handle items automatically)
    await prisma.menuCombos.delete({
      where: { id: comboId }
    })

    return NextResponse.json({
      success: true,
      message: 'Menu combo deleted successfully'
    })

  } catch (error) {
    console.error('Menu combo deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete menu combo'
    }, { status: 500 })
  }
}