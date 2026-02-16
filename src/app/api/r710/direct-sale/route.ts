/**
 * R710 Direct Token Sale API
 *
 * Generate and sell an R710 token on-the-fly (not from pool)
 * Creates token directly on R710 device and saves to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { generateAndSellR710Token } from '@/lib/r710/generate-and-sell-token'
import { getServerUser } from '@/lib/get-server-user'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, tokenConfigId, saleAmount, paymentMethod } = body

    if (!businessId || !tokenConfigId) {
      return NextResponse.json(
        { error: 'businessId and tokenConfigId are required' },
        { status: 400 }
      )
    }
    // Check if user has access to this business (admins have access to all businesses)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId,
          userId: user.id,
          isActive: true
        }
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
      }
    }

    // Use shared utility to generate and sell token
    const result = await generateAndSellR710Token({
      businessId,
      tokenConfigId,
      saleAmount: saleAmount || 0,
      paymentMethod: paymentMethod || 'CASH',
      soldBy: user.id,
      saleChannel: 'DIRECT'
    })

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('[R710 Direct Sale] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to complete sale', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
