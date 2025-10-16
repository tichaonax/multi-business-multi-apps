import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = params

    // Get the period to check status
    const period = await prisma.payroll_periods.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }

    // Only allow clearing if period is not exported or closed
    if (period.status === 'exported' || period.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot clear entries from exported or closed payroll periods' },
        { status: 400 }
      )
    }

    // Delete all entries for this period
    await prisma.payroll_entries.deleteMany({
      where: { payrollPeriodId: periodId }
    })

    // Reset period totals and status to draft
    await prisma.payroll_periods.update({
      where: { id: periodId },
      data: {
        status: 'draft',
        totalEmployees: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'All payroll entries cleared successfully'
    })
  } catch (error) {
    console.error('Clear payroll entries error:', error)
    return NextResponse.json(
      { error: 'Failed to clear payroll entries' },
      { status: 500 }
    )
  }
}
