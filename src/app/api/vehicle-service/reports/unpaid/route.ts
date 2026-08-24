/**
 * Vehicle Service — Billed but Unpaid Jobs report.
 *
 * Jobs that have been billed (invoiced — see /api/vehicle-service/jobs/[jobId]/bill,
 * which creates a BusinessOrders row with paymentStatus PENDING) but not yet
 * paid (payment is collected separately, later, via .../collect-payment).
 * This is the reconciliation counterpart to the EOD report's cash-basis fix
 * in /api/universal/daily-sales — that endpoint now excludes these from
 * "sales" until paid; this report is where they're actually visible instead
 * of just silently absent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')?.trim()

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    if (!isSystemAdmin(user) && !hasPermission(user, 'canAccessFinancialData', businessId)) {
      return NextResponse.json({ error: 'Insufficient permissions to access financial data' }, { status: 403 })
    }

    const orderDateFilter: Record<string, unknown> = {}
    if (startDate) orderDateFilter.gte = new Date(`${startDate}T00:00:00`)
    if (endDate) orderDateFilter.lt = new Date(new Date(`${endDate}T00:00:00`).getTime() + 24 * 60 * 60 * 1000)

    const jobs = await prisma.vehicleServiceJobs.findMany({
      where: {
        businessId,
        orderId: { not: null },
        business_orders: {
          status: { not: 'CANCELLED' },
          paymentStatus: { not: 'PAID' },
          ...(Object.keys(orderDateFilter).length > 0 ? { createdAt: orderDateFilter } : {}),
        },
        ...(search
          ? {
              OR: [
                { vehicleMake: { contains: search, mode: 'insensitive' } },
                { vehicleModel: { contains: search, mode: 'insensitive' } },
                { vehiclePlate: { contains: search, mode: 'insensitive' } },
                { business_customers: { name: { contains: search, mode: 'insensitive' } } },
                { business_orders: { orderNumber: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        business_orders: {
          select: { id: true, orderNumber: true, totalAmount: true, paymentStatus: true, createdAt: true },
        },
        business_customers: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { business_orders: { createdAt: 'asc' } },
    })

    const now = Date.now()
    const data = jobs
      .filter(j => j.business_orders) // orderId is set but row could theoretically be missing
      .map(j => {
        const order = j.business_orders!
        const daysOutstanding = Math.floor((now - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        return {
          jobId: j.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          billedAt: order.createdAt,
          totalAmount: Number(order.totalAmount),
          paymentStatus: order.paymentStatus,
          daysOutstanding,
          customerName: j.business_customers?.name || null,
          customerPhone: j.business_customers?.phone || null,
          vehicle: [j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ') || null,
          vehiclePlate: j.vehiclePlate || null,
        }
      })

    const totalOutstanding = data.reduce((sum, d) => sum + d.totalAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        jobs: data,
        summary: { count: data.length, totalOutstanding },
      },
    })
  } catch (error) {
    console.error('Error fetching unpaid vehicle service jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unpaid jobs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
