/**
 * R710 Business Token Menu Item API
 *
 * Update and delete individual R710 token menu items
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * PATCH /api/business/[businessId]/r710-tokens/[id]
 *
 * Update R710 token menu item (price, active status, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    // Check permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSellWifiTokens', businessId)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get menu item
    const menuItem = await prisma.r710BusinessTokenMenuItems.findUnique({
      where: { id }
    })

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    if (menuItem.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Menu item does not belong to this business' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { businessPrice, isActive, displayOrder } = body

    // Update menu item
    const updated = await prisma.r710BusinessTokenMenuItems.update({
      where: { id },
      data: {
        ...(businessPrice !== undefined && { businessPrice }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder })
      }
    })

    return NextResponse.json({
      menuItem: updated
    })

  } catch (error) {
    console.error('[R710 Menu Item] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/business/[businessId]/r710-tokens/[id]
 *
 * Remove R710 token configuration from business menu
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    // Check permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSellWifiTokens', businessId)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get menu item
    const menuItem = await prisma.r710BusinessTokenMenuItems.findUnique({
      where: { id }
    })

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      )
    }

    if (menuItem.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Menu item does not belong to this business' },
        { status: 403 }
      )
    }

    // Delete menu item
    await prisma.r710BusinessTokenMenuItems.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Menu item removed successfully'
    })

  } catch (error) {
    console.error('[R710 Menu Item] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}
