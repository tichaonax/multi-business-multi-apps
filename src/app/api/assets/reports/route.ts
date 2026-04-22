import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const dateFilter = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDate ? { lte: new Date(toDate) } : {}),
    }

    const [assets, depreciationByAsset, maintenanceByAsset] = await Promise.all([
      prisma.businessAsset.findMany({
        where: { businessId },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.assetDepreciationEntry.findMany({
        where: {
          asset: { businessId },
          ...(Object.keys(dateFilter).length ? { periodDate: dateFilter } : {}),
        },
        select: { assetId: true, amount: true, periodDate: true },
      }),
      prisma.assetMaintenanceLog.findMany({
        where: {
          asset: { businessId },
          ...(Object.keys(dateFilter).length ? { maintenanceDate: dateFilter } : {}),
        },
        select: { assetId: true, cost: true, maintenanceType: true, maintenanceDate: true },
      }),
    ])

    // 1. Asset value by category
    const categoryMap = new Map<string, { name: string; count: number; totalBookValue: number; totalPurchaseValue: number }>()
    for (const asset of assets) {
      const key = asset.categoryId ?? '__none__'
      const label = asset.category?.name ?? 'Uncategorized'
      if (!categoryMap.has(key)) categoryMap.set(key, { name: label, count: 0, totalBookValue: 0, totalPurchaseValue: 0 })
      const entry = categoryMap.get(key)!
      entry.count++
      entry.totalBookValue += parseFloat(asset.currentBookValue.toString())
      entry.totalPurchaseValue += parseFloat(asset.purchasePrice.toString())
    }
    const valueByCategory = Array.from(categoryMap.values()).sort((a, b) => b.totalBookValue - a.totalBookValue)

    // 2. Depreciation summary per asset
    const depMap = new Map<string, number>()
    for (const entry of depreciationByAsset) {
      depMap.set(entry.assetId, (depMap.get(entry.assetId) ?? 0) + parseFloat(entry.amount.toString()))
    }
    const depreciationSummary = assets
      .filter(a => depMap.has(a.id))
      .map(a => ({
        id: a.id,
        assetTag: a.assetTag,
        name: a.name,
        category: a.category?.name ?? 'Uncategorized',
        purchasePrice: parseFloat(a.purchasePrice.toString()),
        currentBookValue: parseFloat(a.currentBookValue.toString()),
        periodDepreciation: depMap.get(a.id) ?? 0,
        totalDepreciated: parseFloat(a.purchasePrice.toString()) - parseFloat(a.currentBookValue.toString()),
      }))
      .sort((a, b) => b.periodDepreciation - a.periodDepreciation)

    // 3. Disposal report
    const disposals = assets
      .filter(a => a.status === 'DISPOSED' || a.status === 'WRITTEN_OFF')
      .filter(a => {
        if (!a.disposedAt) return true
        if (fromDate && a.disposedAt < new Date(fromDate)) return false
        if (toDate && a.disposedAt > new Date(toDate)) return false
        return true
      })
      .map(a => ({
        id: a.id,
        assetTag: a.assetTag,
        name: a.name,
        status: a.status,
        category: a.category?.name ?? 'Uncategorized',
        purchasePrice: parseFloat(a.purchasePrice.toString()),
        bookValueAtDisposal: parseFloat(a.currentBookValue.toString()),
        disposalValue: a.disposalValue != null ? parseFloat(a.disposalValue.toString()) : null,
        gainLoss: a.disposalValue != null ? parseFloat(a.disposalValue.toString()) - parseFloat(a.currentBookValue.toString()) : null,
        disposalMethod: a.disposalMethod,
        disposalRecipient: a.disposalRecipient,
        disposedAt: a.disposedAt,
      }))

    // 4. Maintenance cost per asset
    const maintMap = new Map<string, { cost: number; count: number }>()
    for (const log of maintenanceByAsset) {
      if (!maintMap.has(log.assetId)) maintMap.set(log.assetId, { cost: 0, count: 0 })
      const entry = maintMap.get(log.assetId)!
      entry.cost += log.cost != null ? parseFloat(log.cost.toString()) : 0
      entry.count++
    }
    const maintenanceSummary = assets
      .filter(a => maintMap.has(a.id))
      .map(a => ({
        id: a.id,
        assetTag: a.assetTag,
        name: a.name,
        category: a.category?.name ?? 'Uncategorized',
        maintenanceCount: maintMap.get(a.id)!.count,
        totalMaintenanceCost: maintMap.get(a.id)!.cost,
      }))
      .sort((a, b) => b.totalMaintenanceCost - a.totalMaintenanceCost)

    return NextResponse.json({
      success: true,
      data: { valueByCategory, depreciationSummary, disposals, maintenanceSummary },
    })
  } catch (error) {
    console.error('GET /api/assets/reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
