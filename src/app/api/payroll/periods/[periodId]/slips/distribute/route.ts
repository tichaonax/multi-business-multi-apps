import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * POST /api/payroll/periods/[periodId]/slips/distribute
 * Marks selected slips as DISTRIBUTED (physical payslip handed to employee).
 * Body: { slipIds: string[] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slipIds } = await request.json()
    if (!Array.isArray(slipIds) || slipIds.length === 0) {
      return NextResponse.json({ error: 'slipIds array required' }, { status: 400 })
    }

    const now = new Date()

    const result = await prisma.payrollSlips.updateMany({
      where: {
        id: { in: slipIds },
        status: { in: ['CAPTURED', 'PENDING'] },
      },
      data: {
        status: 'DISTRIBUTED',
        distributedAt: now,
        distributedBy: user.id,
        updatedAt: now,
      },
    })

    return NextResponse.json({ success: true, distributed: result.count })
  } catch (error) {
    console.error('Error marking slips as distributed:', error)
    return NextResponse.json({ error: 'Failed to distribute payroll slips' }, { status: 500 })
  }
}
