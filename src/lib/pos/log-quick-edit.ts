import { createAuditLog } from '@/lib/audit'

/**
 * Records a POS Quick-Edit change (MBM-290) to the shared audit log — same
 * table/helper every other audited action in this codebase uses. The
 * `viaPOSQuickEdit` metadata flag makes it possible to later report how many
 * changes came through this fast path versus the full admin screens.
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
  await createAuditLog({
    userId,
    action: field === 'price' ? 'PRODUCT_PRICE_UPDATED' : 'PRODUCT_IMAGE_UPDATED',
    entityType: 'Product',
    entityId: itemId,
    oldValues: { [field]: oldValue },
    newValues: { [field]: newValue },
    metadata: { sourceTable, businessId, viaPOSQuickEdit: true },
    businessId,
  })
}
