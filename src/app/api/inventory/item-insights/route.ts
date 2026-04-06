import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/inventory/item-insights?type=bale|inventory&id=XXX&businessId=XXX
 *   OR: /api/inventory/item-insights?productId=XXX&businessId=XXX
 *
 * Returns per-item profitability insights for a bale or general inventory item.
 * When productId is provided (from sales analytics chart click), the API resolves
 * the correct item automatically:
 *   - productId starting with "bale_" → ClothingBales insight
 *   - otherwise → BusinessProducts/ProductVariants → BarcodeInventoryItems via SKU
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let type = searchParams.get('type') as 'bale' | 'inventory' | null
    let id = searchParams.get('id')
    const businessId = searchParams.get('businessId')
    const productId = searchParams.get('productId')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Missing businessId' }, { status: 400 })
    }

    // Resolve productId (from sales analytics chart) to type+id
    if (productId && !id) {
      if (productId.startsWith('bale_')) {
        type = 'bale'
        id = productId.replace(/^bale_/, '')
      } else {
        // Try BusinessProducts lookup first — compute insights directly from product+order data
        const product = await prisma.businessProducts.findUnique({
          where: { id: productId },
          include: {
            product_variants: { select: { id: true, stockQuantity: true } },
            business_categories: { select: { name: true } },
          },
        }).catch(() => null)

        if (product) {
          const variantIds = product.product_variants.map((v) => v.id)
          let soldPaid = 0
          let bpRevenue = 0
          const bpSalesByDayMap = new Map<string, { units: number; revenue: number }>()

          const addOrderItems = (items: Array<{ quantity: number; totalPrice: unknown; business_orders: { status: string; transactionDate: Date | null; createdAt: Date; businessId: string } }>) => {
            const completed = items.filter(
              (oi) =>
                oi.business_orders.status === 'COMPLETED' &&
                oi.business_orders.businessId === businessId
            )
            for (const oi of completed) {
              soldPaid += oi.quantity
              bpRevenue += Number(oi.totalPrice)
              const date = (oi.business_orders.transactionDate ?? oi.business_orders.createdAt)
                .toISOString()
                .slice(0, 10)
              const existing = bpSalesByDayMap.get(date) ?? { units: 0, revenue: 0 }
              bpSalesByDayMap.set(date, {
                units: existing.units + oi.quantity,
                revenue: existing.revenue + Number(oi.totalPrice),
              })
            }
          }

          if (variantIds.length > 0) {
            const orderItems = await prisma.businessOrderItems.findMany({
              where: { productVariantId: { in: variantIds } },
              include: {
                business_orders: {
                  select: { createdAt: true, status: true, transactionDate: true, businessId: true },
                },
              },
            })
            addOrderItems(orderItems)
          }

          // Also pick up sales stored via attributes.productId (services, combos, items without variants)
          const attrOrderItems = await prisma.businessOrderItems.findMany({
            where: {
              productVariantId: null,
              attributes: { path: ['productId'], equals: productId },
            },
            include: {
              business_orders: {
                select: { createdAt: true, status: true, transactionDate: true, businessId: true },
              },
            },
          })
          addOrderItems(attrOrderItems)

          const totalStock = product.product_variants.reduce((sum, v) => sum + v.stockQuantity, 0)
          const bpCostPrice = Number(product.costPrice ?? 0)
          const bpProfit = bpRevenue - bpCostPrice * soldPaid
          const bpProfitPct = bpCostPrice > 0 ? (bpProfit / (bpCostPrice * soldPaid || 1)) * 100 : 0
          const bpTotalCost = bpCostPrice * (totalStock + soldPaid)
          const bpCostRecoveredPct =
            bpTotalCost > 0 ? Math.min((bpRevenue / bpTotalCost) * 100, 100) : 0
          const bpSalesByDay = Array.from(bpSalesByDayMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, val]) => ({ date, units: val.units, revenue: val.revenue }))

          const isService = product.productType === 'SERVICE'

          return NextResponse.json({
            success: true,
            data: {
              type: 'inventory' as const,
              productType: product.productType,
              name: product.name,
              sku: product.sku ?? null,
              category: product.business_categories?.name ?? null,
              purchasedAt: product.createdAt.toISOString().slice(0, 10),
              stockedBy: null,
              costPrice: bpCostPrice,
              unitPrice: Number(product.basePrice),
              itemCount: isService ? soldPaid : totalStock + soldPaid,
              remainingCount: isService ? 0 : totalStock,
              sold: soldPaid,
              revenue: Math.round(bpRevenue * 100) / 100,
              bogoFreeGiven: 0,
              transferred: 0,
              profit: Math.round(bpProfit * 100) / 100,
              profitPct: Math.round(bpProfitPct * 10) / 10,
              costRecoveredPct: Math.round(bpCostRecoveredPct * 10) / 10,
              bogoActive: false,
              bogoHistory: [],
              salesByDay: bpSalesByDay,
            },
          })
        }

        // productId may be a ProductVariants.id — resolve to parent BusinessProducts and retry
        const variantRecord = await prisma.productVariants.findUnique({
          where: { id: productId },
          select: { productId: true },
        }).catch(() => null)

        if (variantRecord?.productId) {
          const parentProduct = await prisma.businessProducts.findUnique({
            where: { id: variantRecord.productId },
            include: {
              product_variants: { select: { id: true, stockQuantity: true } },
              business_categories: { select: { name: true } },
            },
          }).catch(() => null)

          if (parentProduct) {
            const variantIds = parentProduct.product_variants.map((v) => v.id)
            let soldPaid2 = 0
            let bpRevenue2 = 0
            const bpSalesByDayMap2 = new Map<string, { units: number; revenue: number }>()

            const addItems2 = (items: Array<{ quantity: number; totalPrice: unknown; business_orders: { status: string; transactionDate: Date | null; createdAt: Date; businessId: string } }>) => {
              const completed = items.filter(
                (oi) => oi.business_orders.status === 'COMPLETED' && oi.business_orders.businessId === businessId
              )
              for (const oi of completed) {
                soldPaid2 += oi.quantity
                bpRevenue2 += Number(oi.totalPrice)
                const date = (oi.business_orders.transactionDate ?? oi.business_orders.createdAt).toISOString().slice(0, 10)
                const ex = bpSalesByDayMap2.get(date) ?? { units: 0, revenue: 0 }
                bpSalesByDayMap2.set(date, { units: ex.units + oi.quantity, revenue: ex.revenue + Number(oi.totalPrice) })
              }
            }

            if (variantIds.length > 0) {
              const ois = await prisma.businessOrderItems.findMany({
                where: { productVariantId: { in: variantIds } },
                include: { business_orders: { select: { createdAt: true, status: true, transactionDate: true, businessId: true } } },
              })
              addItems2(ois)
            }
            const attrOis2 = await prisma.businessOrderItems.findMany({
              where: { productVariantId: null, attributes: { path: ['productId'], equals: variantRecord.productId } },
              include: { business_orders: { select: { createdAt: true, status: true, transactionDate: true, businessId: true } } },
            })
            addItems2(attrOis2)

            const totalStock2 = parentProduct.product_variants.reduce((sum, v) => sum + v.stockQuantity, 0)
            const costPrice2 = Number(parentProduct.costPrice ?? 0)
            const profit2 = bpRevenue2 - costPrice2 * soldPaid2
            const profitPct2 = costPrice2 > 0 ? (profit2 / (costPrice2 * soldPaid2 || 1)) * 100 : 0
            const totalCost2 = costPrice2 * (totalStock2 + soldPaid2)
            const costRecoveredPct2 = totalCost2 > 0 ? Math.min((bpRevenue2 / totalCost2) * 100, 100) : 0
            const isService2 = parentProduct.productType === 'SERVICE'
            const salesByDay2 = Array.from(bpSalesByDayMap2.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([date, val]) => ({ date, units: val.units, revenue: val.revenue }))

            return NextResponse.json({
              success: true,
              data: {
                type: 'inventory' as const,
                productType: parentProduct.productType,
                name: parentProduct.name,
                sku: parentProduct.sku ?? null,
                category: parentProduct.business_categories?.name ?? null,
                purchasedAt: parentProduct.createdAt.toISOString().slice(0, 10),
                stockedBy: null,
                costPrice: costPrice2,
                unitPrice: Number(parentProduct.basePrice),
                itemCount: isService2 ? soldPaid2 : totalStock2 + soldPaid2,
                remainingCount: isService2 ? 0 : totalStock2,
                sold: soldPaid2,
                revenue: Math.round(bpRevenue2 * 100) / 100,
                bogoFreeGiven: 0,
                transferred: 0,
                profit: Math.round(profit2 * 100) / 100,
                profitPct: Math.round(profitPct2 * 10) / 10,
                costRecoveredPct: Math.round(costRecoveredPct2 * 10) / 10,
                bogoActive: false,
                bogoHistory: [],
                salesByDay: salesByDay2,
              },
            })
          }
        }

        // Last resort: productId might be a raw ClothingBales.id (no bale_ prefix)
        const baleCheck = await prisma.clothingBales.findFirst({
          where: { id: productId, businessId },
          select: { id: true },
        }).catch(() => null)

        if (baleCheck) {
          type = 'bale'
          id = productId
        } else {
          return NextResponse.json(
            { success: false, error: 'No inventory item found for this product' },
            { status: 404 }
          )
        }
      }
    }

    if (!type || !id) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    if (type !== 'bale' && type !== 'inventory') {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
    }

    if (type === 'bale') {
      const bale = await prisma.clothingBales.findFirst({
        where: { id, businessId },
        include: {
          category: true,
          employee: true,
          bogoHistory: {
            orderBy: { changedAt: 'asc' },
            include: { user: { select: { name: true } } },
          },
        },
      })

      if (!bale) {
        return NextResponse.json({ success: false, error: 'Bale not found' }, { status: 404 })
      }

      // Get all orders containing this bale
      const orderItems = await prisma.businessOrderItems.findMany({
        where: {
          attributes: { path: ['baleId'], equals: bale.id },
        },
        include: {
          business_orders: {
            select: { createdAt: true, status: true, transactionDate: true },
          },
        },
      })

      // Completed orders only
      const completedItems = orderItems.filter(
        (oi) => oi.business_orders.status === 'COMPLETED'
      )

      let soldPaid = 0
      let bogoFree = 0
      let revenue = 0

      for (const oi of completedItems) {
        const attrs = oi.attributes as Record<string, unknown> | null
        const isBOGOFree = attrs?.isBOGOFree === true
        if (isBOGOFree) {
          bogoFree += oi.quantity
        } else {
          soldPaid += oi.quantity
          revenue += Number(oi.totalPrice)
        }
      }

      // Get transfers
      const transferItems = await prisma.inventoryTransferItems.findMany({
        where: { baleId: bale.id },
        include: { transfer: { select: { status: true, transferDate: true } } },
      })
      const completedTransfers = transferItems.filter((t) => t.transfer.status === 'COMPLETED')
      const transferred = completedTransfers.reduce((sum, t) => sum + t.quantity, 0)

      const costPrice = Number(bale.costPrice ?? 0)
      const profit = revenue - costPrice
      const profitPct = costPrice > 0 ? (profit / costPrice) * 100 : 0
      const costRecoveredPct = costPrice > 0 ? Math.min((revenue / costPrice) * 100, 100) : 0

      // Daily sales breakdown
      const salesByDayMap = new Map<string, { units: number; revenue: number }>()
      for (const oi of completedItems) {
        const attrs = oi.attributes as Record<string, unknown> | null
        const isBOGOFree = attrs?.isBOGOFree === true
        if (isBOGOFree) continue
        const date = (oi.business_orders.transactionDate ?? oi.business_orders.createdAt)
          .toISOString()
          .slice(0, 10)
        const existing = salesByDayMap.get(date) ?? { units: 0, revenue: 0 }
        salesByDayMap.set(date, {
          units: existing.units + oi.quantity,
          revenue: existing.revenue + Number(oi.totalPrice),
        })
      }
      const salesByDay = Array.from(salesByDayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, val]) => ({ date, units: val.units, revenue: val.revenue }))

      return NextResponse.json({
        success: true,
        data: {
          type: 'bale',
          name: `${bale.category.name} — ${bale.batchNumber}`,
          sku: bale.sku,
          category: bale.category.name,
          purchasedAt: bale.createdAt.toISOString().slice(0, 10),
          stockedBy: bale.employee?.fullName ?? null,
          costPrice,
          unitPrice: Number(bale.unitPrice),
          itemCount: bale.itemCount,
          remainingCount: bale.remainingCount,
          sold: soldPaid,
          revenue: Math.round(revenue * 100) / 100,
          bogoFreeGiven: bogoFree,
          transferred,
          profit: Math.round(profit * 100) / 100,
          profitPct: Math.round(profitPct * 10) / 10,
          costRecoveredPct: Math.round(costRecoveredPct * 10) / 10,
          bogoActive: bale.bogoActive,
          bogoHistory: bale.bogoHistory.map((h) => ({
            action: h.action,
            newRatio: h.newRatio,
            previousRatio: h.previousRatio,
            changedAt: h.changedAt.toISOString().slice(0, 10),
            changedBy: h.user.name ?? 'Unknown',
          })),
          salesByDay,
        },
      })
    }

    // type === 'inventory'
    const item = await prisma.barcodeInventoryItems.findFirst({
      where: { id, businessId },
      include: {
        business_category: { select: { name: true } },
        business_supplier: { select: { name: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    let soldPaid = 0
    let revenue = 0
    const salesByDayMap = new Map<string, { units: number; revenue: number }>()

    if (item.sku) {
      // Match by productVariantId via sku lookup
      const variants = await prisma.productVariants.findMany({
        where: { sku: item.sku },
        select: { id: true },
      })
      const variantIds = variants.map((v) => v.id)

      if (variantIds.length > 0) {
        const orderItems = await prisma.businessOrderItems.findMany({
          where: { productVariantId: { in: variantIds } },
          include: {
            business_orders: {
              select: { createdAt: true, status: true, transactionDate: true, businessId: true },
            },
          },
        })

        const completedItems = orderItems.filter(
          (oi) =>
            oi.business_orders.status === 'COMPLETED' &&
            oi.business_orders.businessId === businessId
        )

        for (const oi of completedItems) {
          soldPaid += oi.quantity
          revenue += Number(oi.totalPrice)
          const date = (oi.business_orders.transactionDate ?? oi.business_orders.createdAt)
            .toISOString()
            .slice(0, 10)
          const existing = salesByDayMap.get(date) ?? { units: 0, revenue: 0 }
          salesByDayMap.set(date, {
            units: existing.units + oi.quantity,
            revenue: existing.revenue + Number(oi.totalPrice),
          })
        }
      }
    }

    const costPrice = Number(item.costPrice ?? 0)
    const profit = revenue - costPrice * soldPaid
    const profitPct = costPrice > 0 ? (profit / (costPrice * soldPaid || 1)) * 100 : 0
    const totalCost = costPrice * (item.stockQuantity + soldPaid)
    const costRecoveredPct = totalCost > 0 ? Math.min((revenue / totalCost) * 100, 100) : 0

    const salesByDay = Array.from(salesByDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, val]) => ({ date, units: val.units, revenue: val.revenue }))

    return NextResponse.json({
      success: true,
      data: {
        type: 'inventory',
        name: item.name,
        sku: item.sku ?? null,
        category: item.business_category?.name ?? item.category ?? null,
        purchasedAt: item.createdAt.toISOString().slice(0, 10),
        stockedBy: null,
        costPrice,
        unitPrice: Number(item.sellingPrice ?? 0),
        itemCount: item.stockQuantity + soldPaid,
        remainingCount: item.stockQuantity,
        sold: soldPaid,
        revenue: Math.round(revenue * 100) / 100,
        bogoFreeGiven: 0,
        transferred: 0,
        profit: Math.round(profit * 100) / 100,
        profitPct: Math.round(profitPct * 10) / 10,
        costRecoveredPct: Math.round(costRecoveredPct * 10) / 10,
        bogoActive: false,
        bogoHistory: [],
        salesByDay,
      },
    })
  } catch (error) {
    console.error('item-insights error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
