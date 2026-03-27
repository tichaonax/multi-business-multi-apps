import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/stock-take/drafts/[id]/submit
 *
 * Submits a stock-take draft:
 * 1. Validates required fields (at least one employee)
 * 2. Updates BarcodeInventoryItems stock for each row:
 *    - Existing + physicalCount → stockQuantity = physicalCount + newQuantity
 *    - Existing, no physicalCount → stockQuantity += newQuantity
 *    - New item → creates with stockQuantity = newQuantity
 * 3. Calculates report totals
 * 4. Creates StockTakeReport + StockTakeReportEmployees
 * 5. Marks draft as SUBMITTED
 *
 * Body: { employeeIds: string[] }
 * Returns: { success, reportId }
 */

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const body = await request.json()
    const { employeeIds } = body

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: 'At least one responsible employee is required' }, { status: 400 })
    }

    // Load draft with items
    const draft = await prisma.stockTakeDrafts.findUnique({
      where: { id },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
    })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.createdById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (draft.status !== 'DRAFT') return NextResponse.json({ error: 'Draft already submitted' }, { status: 409 })
    if (draft.items.length === 0) return NextResponse.json({ error: 'Draft has no items' }, { status: 400 })

    // Block submission if sales occurred since the last sync
    if (draft.isStockTakeMode && draft.salesOccurredAt) {
      const needsSync = !draft.lastSyncedAt || draft.lastSyncedAt < draft.salesOccurredAt
      if (needsSync) {
        return NextResponse.json(
          {
            success: false,
            error: 'sync_required',
            message: 'Sales occurred since your last sync. Please sync the stock take before submitting.'
          },
          { status: 409 }
        )
      }
    }

    // Verify employees exist
    const employees = await prisma.employees.findMany({
      where: { id: { in: employeeIds }, isActive: true },
      select: { id: true },
    })
    if (employees.length !== employeeIds.length) {
      return NextResponse.json({ error: 'One or more employees not found or inactive' }, { status: 400 })
    }

    // ── Process each item ─────────────────────────────────────────────────────

    type ReportItem = {
      barcode: string | null
      productName: string
      isExistingItem: boolean
      systemQty: number | null
      physicalCount: number | null
      variance: number | null
      newStockAdded: number
      sellingPrice: number
      shortfallValue: number
    }

    const reportItems: ReportItem[] = []
    let totalShortfallQty = 0
    let totalShortfallValue = 0
    let totalNewStockValue = 0
    let totalStockValueAfter = 0

    for (const item of draft.items) {
      const sellingPrice = Number(item.sellingPrice)
      const newQty = Number(item.newQuantity)

      if (item.isExistingItem) {
        // 1. Try BarcodeInventoryItems
        const existing = item.barcode
          ? await prisma.barcodeInventoryItems.findFirst({
              where: { businessId: draft.businessId, barcodeData: item.barcode },
            })
          : null

        if (existing) {
          const hasPhysicalCount = item.physicalCount !== null && item.physicalCount !== undefined
          const physCount = hasPhysicalCount ? Number(item.physicalCount) : null
          const sysQty = Number(item.systemQuantity ?? existing.stockQuantity)
          const variance = hasPhysicalCount ? (physCount! - sysQty) : null
          const shortfall = variance !== null && variance < 0 ? Math.abs(variance) : 0
          const shortfallValue = shortfall * sellingPrice
          const newStock = hasPhysicalCount ? physCount! + newQty : sysQty + newQty

          await prisma.barcodeInventoryItems.update({
            where: { id: existing.id },
            data: {
              stockQuantity: newStock,
              quantity: newStock,
              sellingPrice,
              ...(item.costPrice !== null ? { costPrice: Number(item.costPrice) } : {}),
              // Apply category/domain/supplier changes if the user edited them in the row
              ...(item.categoryId ? { categoryId: item.categoryId } : {}),
              ...(item.domainId ? { domainId: item.domainId } : {}),
              ...(item.supplierId ? { supplierId: item.supplierId } : {}),
            },
          })

          // Fix category's domainId if it's null and we now know the correct domain
          if (item.domainId && item.categoryId) {
            await prisma.businessCategories.updateMany({
              where: { id: item.categoryId, domainId: null },
              data: { domainId: item.domainId },
            })
          }

          totalShortfallQty += shortfall
          totalShortfallValue += shortfallValue
          totalNewStockValue += newQty * sellingPrice
          totalStockValueAfter += newStock * sellingPrice

          reportItems.push({
            barcode: item.barcode,
            productName: item.name,
            isExistingItem: true,
            systemQty: sysQty,
            physicalCount: physCount,
            variance,
            newStockAdded: newQty,
            sellingPrice,
            shortfallValue,
          })
        } else {
          // 2. Try CustomBulkProducts
          const bulkProd = item.barcode
            ? await prisma.customBulkProducts.findFirst({
                where: { businessId: draft.businessId, barcode: item.barcode },
              })
            : null

          if (bulkProd) {
            const hasPhysicalCount = item.physicalCount !== null && item.physicalCount !== undefined
            const physCount = hasPhysicalCount ? Number(item.physicalCount) : null
            const sysQty = Number(item.systemQuantity ?? bulkProd.remainingCount)
            const variance = hasPhysicalCount ? (physCount! - sysQty) : null
            const shortfall = variance !== null && variance < 0 ? Math.abs(variance) : 0
            const shortfallValue = shortfall * sellingPrice
            const newStock = hasPhysicalCount ? physCount! + newQty : sysQty + newQty

            await prisma.customBulkProducts.update({
              where: { id: bulkProd.id },
              data: { remainingCount: newStock },
            })

            totalShortfallQty += shortfall
            totalShortfallValue += shortfallValue
            totalNewStockValue += newQty * sellingPrice
            totalStockValueAfter += newStock * sellingPrice

            reportItems.push({
              barcode: item.barcode,
              productName: item.name,
              isExistingItem: true,
              systemQty: sysQty,
              physicalCount: physCount,
              variance,
              newStockAdded: newQty,
              sellingPrice,
              shortfallValue,
            })
          } else {
            // 3. Try ClothingBales (still owned by this business)
            const baleRecord = item.barcode
              ? await prisma.clothingBales.findFirst({
                  where: {
                    businessId: draft.businessId,
                    isActive: true,
                    OR: [
                      { scanCode: item.barcode },
                      { barcode: item.barcode },
                    ],
                  },
                })
              : null

            if (baleRecord) {
              const hasPhysicalCount = item.physicalCount !== null && item.physicalCount !== undefined
              const physCount = hasPhysicalCount ? Number(item.physicalCount) : null
              const sysQty = Number(item.systemQuantity ?? baleRecord.remainingCount)
              const variance = hasPhysicalCount ? (physCount! - sysQty) : null
              const shortfall = variance !== null && variance < 0 ? Math.abs(variance) : 0
              const shortfallValue = shortfall * sellingPrice
              const newStock = hasPhysicalCount ? physCount! + newQty : sysQty + newQty

              await prisma.clothingBales.update({
                where: { id: baleRecord.id },
                data: {
                  remainingCount: newStock,
                  isActive: newStock > 0,
                },
              })

              totalShortfallQty += shortfall
              totalShortfallValue += shortfallValue
              totalNewStockValue += newQty * sellingPrice
              totalStockValueAfter += newStock * sellingPrice

              reportItems.push({
                barcode: item.barcode,
                productName: item.name,
                isExistingItem: true,
                systemQty: sysQty,
                physicalCount: physCount,
                variance,
                newStockAdded: newQty,
                sellingPrice,
                shortfallValue,
              })
            }
            // If none found (e.g. bale transferred away), skip the item silently
          }
        }
      } else {
        // New item — create
        const inventoryItemId = randomBytes(8).toString('hex')
        const barcodeData = item.barcode?.trim() || randomBytes(4).toString('hex')

        await prisma.barcodeInventoryItems.create({
          data: {
            name: item.name.trim(),
            sku: item.sku?.trim() || undefined,
            businessId: draft.businessId,
            inventoryItemId,
            barcodeData,
            quantity: newQty,
            stockQuantity: newQty,
            customLabel: item.description?.trim() || undefined,
            costPrice: item.costPrice !== null ? Number(item.costPrice) : null,
            sellingPrice,
            categoryId: item.categoryId || null,
            domainId: item.domainId || null,
            supplierId: item.supplierId || null,
            createdById: user.id,
          },
        })

        // Fix category's domainId if it's null and we know the correct domain
        if (item.domainId && item.categoryId) {
          await prisma.businessCategories.updateMany({
            where: { id: item.categoryId, domainId: null },
            data: { domainId: item.domainId },
          })
        }

        totalNewStockValue += newQty * sellingPrice
        totalStockValueAfter += newQty * sellingPrice

        reportItems.push({
          barcode: item.barcode,
          productName: item.name,
          isExistingItem: false,
          systemQty: null,
          physicalCount: null,
          variance: null,
          newStockAdded: newQty,
          sellingPrice,
          shortfallValue: 0,
        })
      }
    }

    // ── Create report + employee rows in a transaction ────────────────────────

    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.stockTakeReports.create({
        data: {
          businessId: draft.businessId,
          draftId: id,
          submittedById: user.id,
          status: 'PENDING_SIGNOFF',
          reportData: { items: reportItems },
          totalShortfallQty,
          totalShortfallValue,
          totalNewStockValue,
          totalStockValueAfter,
          employeeCount: employeeIds.length,
        },
      })

      await tx.stockTakeReportEmployees.createMany({
        data: employeeIds.map((empId: string) => ({
          reportId: newReport.id,
          employeeId: empId,
        })),
      })

      await tx.stockTakeDrafts.update({
        where: { id },
        data: { status: 'SUBMITTED' },
      })

      return newReport
    })

    return NextResponse.json({ success: true, reportId: report.id })
  } catch (error) {
    console.error('[stock-take/drafts/submit POST]', error)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
