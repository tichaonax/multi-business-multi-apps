import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { getTransferableEmployees } from '@/lib/employee-transfer-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can view transferable employees' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing business id' }, { status: 400 })
    }

    const employees = await getTransferableEmployees(id)

    return NextResponse.json({
      success: true,
      count: employees.length,
      employees
    })
  } catch (error) {
    console.error('Error fetching transferable employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transferable employees' },
      { status: 500 }
    )
  }
}
