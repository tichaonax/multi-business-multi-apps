import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    // System admins can access any business, others need membership
    if (!isSystemAdmin(user)) {
      // Check if user has access to this business
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: user.id,
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
        ecocashFeeType: true,
        ecocashFeeValue: true,
        ecocashMinimumFee: true,
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
      ecocashFeeType: (business as any).ecocashFeeType ?? 'FIXED',
      ecocashFeeValue: (business as any).ecocashFeeValue != null ? Number((business as any).ecocashFeeValue) : 0,
      ecocashMinimumFee: (business as any).ecocashMinimumFee != null ? Number((business as any).ecocashMinimumFee) : 0,
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    // System admins can update any business
    if (!isSystemAdmin(user)) {
      // Check if user has ownership of this business
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: user.id,
          isActive: true
        }
      })

      const isOwner = membership?.role === 'owner'

      if (!isOwner) {
        return NextResponse.json({ error: 'Access denied. Only business owners or admins can update business details.' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { address, phone, ecocashEnabled, ecocashFeeType, ecocashFeeValue, ecocashMinimumFee } = body

    // Update business details
    const updatedBusiness = await prisma.businesses.update({
      where: { id: businessId },
      data: {
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(ecocashEnabled !== undefined && { ecocashEnabled }),
        ...(ecocashFeeType !== undefined && { ecocashFeeType: ecocashFeeType || 'FIXED' }),
        ...(ecocashFeeValue !== undefined && { ecocashFeeValue: ecocashFeeValue !== '' && ecocashFeeValue !== null ? parseFloat(ecocashFeeValue) : null }),
        ...(ecocashMinimumFee !== undefined && { ecocashMinimumFee: ecocashMinimumFee !== '' && ecocashMinimumFee !== null ? parseFloat(ecocashMinimumFee) : 0 }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        address: true,
        phone: true,
        ecocashEnabled: true,
        ecocashFeeType: true,
        ecocashFeeValue: true,
        ecocashMinimumFee: true,
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
      ecocashFeeType: (updatedBusiness as any).ecocashFeeType ?? 'FIXED',
      ecocashFeeValue: (updatedBusiness as any).ecocashFeeValue != null ? Number((updatedBusiness as any).ecocashFeeValue) : 0,
      ecocashMinimumFee: (updatedBusiness as any).ecocashMinimumFee != null ? Number((updatedBusiness as any).ecocashMinimumFee) : 0,
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