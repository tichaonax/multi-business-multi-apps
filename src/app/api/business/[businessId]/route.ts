import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const user = session.user as SessionUser

    // System admins can access any business, others need membership
    if (!isSystemAdmin(user)) {
      // Check if user has access to this business
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: session.user.id,
          isActive: true
        }
      })

      if (!membership) {
        return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 })
      }
    }

    // Fetch business details
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
        isActive: true,
        isDemo: true,
        umbrellaBusinessId: true,
        umbrellaBusinessName: true,
        umbrellaBusinessAddress: true,
        umbrellaBusinessPhone: true,
        umbrellaBusinessEmail: true,
        settings: true
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Use business address/phone if available, otherwise use umbrella business fallback
    const businessInfo = {
      id: business.id,
      name: business.name,
      type: business.type,
      description: business.description,
      address: business.address || business.umbrellaBusinessAddress || '',
      phone: business.phone || business.umbrellaBusinessPhone || '',
      ecocashEnabled: business.ecocashEnabled,
      receiptReturnPolicy: business.receiptReturnPolicy || 'All sales are final',
      isActive: business.isActive,
      isDemo: business.isDemo,
      settings: business.settings
    }

    return NextResponse.json({ business: businessInfo })
  } catch (error) {
    console.error('Error fetching business details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const user = session.user as SessionUser

    // System admins can update any business
    if (!isSystemAdmin(user)) {
      // Check if user has ownership of this business
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: session.user.id,
          isActive: true
        }
      })

      const isOwner = membership?.role === 'owner'

      if (!isOwner) {
        return NextResponse.json({ error: 'Access denied. Only business owners or admins can update business details.' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { address, phone, ecocashEnabled } = body

    // Update business details
    const updatedBusiness = await prisma.businesses.update({
      where: { id: businessId },
      data: {
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(ecocashEnabled !== undefined && { ecocashEnabled })
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        address: true,
        phone: true,
        ecocashEnabled: true,
        receiptReturnPolicy: true,
        isActive: true,
        isDemo: true,
        umbrellaBusinessId: true,
        umbrellaBusinessName: true,
        umbrellaBusinessAddress: true,
        umbrellaBusinessPhone: true,
        umbrellaBusinessEmail: true,
        settings: true
      }
    })

    // Use business address/phone if available, otherwise use umbrella business fallback
    const businessInfo = {
      id: updatedBusiness.id,
      name: updatedBusiness.name,
      type: updatedBusiness.type,
      description: updatedBusiness.description,
      address: updatedBusiness.address || updatedBusiness.umbrellaBusinessAddress || '',
      phone: updatedBusiness.phone || updatedBusiness.umbrellaBusinessPhone || '',
      ecocashEnabled: updatedBusiness.ecocashEnabled,
      receiptReturnPolicy: updatedBusiness.receiptReturnPolicy || 'All sales are final',
      isActive: updatedBusiness.isActive,
      isDemo: updatedBusiness.isDemo,
      settings: updatedBusiness.settings
    }

    return NextResponse.json({ business: businessInfo })

  } catch (error) {
    console.error('Error updating business details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}