import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

// GET - Paginated audit trail of POS/menu/inventory price changes for a business.
// Reads from the shared AuditLogs table (action: PRODUCT_PRICE_UPDATED), which is
// written server-side by the product/inventory PUT endpoints whenever basePrice or
// sellingPrice actually changes — see src/app/api/universal/products/[id]/route.ts
// and src/app/api/inventory/[businessId]/items/[itemId]/route.ts.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const canView = isSystemAdmin(user) ||
      hasPermission(user, 'canManageMenu', businessId) ||
      hasPermission(user, 'canManageInventory', businessId) ||
      hasPermission(user, 'canAccessFinancialData', businessId)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)
    const search = searchParams.get('search')?.trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      action: 'PRODUCT_PRICE_UPDATED',
      entityType: 'Product',
      metadata: { path: ['businessId'], equals: businessId },
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.timestamp.lte = end
      }
    }

    if (search) {
      where.OR = [
        { metadata: { path: ['productName'], string_contains: search } },
        { users: { name: { contains: search, mode: 'insensitive' } } },
        { users: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLogs.findMany({
        where,
        include: {
          users: { select: { id: true, name: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLogs.count({ where }),
    ])

    const reports = logs.map(log => {
      const oldValues = log.oldValues as any
      const newValues = log.newValues as any
      const metadata = log.metadata as any
      return {
        id: log.id,
        date: log.timestamp,
        productName: metadata?.productName ?? null,
        oldPrice: oldValues?.price ?? null,
        newPrice: newValues?.price ?? null,
        changedByName: log.users?.name ?? null,
        changedByEmail: log.users?.email ?? null,
        sourceTable: metadata?.sourceTable ?? null,
        viaPOSQuickEdit: metadata?.viaPOSQuickEdit === true,
      }
    })

    return NextResponse.json({
      reports,
      pagination: {
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    })
  } catch (error) {
    console.error('Error fetching price change report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price change report' },
      { status: 500 }
    )
  }
}
