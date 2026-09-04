import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { logPosQuickEdit } from '@/lib/pos/log-quick-edit'

// POST /api/pos/quick-edit/log — records a POS Quick-Edit price/image change to
// the shared audit log (MBM-290). Called by the dialogs after their own save
// request to the actual update endpoint succeeds — userId is taken from the
// session, never trusted from the request body.
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, itemId, sourceTable, field, oldValue, newValue } = await req.json()
  if (!businessId || !itemId || !sourceTable || !field) {
    return NextResponse.json({ error: 'businessId, itemId, sourceTable, and field are required' }, { status: 400 })
  }

  const permissions = getEffectivePermissions(user, businessId)
  if (user.role !== 'admin' && !permissions.canQuickEditPOSItems) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await logPosQuickEdit({ userId: user.id, itemId, businessId, sourceTable, field, oldValue, newValue })
  return NextResponse.json({ success: true })
}
