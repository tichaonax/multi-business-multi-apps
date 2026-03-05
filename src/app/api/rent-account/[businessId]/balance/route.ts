import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Params = { params: Promise<{ businessId: string }> }

/**
 * GET /api/rent-account/[businessId]/balance
 * Lightweight endpoint — returns only what the header indicator needs.
 * No heavy joins; designed for frequent polling.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const config = await prisma.businessRentConfig.findUnique({
      where: { businessId },
      select: {
        isActive: true,
        monthlyRentAmount: true,
        rentDueDay: true,
        dailyTransferAmount: true,
        expenseAccount: {
          select: { balance: true },
        },
      },
    })

    if (!config || !config.isActive) {
      return NextResponse.json({ hasRentAccount: false })
    }

    const balance = Number(config.expenseAccount.balance)
    const monthlyRent = Number(config.monthlyRentAmount)
    const fundingPercent = monthlyRent > 0 ? Math.round((balance / monthlyRent) * 1000) / 10 : 0

    let indicator: 'red' | 'orange' | 'green' = 'red'
    if (fundingPercent >= 100) indicator = 'green'
    else if (fundingPercent >= 75) indicator = 'orange'

    return NextResponse.json({
      hasRentAccount: true,
      balance,
      monthlyRentAmount: monthlyRent,
      dailyTransferAmount: Number(config.dailyTransferAmount),
      rentDueDay: config.rentDueDay,
      fundingPercent,
      indicator,
    })
  } catch (err) {
    console.error('[GET /api/rent-account/balance]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
