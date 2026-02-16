import { NextRequest, NextResponse } from 'next/server'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getTransferableEmployees } from '@/lib/employee-transfer-service'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
