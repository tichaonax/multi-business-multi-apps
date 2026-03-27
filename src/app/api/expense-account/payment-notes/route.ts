import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/payment-notes
 * List all active saved payment notes for the current user, sorted by usageCount DESC
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const notes = await prisma.paymentNotes.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, note: true, usageCount: true },
    })

    return NextResponse.json({ success: true, data: notes })
  } catch (error) {
    console.error('Error fetching payment notes:', error)
    return NextResponse.json({ error: 'Failed to fetch payment notes' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/payment-notes
 * Create a new saved payment note for the current user
 * Body: { note: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { note } = await request.json()

    if (!note?.trim()) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
    }

    // Prevent exact duplicates for this user
    const existing = await prisma.paymentNotes.findFirst({
      where: { userId: user.id, note: note.trim(), isActive: true },
    })
    if (existing) {
      return NextResponse.json({ success: true, data: existing }, { status: 200 })
    }

    const saved = await prisma.paymentNotes.create({
      data: { note: note.trim(), userId: user.id },
      select: { id: true, note: true, usageCount: true },
    })

    return NextResponse.json({ success: true, data: saved }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment note:', error)
    return NextResponse.json({ error: 'Failed to save payment note' }, { status: 500 })
  }
}
