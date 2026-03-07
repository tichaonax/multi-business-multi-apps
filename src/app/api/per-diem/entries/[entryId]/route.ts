import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * DELETE /api/per-diem/entries/[entryId]
 * Delete a single per diem entry. Admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only admins can delete per diem entries' }, { status: 403 })
    }

    const { entryId } = await params

    const entry = await prisma.perDiemEntries.findUnique({ where: { id: entryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    await prisma.perDiemEntries.delete({ where: { id: entryId } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[per-diem entries DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
