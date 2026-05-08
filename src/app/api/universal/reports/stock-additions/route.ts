import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const categoryId = searchParams.get('categoryId') || undefined
    const supplierId = searchParams.get('supplierId') || undefined
    const employeeId = searchParams.get('employeeId') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    // Verify user has access to this business
    const userBusinessIds = user.businessMemberships?.map((m: any) => m.businessId) || []
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
    if (!isAdmin && !userBusinessIds.includes(businessId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    // Resolve date range
    const now = new Date()
    const start = startDate
      ? new Date(startDate + 'T00:00:00')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    const end = endDate
      ? new Date(endDate + 'T23:59:59')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const dayRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

    // Build where clause
    const where: any = {
      businessId,
      movementType: 'PURCHASE_RECEIVED',
      createdAt: { gte: start, lte: end },
      barcodeInventoryItemId: { not: null },
    }
    if (categoryId) {
      where.barcode_inventory_items = {
        ...(where.barcode_inventory_items || {}),
        categoryId,
      }
    }
    if (supplierId) {
      where.barcode_inventory_items = {
        ...(where.barcode_inventory_items || {}),
        supplierId,
      }
    }
    if (employeeId) {
      where.employeeId = employeeId
    }

    const [total, movements] = await Promise.all([
      prisma.businessStockMovements.count({ where }),
      prisma.businessStockMovements.findMany({
        where,
        include: {
          barcode_inventory_items: {
            select: {
              id: true,
              name: true,
              sku: true,
              costPrice: true,
              sellingPrice: true,
              business_category: { select: { name: true } },
              business_supplier: { select: { name: true } },
            },
          },
          employees: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Build response rows
    const data = movements.map((m) => {
      const item = m.barcode_inventory_items
      const qtyAdded = m.quantity
      const unitCost = m.unitCost ? parseFloat(m.unitCost.toString()) : null
      const costPerUnit = unitCost ?? (item?.costPrice ? parseFloat(item.costPrice.toString()) : null)
      const sellingPrice = item?.sellingPrice ? parseFloat(item.sellingPrice.toString()) : null
      // Use cost if available, otherwise fall back to selling price for total calculation
      const priceForTotal = costPerUnit ?? sellingPrice
      const totalCost = priceForTotal !== null ? Math.round(priceForTotal * qtyAdded * 100) / 100 : null

      return {
        movementId: m.id,
        itemId: item?.id ?? null,
        itemName: item?.name ?? 'Unknown Item',
        sku: item?.sku ?? '',
        category: item?.business_category?.name ?? 'Uncategorised',
        supplier: item?.business_supplier?.name ?? '—',
        qtyAdded,
        unitCost: costPerUnit,
        sellingPrice,
        totalCost,
        costSource: costPerUnit !== null ? 'cost' : (sellingPrice !== null ? 'selling' : null),
        addedBy: m.employees?.fullName ?? '—',
        addedAt: m.createdAt,
        reference: m.reference ?? null,
      }
    })

    // Summary aggregates over the FULL (unpaginated) result set
    const allMovements = await prisma.businessStockMovements.findMany({
      where,
      select: {
        quantity: true,
        unitCost: true,
        barcodeInventoryItemId: true,
        barcode_inventory_items: { select: { costPrice: true, sellingPrice: true, supplierId: true } },
      },
    })

    const totalUnitsAdded = allMovements.reduce((s, m) => s + m.quantity, 0)
    const totalCostValue = allMovements.reduce((s, m) => {
      const u = m.unitCost
        ? parseFloat(m.unitCost.toString())
        : m.barcode_inventory_items?.costPrice
          ? parseFloat(m.barcode_inventory_items.costPrice.toString())
          : m.barcode_inventory_items?.sellingPrice
            ? parseFloat(m.barcode_inventory_items.sellingPrice.toString())
            : 0
      return s + u * m.quantity
    }, 0)
    const uniqueItemIds = new Set(allMovements.map((m) => m.barcodeInventoryItemId).filter(Boolean))
    const uniqueSupplierIds = new Set(
      allMovements.map((m) => m.barcode_inventory_items?.supplierId).filter(Boolean)
    )

    return NextResponse.json({
      success: true,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        days: dayRange,
      },
      summary: {
        totalMovements: total,
        totalItemsAffected: uniqueItemIds.size,
        totalUnitsAdded,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        uniqueSuppliers: uniqueSupplierIds.size,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data,
    })
  } catch (error) {
    console.error('Stock additions report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
