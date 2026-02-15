import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/reports/inventory-transfers?businessId=xxx&startDate=xxx&endDate=xxx
 * Inventory transfer report: items transferred, source/target prices, date, employee
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    const transfers = await prisma.inventoryTransfers.findMany({
      where: {
        OR: [
          { sourceBusinessId: businessId },
          { targetBusinessId: businessId }
        ],
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 ? { transferDate: dateFilter } : {})
      },
      include: {
        items: {
          include: {
            bale: {
              select: { batchNumber: true, category: { select: { name: true } } }
            }
          }
        },
        sourceBusiness: { select: { businessName: true } },
        targetBusiness: { select: { businessName: true } },
        employees: { select: { name: true } }
      },
      orderBy: { transferDate: 'desc' }
    })

    let totalItemsTransferred = 0
    let totalSourceValue = 0
    let totalTargetValue = 0

    const transferSummaries = transfers.map((t: any) => {
      const itemCount = t.items.reduce((sum: number, i: any) => sum + i.quantity, 0)
      const sourceValue = t.items.reduce((sum: number, i: any) => sum + Number(i.sourcePrice) * i.quantity, 0)
      const targetValue = t.items.reduce((sum: number, i: any) => sum + Number(i.targetPrice) * i.quantity, 0)

      totalItemsTransferred += itemCount
      totalSourceValue += sourceValue
      totalTargetValue += targetValue

      return {
        id: t.id,
        date: t.transferDate,
        from: t.sourceBusiness.businessName,
        to: t.targetBusiness.businessName,
        employee: t.employees?.name || 'Unknown',
        notes: t.notes,
        itemCount,
        sourceValue: Math.round(sourceValue * 100) / 100,
        targetValue: Math.round(targetValue * 100) / 100,
        items: t.items.map((i: any) => ({
          productName: i.productName,
          barcode: i.barcode,
          quantity: i.quantity,
          sourcePrice: Number(i.sourcePrice),
          targetPrice: Number(i.targetPrice),
          baleId: i.baleId || null,
          baleBatchNumber: i.bale?.batchNumber || null,
          baleCategory: i.bale?.category?.name || null
        }))
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTransfers: transfers.length,
          totalItemsTransferred,
          totalSourceValue: Math.round(totalSourceValue * 100) / 100,
          totalTargetValue: Math.round(totalTargetValue * 100) / 100,
          priceDifference: Math.round((totalTargetValue - totalSourceValue) * 100) / 100
        },
        transfers: transferSummaries
      }
    })
  } catch (error) {
    console.error('Transfer report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
