/**
 * Historical Reports API
 * GET: Get list of past end-of-day reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get business day boundaries (5AM to 5AM)
function getBusinessDayBoundaries(dateStr: string, timezone: string = 'America/New_York'): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const start = new Date(year, month - 1, day, 5, 0, 0)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const days = parseInt(searchParams.get('days') || '30')
    const timezone = searchParams.get('timezone') || 'America/New_York'

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    // Get business to determine type
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { type: true }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get all receipt sequences for the past N days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    const receiptSequences = await prisma.receiptSequences.findMany({
      where: {
        businessId: businessId,
        date: {
          gte: cutoffDateStr,
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // For each date, get order statistics
    const reports = await Promise.all(
      receiptSequences.map(async (sequence) => {
        const { start, end } = getBusinessDayBoundaries(sequence.date, timezone)

        // Get orders for this business day (support all business types)
        const orders = await prisma.businessOrders.findMany({
          where: {
            businessId: businessId,
            businessType: business.type,
            createdAt: {
              gte: start,
              lt: end,
            },
          },
        })

        const totalSales = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
        const totalOrders = orders.length

        return {
          date: sequence.date,
          totalSales,
          totalOrders,
          receiptsIssued: sequence.lastSequence || 0,
        }
      })
    )

    // Filter out days with no activity
    const activeReports = reports.filter((r) => r.totalOrders > 0 || r.receiptsIssued > 0)

    return NextResponse.json({
      success: true,
      reports: activeReports,
      meta: {
        totalDays: activeReports.length,
        daysRequested: days,
      },
    })
  } catch (error) {
    console.error('Error fetching historical reports:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch historical reports',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
