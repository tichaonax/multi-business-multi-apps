import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

/**
 * Records a POS Quick-Edit change (MBM-290) to the shared audit log — same
 * table/helper every other audited action in this codebase uses. The
 * `viaPOSQuickEdit` metadata flag makes it possible to later report how many
 * changes came through this fast path versus the full admin screens.
 *
 * Unlike every other audit call site in the codebase, the caller here
 * (POST /api/pos/quick-edit/log) never looks up the item itself — oldValue/
 * newValue come straight from the request body — so productName/sku/barcode
 * aren't already in scope and need their own lookup, done here.
 */
export async function logPosQuickEdit(params: {
  userId: string
  itemId: string
  businessId: string
  sourceTable: string
  field: 'price' | 'imageUrl'
  oldValue: string | number | null
  newValue: string | number | null
}) {
  const { userId, itemId, businessId, sourceTable, field, oldValue, newValue } = params

  let productName: string | null = null
  let sku: string | null = null
  let barcode: string | null = null
  try {
    if (sourceTable === 'BARCODE_ITEM') {
      const item = await prisma.barcodeInventoryItems.findFirst({
        where: { id: itemId, businessId },
        select: { name: true, sku: true, barcodeData: true },
      })
      if (item) { productName = item.name; sku = item.sku; barcode = item.barcodeData }
    } else if (sourceTable === 'BUSINESS_PRODUCT') {
      const product = await prisma.businessProducts.findFirst({
        where: { id: itemId, businessId },
        select: { name: true, sku: true, barcode: true },
      })
      if (product) { productName = product.name; sku = product.sku; barcode = product.barcode }
    }
  } catch (err) {
    console.error('[logPosQuickEdit] item lookup failed (non-blocking):', err)
  }

  await createAuditLog({
    userId,
    action: field === 'price' ? 'PRODUCT_PRICE_UPDATED' : 'PRODUCT_IMAGE_UPDATED',
    entityType: 'Product',
    entityId: itemId,
    oldValues: { [field]: oldValue },
    newValues: { [field]: newValue },
    metadata: { sourceTable, businessId, viaPOSQuickEdit: true, productName, sku, barcode },
    businessId,
  })
}
