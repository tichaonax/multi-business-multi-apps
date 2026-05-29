import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const locked = searchParams.get('locked') || ''
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    let whereClause = `WHERE 1=1`
    const args: any[] = []
    let argIdx = 1

    if (type === 'ORDER' || type === 'TRACKING') {
      whereClause += ` AND "referenceType" = $${argIdx++}`
      args.push(type)
    }
    if (locked === 'true') {
      whereClause += ` AND "isLocked" = true`
    } else if (locked === 'false') {
      whereClause += ` AND "isLocked" = false`
    }
    if (search) {
      whereClause += ` AND "referenceValue" ILIKE $${argIdx++}`
      args.push(`%${search}%`)
    }

    const locks: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, "referenceType", "referenceValue", "originalQty", "importedQty",
              "isLocked", "autoLocked", "lockedAt", "lockedById", "lockReason", notes, "createdAt", "updatedAt"
       FROM warehouse_reference_locks
       ${whereClause}
       ORDER BY "isLocked" DESC, "updatedAt" DESC
       LIMIT ${limit} OFFSET ${offset}`,
      ...args
    )

    const countRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM warehouse_reference_locks ${whereClause}`,
      ...args
    )
    const total = Number(countRows[0]?.total ?? 0)

    return NextResponse.json({
      locks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    console.error('GET /api/warehouse/reference-locks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const body = await req.json()
    const { referenceType, referenceValue, originalQty, notes } = body

    if (!referenceType || !referenceValue) {
      return NextResponse.json({ error: 'referenceType and referenceValue are required' }, { status: 400 })
    }
    if (referenceType !== 'ORDER' && referenceType !== 'TRACKING') {
      return NextResponse.json({ error: 'referenceType must be ORDER or TRACKING' }, { status: 400 })
    }

    const parsedOriginalQty = originalQty != null && originalQty !== '' ? parseInt(String(originalQty), 10) : null

    // Upsert: create if new, update originalQty/notes if exists
    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM warehouse_reference_locks
      WHERE "referenceType" = ${referenceType} AND "referenceValue" = ${referenceValue}
      LIMIT 1
    `

    const now = new Date()
    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO warehouse_reference_locks ("referenceType", "referenceValue", "originalQty", notes, "createdAt", "updatedAt")
        VALUES (${referenceType}, ${referenceValue}, ${parsedOriginalQty}, ${notes ?? null}, ${now}, ${now})
      `
    } else {
      await prisma.$executeRaw`
        UPDATE warehouse_reference_locks
        SET "originalQty" = ${parsedOriginalQty}, notes = ${notes ?? null}, "updatedAt" = ${now}
        WHERE id = ${existing[0].id}
      `
    }

    const result: any[] = await prisma.$queryRaw`
      SELECT * FROM warehouse_reference_locks
      WHERE "referenceType" = ${referenceType} AND "referenceValue" = ${referenceValue}
      LIMIT 1
    `
    return NextResponse.json({ success: true, lock: result[0] })
  } catch (error: any) {
    console.error('POST /api/warehouse/reference-locks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
