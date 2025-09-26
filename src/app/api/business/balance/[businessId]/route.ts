import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBusinessBalance } from '@/lib/business-balance-utils'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ businessId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params

    // Verify user has access to this business
    const userBusinesses = await prisma.businessMembership.findMany({
      where: {
        userId: session.user.id,
        businessId: businessId,
        isActive: true
      }
    })

    if (userBusinesses.length === 0) {
      return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    // Get business balance information
    const balanceInfo = await getBusinessBalance(businessId)

    return NextResponse.json(balanceInfo)
  } catch (error) {
    console.error('Business balance fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business balance' },
      { status: 500 }
    )
  }
}