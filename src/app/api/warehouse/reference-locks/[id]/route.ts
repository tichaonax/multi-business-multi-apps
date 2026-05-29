import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { id } = params
    const body = await req.json()

    const existing: any[] = await prisma.$queryRaw`
      SELECT id, "isLocked" FROM warehouse_reference_locks WHERE id = ${id} LIMIT 1
    `
    if (existing.length === 0) return NextResponse.json({ error: 'Lock record not found' }, { status: 404 })

    const now = new Date()

    if ('isLocked' in body) {
      const lock = body.isLocked === true
      if (lock) {
        const lockReason = typeof body.lockReason === 'string' ? body.lockReason.trim() || null : null
        await prisma.$executeRaw`
          UPDATE warehouse_reference_locks
          SET "isLocked" = true, "autoLocked" = false, "lockedAt" = ${now},
              "lockedById" = ${user.id}, "lockReason" = ${lockReason}, "updatedAt" = ${now}
          WHERE id = ${id}
        `
      } else {
        await prisma.$executeRaw`
          UPDATE warehouse_reference_locks
          SET "isLocked" = false, "autoLocked" = false, "lockedAt" = NULL,
              "lockedById" = NULL, "lockReason" = NULL, "updatedAt" = ${now}
          WHERE id = ${id}
        `
      }
    }

    if ('originalQty' in body) {
      const v = body.originalQty === null || body.originalQty === '' ? null : parseInt(String(body.originalQty), 10)
      const parsed = v === null || isNaN(v) ? null : v
      await prisma.$executeRaw`
        UPDATE warehouse_reference_locks SET "originalQty" = ${parsed}, "updatedAt" = ${now} WHERE id = ${id}
      `
    }

    if ('notes' in body) {
      const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
      await prisma.$executeRaw`
        UPDATE warehouse_reference_locks SET notes = ${notes}, "updatedAt" = ${now} WHERE id = ${id}
      `
    }

    const result: any[] = await prisma.$queryRaw`
      SELECT * FROM warehouse_reference_locks WHERE id = ${id} LIMIT 1
    `
    return NextResponse.json({ success: true, lock: result[0] })
  } catch (error: any) {
    console.error('PATCH /api/warehouse/reference-locks/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = params
    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM warehouse_reference_locks WHERE id = ${id} LIMIT 1
    `
    if (existing.length === 0) return NextResponse.json({ error: 'Lock record not found' }, { status: 404 })

    await prisma.$executeRaw`DELETE FROM warehouse_reference_locks WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/warehouse/reference-locks/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
