import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    const body = await request.json()
    const user = session.user as SessionUser

    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Update category
    const category = await prisma.businessCategories.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.emoji !== undefined && { emoji: body.emoji }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(category)

  } catch (error: any) {
    console.error('Error updating category:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    const user = session.user as SessionUser

    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Check if category has products
    const productsCount = await prisma.businessProducts.count({
      where: { categoryId: id }
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${productsCount} products` },
        { status: 400 }
      )
    }

    // Delete category
    await prisma.businessCategories.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })

  } catch (error: any) {
    console.error('Error deleting category:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
