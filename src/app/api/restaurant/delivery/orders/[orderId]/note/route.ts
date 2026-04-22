import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// PATCH — update delivery note on an existing order
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = params
    const { deliveryNote } = await request.json()

    const meta = await prisma.deliveryOrderMeta.update({
      where: { orderId },
      data: { deliveryNote: deliveryNote ?? null, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, meta })
  } catch (error) {
    console.error('Error updating delivery note:', error)
    return NextResponse.json({ error: 'Failed to update delivery note' }, { status: 500 })
  }
}
