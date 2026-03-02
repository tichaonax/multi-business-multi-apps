import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const VALID_ACTIONS = ['login', 'logout', 'declined', 'scan', 'clock_in', 'clock_out']
const VALID_METHODS = ['card', 'manual']

// POST /api/clock-in/login-log
// PUBLIC — no auth required (called from login screen on card scan)
// Body: { employeeId?, userId?, action, method, photoUrl?, note? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, method, photoUrl, note } = body
    let { employeeId, userId } = body

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
    }

    // Resolve employeeId from userId if not provided directly
    if (!employeeId && userId) {
      const emp = await prisma.employees.findFirst({
        where: { userId },
        select: { id: true },
      })
      if (emp) employeeId = emp.id
    }

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId or userId required' }, { status: 400 })
    }

    const log = await prisma.employeeLoginLog.create({
      data: {
        employeeId,
        userId: userId ?? null,
        action,
        method,
        photoUrl: photoUrl ?? null,
        note: note ?? null,
      },
    })

    return NextResponse.json({ success: true, id: log.id }, { status: 201 })
  } catch (error: any) {
    console.error('Login log POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/clock-in/login-log
// AUTHENTICATED — requires valid session
// Query params: dateFrom, dateTo, employeeId, action
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const employeeId = searchParams.get('employeeId')
    const action = searchParams.get('action')
    const businessId = searchParams.get('businessId')

    const where: any = {}

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00')
        from.setHours(0, 0, 0, 0)
        where.createdAt.gte = from
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T00:00:00')
        to.setHours(23, 59, 59, 999)
        where.createdAt.lte = to
      }
    }

    if (employeeId) where.employeeId = employeeId
    if (action && VALID_ACTIONS.includes(action)) where.action = action
    if (businessId) where.employees = { primaryBusinessId: businessId }

    const logs = await prisma.employeeLoginLog.findMany({
      where,
      include: {
        employees: {
          select: {
            fullName: true,
            profilePhotoUrl: true,
            employeeNumber: true,
            primaryBusinessId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    console.error('Login log GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
