import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/universal/invoices/[id]
 * Fetch a single invoice/quotation with all line items.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const invoice = await prisma.invoices.findUnique({
      where: { id },
      include: { invoice_items: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error('GET /api/universal/invoices/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/universal/invoices/[id]
 * Update status and/or notes. Does not allow re-numbering.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    const existing = await prisma.invoices.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot update a cancelled document' }, { status: 400 })
    }

    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
    }

    const updated = await prisma.invoices.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: new Date(),
      },
      include: { invoice_items: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/universal/invoices/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/universal/invoices/[id]
 * Cancel a document (sets status = CANCELLED). No hard deletes.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await prisma.invoices.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
    }

    const cancelled = await prisma.invoices.update({
      where: { id },
      data: { status: 'CANCELLED', updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, data: { id: cancelled.id, status: cancelled.status } })
  } catch (error) {
    console.error('DELETE /api/universal/invoices/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
