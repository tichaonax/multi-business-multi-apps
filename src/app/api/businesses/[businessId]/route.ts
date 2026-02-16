import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

interface Context {
  params: Promise<{
    businessId: string
  }>
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    // System admins can view any business
    if (isSystemAdmin(user)) {
      const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true, name: true, isActive: true, type: true, settings: true, description: true, address: true, phone: true, ecocashEnabled: true, receiptReturnPolicy: true, taxIncludedInPrice: true, taxRate: true, taxLabel: true, defaultPage: true, slogan: true, showSlogan: true } })
      if (!business || !business.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: business })
    }

    // Non-admins must be a member of the business
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true }, include: { businesses: { select: { id: true, name: true, isActive: true, type: true, settings: true, description: true, address: true, phone: true, ecocashEnabled: true, receiptReturnPolicy: true, taxIncludedInPrice: true, taxRate: true, taxLabel: true, defaultPage: true, slogan: true, showSlogan: true } } } })
    if (!membership || !membership.businesses || !membership.businesses.isActive) return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 })

    return NextResponse.json({ success: true, data: membership.businesses })
  } catch (error) {
    console.error('Error fetching business by id:', error)
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 })
  }
}
