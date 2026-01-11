import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

interface Context {
  params: Promise<{
    businessId: string
  }>
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const user = session.user as SessionUser

    // System admins can view any business
    if (isSystemAdmin(user)) {
      const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true, name: true, isActive: true, type: true, settings: true, description: true, address: true, phone: true, ecocashEnabled: true, receiptReturnPolicy: true, taxIncludedInPrice: true, taxRate: true, taxLabel: true } })
      if (!business || !business.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: business })
    }

    // Non-admins must be a member of the business
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: session.user.id, businessId, isActive: true }, include: { businesses: { select: { id: true, name: true, isActive: true, type: true, settings: true, description: true, address: true, phone: true, ecocashEnabled: true, receiptReturnPolicy: true, taxIncludedInPrice: true, taxRate: true, taxLabel: true } } } })
    if (!membership || !membership.businesses || !membership.businesses.isActive) return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 })

    return NextResponse.json({ success: true, data: membership.businesses })
  } catch (error) {
    console.error('Error fetching business by id:', error)
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 })
  }
}
