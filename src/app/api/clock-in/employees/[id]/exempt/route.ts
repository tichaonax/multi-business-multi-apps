import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// PUT /api/clock-in/employees/[id]/exempt
// Body: { isClockInExempt: boolean, clockInExemptReason?: string }
// Toggles clock-in exemption status for an employee
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isClockInExempt, clockInExemptReason } = await req.json()

    if (typeof isClockInExempt !== 'boolean') {
      return NextResponse.json({ error: 'isClockInExempt must be a boolean' }, { status: 400 })
    }

    if (isClockInExempt && !clockInExemptReason?.trim()) {
      return NextResponse.json({ error: 'A reason is required when exempting an employee' }, { status: 400 })
    }

    const employee = await prisma.employees.update({
      where: { id },
      data: {
        isClockInExempt,
        clockInExemptReason: isClockInExempt ? clockInExemptReason : null,
        clockInExemptApprovedBy: isClockInExempt ? user.id : null,
      },
      select: {
        id: true,
        fullName: true,
        isClockInExempt: true,
        clockInExemptReason: true,
        clockInExemptApprovedBy: true,
      },
    })

    return NextResponse.json({ success: true, employee })
  } catch (error) {
    console.error('Exempt update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
