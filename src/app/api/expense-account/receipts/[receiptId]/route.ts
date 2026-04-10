import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * DELETE /api/expense-account/receipts/[receiptId]
 * Delete a receipt. Only the creator or admin may delete.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { receiptId } = await params

    const receipt = await prisma.expensePaymentReceipts.findUnique({
      where: { id: receiptId },
      select: { id: true, createdBy: true },
    })

    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    if (user.role !== 'admin' && receipt.createdBy !== user.id) {
      return NextResponse.json({ error: 'You can only delete receipts you created' }, { status: 403 })
    }

    await prisma.expensePaymentReceipts.delete({ where: { id: receiptId } })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 })
  }
}
