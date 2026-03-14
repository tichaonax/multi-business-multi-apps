import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { createEODPaymentBatches } from '@/lib/eod-payment-batch-utils'

/**
 * POST /api/eod-payment-batches/quick-batch
 * Cashier shortcut: auto-creates an EOD batch for a business's QUEUED payments
 * without requiring an EOD report to be saved first.
 * Returns the batchId so the caller can navigate directly to the review page.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId } = body as { businessId: string }
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const result = await createEODPaymentBatches(businessId, new Date())

    if (!result.batchId) {
      return NextResponse.json({ error: 'No queued payments found for this business' }, { status: 404 })
    }

    return NextResponse.json({ success: true, batchId: result.batchId, paymentCount: result.paymentCount })
  } catch (error) {
    console.error('Error creating quick batch:', error)
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
  }
}
