import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * PUT /api/expense-account/fund-sources/[id]
 * Edit a fund source (name, emoji, description)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { name, emoji, description } = await request.json()

    const existing = await prisma.fundSources.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Fund source not found' }, { status: 404 })
    }

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const updated = await prisma.fundSources.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(emoji !== undefined && { emoji }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating fund source:', error)
    return NextResponse.json({ error: 'Failed to update fund source' }, { status: 500 })
  }
}

/**
 * DELETE /api/expense-account/fund-sources/[id]
 * Soft delete a fund source (sets isActive = false)
 * Cannot hard-delete sources that have been used in deposits
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const existing = await prisma.fundSources.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Fund source not found' }, { status: 404 })
    }

    await prisma.fundSources.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Fund source removed' })
  } catch (error) {
    console.error('Error deleting fund source:', error)
    return NextResponse.json({ error: 'Failed to remove fund source' }, { status: 500 })
  }
}
