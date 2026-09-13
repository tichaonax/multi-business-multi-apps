import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { upsertReview, type ExceptionReviewStatus } from '@/lib/inventory/exception-reviews'
import type { CatalogSource } from '@/lib/inventory/product-catalog-view'

const VALID_STATUSES: ExceptionReviewStatus[] = ['OPEN', 'REVIEWED', 'CORRECTED', 'APPROVED', 'IGNORED', 'FOLLOW_UP']
const VALID_CATALOG_SOURCES: CatalogSource[] = ['BUSINESS_PRODUCT', 'PRODUCT_VARIANT', 'BARCODE_ITEM']

/**
 * POST /api/inventory/exception-reviews
 *
 * MBM-296 §4.5 — mark a pricing-exceptions report row as reviewed/corrected/
 * approved/ignored/follow-up. Approving a below-cost sale (status APPROVED
 * on a BELOW_COST exception) additionally requires canManageInventory or
 * sysadmin — matching how the admin deactivation workflow layers a second
 * capability check on top of view access — and a non-empty reason, mirroring
 * that same workflow's required-reason pattern.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, catalogSource, productRefId, exceptionType, status, reason, notes, expiresAt } = body

    if (!businessId || !catalogSource || !productRefId || !exceptionType || !status) {
      return NextResponse.json({ success: false, error: 'businessId, catalogSource, productRefId, exceptionType and status are required' }, { status: 400 })
    }
    if (!VALID_CATALOG_SOURCES.includes(catalogSource)) {
      return NextResponse.json({ success: false, error: 'Invalid catalogSource' }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    const canView = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', businessId)
    if (!canView) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const isBelowCostApproval = status === 'APPROVED' && exceptionType === 'BELOW_COST'
    if (isBelowCostApproval) {
      const canApprove = isSystemAdmin(user) || hasPermission(user, 'canManageInventory', businessId)
      if (!canApprove) {
        return NextResponse.json({ success: false, error: 'Approving a below-cost sale requires canManageInventory or admin' }, { status: 403 })
      }
      if (!reason || !String(reason).trim()) {
        return NextResponse.json({ success: false, error: 'A reason is required to approve a below-cost sale' }, { status: 400 })
      }
    }

    const row = await upsertReview({
      businessId,
      catalogSource,
      productRefId,
      exceptionType,
      status,
      reason: reason ?? null,
      notes: notes ?? null,
      actedByUserId: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })

    return NextResponse.json({ success: true, data: row })
  } catch (error) {
    console.error('[exception-reviews POST]', error)
    return NextResponse.json({ success: false, error: 'Failed to save review status' }, { status: 500 })
  }
}
