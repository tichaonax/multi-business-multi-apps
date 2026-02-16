import { NextRequest, NextResponse } from 'next/server'
import { isSystemAdmin} from '@/lib/permission-utils'
import { validateTransfer } from '@/lib/employee-transfer-service'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can preview employee transfers' },
        { status: 403 }
      )
    }

    const { id: sourceBusinessId } = await params
    const body = await req.json()
    const { targetBusinessId, employeeIds } = body

    if (!sourceBusinessId) {
      return NextResponse.json({ error: 'Missing source business id' }, { status: 400 })
    }

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'Missing target business id' }, { status: 400 })
    }

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid employee ids' }, { status: 400 })
    }

    const validation = await validateTransfer(sourceBusinessId, targetBusinessId, employeeIds)

    return NextResponse.json({
      success: true,
      validation
    })
  } catch (error) {
    console.error('Error previewing transfer:', error)
    return NextResponse.json(
      { error: 'Failed to preview transfer' },
      { status: 500 }
    )
  }
}
