import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true }
      })
      if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const startParam = searchParams.get('startDate')
    const endParam = searchParams.get('endDate')
    const allTime = searchParams.get('allTime') === 'true'

    let soldAtFilter: { gte?: Date; lte?: Date } | undefined
    if (!allTime) {
      const start = startParam ? new Date(startParam) : new Date()
      if (!startParam) start.setHours(0, 0, 0, 0)
      const end = endParam ? new Date(endParam) : new Date()
      if (!endParam) end.setHours(23, 59, 59, 999)
      else end.setHours(23, 59, 59, 999)
      soldAtFilter = { gte: start, lte: end }
    }

    const sales = await prisma.r710TokenSales.findMany({
      where: {
        businessId,
        saleChannel: 'DIRECT',
        ...(soldAtFilter ? { soldAt: soldAtFilter } : {})
      },
      include: {
        r710_tokens: {
          include: {
            r710_token_configs: {
              select: { name: true, durationValue: true, durationUnit: true, deviceLimit: true }
            },
            r710_wlans: {
              select: { ssid: true }
            }
          }
        },
        users: { select: { name: true } }
      },
      orderBy: { soldAt: 'desc' }
    })

    return NextResponse.json({
      sales: sales.map(s => ({
        saleId: s.id,
        tokenId: s.tokenId,
        username: s.r710_tokens.username,
        password: s.r710_tokens.password,
        packageName: s.r710_tokens.r710_token_configs.name,
        durationValue: s.r710_tokens.r710_token_configs.durationValue,
        durationUnit: s.r710_tokens.r710_token_configs.durationUnit,
        deviceLimit: s.r710_tokens.r710_token_configs.deviceLimit,
        ssid: s.r710_tokens.r710_wlans?.ssid ?? null,
        saleAmount: Number(s.saleAmount),
        paymentMethod: s.paymentMethod,
        ecocashFeeAmount: s.ecocashFeeAmount != null ? Number(s.ecocashFeeAmount) : null,
        ecocashTransactionCode: s.ecocashTransactionCode ?? null,
        soldAt: s.soldAt.toISOString(),
        soldByName: s.users.name,
        receiptPrinted: s.receiptPrinted,
      }))
    })
  } catch (error) {
    console.error('[R710 Direct Sale History] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch sale history' }, { status: 500 })
  }
}
