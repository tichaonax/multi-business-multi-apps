import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * PATCH /api/expense-account/payment-notes/[id]
 * Update the classification (domainId, categoryId, subcategoryId) of a saved payment note.
 * Only the owner of the note can update it.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const { domainId, categoryId, subcategoryId } = await request.json()

    // Verify the note belongs to this user
    const note = await prisma.paymentNotes.findFirst({
      where: { id, userId: user.id, isActive: true },
    })
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    const updated = await prisma.paymentNotes.update({
      where: { id },
      data: {
        domainId: domainId ?? null,
        categoryId: categoryId ?? null,
        subcategoryId: subcategoryId ?? null,
      },
      select: { id: true, note: true, usageCount: true, domainId: true, categoryId: true, subcategoryId: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating payment note:', error)
    return NextResponse.json({ error: 'Failed to update payment note' }, { status: 500 })
  }
}
